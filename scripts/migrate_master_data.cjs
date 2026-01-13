/**
 * Migration Script: Integrate subscriptions_master.json into existing data files
 * 
 * This script:
 * 1. Merges new subscriptions from subscriptions_master.json into subs.json
 * 2. Extracts pricing data and adds to subscription_pricing.json
 * 3. Applies fallback URLs from subscriptions_master_sup_url.json
 */

const fs = require('fs');
const path = require('path');

// File paths
const dataDir = path.join(__dirname, '../src/data');
const subsPath = path.join(dataDir, 'subs.json');
const pricingPath = path.join(dataDir, 'subscription_pricing.json');
const masterPath = path.join(dataDir, 'subscriptions_master.json');
const supUrlPath = path.join(dataDir, 'subscriptions_master_sup_url.json');

// Load existing data
const existingSubs = JSON.parse(fs.readFileSync(subsPath, 'utf-8'));
const existingPricing = JSON.parse(fs.readFileSync(pricingPath, 'utf-8'));
const masterData = JSON.parse(fs.readFileSync(masterPath, 'utf-8'));

// Load fallback URL updates (if file exists and has updates structure)
let fallbackUpdates = {};
try {
    const supUrlData = JSON.parse(fs.readFileSync(supUrlPath, 'utf-8'));
    if (supUrlData.updates && Array.isArray(supUrlData.updates)) {
        // New format: { updates: [ { id, fallback_url }, ... ] }
        supUrlData.updates.forEach(u => {
            fallbackUpdates[u.id] = u.fallback_url;
        });
        console.log(`Loaded ${Object.keys(fallbackUpdates).length} fallback URL updates`);
    } else if (supUrlData.services && Array.isArray(supUrlData.services)) {
        // Full master format: extract fallback_urls from services
        supUrlData.services.forEach(s => {
            if (s.cancellation?.fallback_url) {
                fallbackUpdates[s.id] = s.cancellation.fallback_url;
            }
        });
        console.log(`Loaded ${Object.keys(fallbackUpdates).length} fallback URLs from full master format`);
    }
} catch (err) {
    console.log('No fallback URL updates file found or error loading:', err.message);
}

// Create lookup sets for existing data
const existingSubIds = new Set(existingSubs.map(s => s.id));
const existingPricingIds = new Set(existingPricing.map(p => p.id));

// Helper: Extract domain from URL for logo
function getDomainForLogo(website) {
    if (!website) return null;
    try {
        const url = new URL(website);
        return `https://logo.clearbit.com/${url.hostname.replace('www.', '')}`;
    } catch {
        return null;
    }
}

// Helper: Convert master service to subs.json format
function convertToSubsFormat(masterService) {
    const logo = getDomainForLogo(masterService.website);

    return {
        id: masterService.id,
        name: masterService.name,
        regex_keywords: masterService.aliases || [masterService.name.toUpperCase()],
        logo: logo,
        cancel_url: masterService.cancellation?.url || masterService.website,
        fallback_url: masterService.cancellation?.fallback_url || null,
        instructions: masterService.cancellation?.notes || `Visit ${masterService.website} to manage subscription.`
    };
}

// Helper: Convert master pricing to subscription_pricing.json format
function convertToPricingFormat(masterService) {
    if (!masterService.pricing?.tiers || masterService.pricing.tiers.length === 0) {
        return null;
    }

    const plans = masterService.pricing.tiers.map(tier => ({
        amount: tier.price,
        interval: tier.name.toLowerCase().includes('annual') || tier.name.toLowerCase().includes('year') ? 'yearly' : 'monthly',
        label: tier.name
    }));

    return {
        id: masterService.id,
        name: masterService.name,
        merchant_keywords: (masterService.aliases || [masterService.name.toUpperCase()]).slice(0, 5),
        risk_level: 'LOW',
        risk_reason: 'Standard subscription pricing.',
        variance_allowed: true,
        plans: plans
    };
}

// Process master data
let subsAdded = 0;
let subsUpdated = 0;
let pricingAdded = 0;
let pricingUpdated = 0;

if (masterData.services && Array.isArray(masterData.services)) {
    masterData.services.forEach(service => {
        // --- SUBS.JSON ---
        if (!existingSubIds.has(service.id)) {
            // New subscription - add it
            const newSub = convertToSubsFormat(service);
            existingSubs.push(newSub);
            existingSubIds.add(service.id);
            subsAdded++;
        } else {
            // Existing subscription - update fallback_url if we have one
            const existingSub = existingSubs.find(s => s.id === service.id);
            if (existingSub && service.cancellation?.fallback_url && !existingSub.fallback_url) {
                existingSub.fallback_url = service.cancellation.fallback_url;
                subsUpdated++;
            }
        }

        // --- SUBSCRIPTION_PRICING.JSON ---
        if (service.pricing?.tiers && service.pricing.tiers.length > 0) {
            if (!existingPricingIds.has(service.id)) {
                // New pricing entry
                const pricingEntry = convertToPricingFormat(service);
                if (pricingEntry) {
                    existingPricing.push(pricingEntry);
                    existingPricingIds.add(service.id);
                    pricingAdded++;
                }
            } else {
                // Existing pricing - optionally update plans
                // Skip for now to avoid overwriting curated high-risk data
                pricingUpdated++;
            }
        }
    });
}

// Apply fallback URL updates from subscriptions_master_sup_url.json
let fallbacksApplied = 0;
Object.entries(fallbackUpdates).forEach(([id, fallbackUrl]) => {
    const sub = existingSubs.find(s => s.id === id);
    if (sub && fallbackUrl) {
        sub.fallback_url = fallbackUrl;
        fallbacksApplied++;
    }
});

// Write updated files
fs.writeFileSync(subsPath, JSON.stringify(existingSubs, null, 2));
fs.writeFileSync(pricingPath, JSON.stringify(existingPricing, null, 2));

console.log('\n=== Migration Complete ===');
console.log(`subs.json: ${subsAdded} added, ${subsUpdated} updated with fallback URLs`);
console.log(`subscription_pricing.json: ${pricingAdded} added, ${pricingUpdated} existing (skipped)`);
console.log(`Fallback URLs applied from sup_url file: ${fallbacksApplied}`);
console.log(`\nTotal subscriptions in subs.json: ${existingSubs.length}`);
console.log(`Total entries in subscription_pricing.json: ${existingPricing.length}`);
