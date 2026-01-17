
const fs = require('fs');
const path = require('path');

const subsPath = path.join(__dirname, '../src/data/subs.json');
const logosDir = path.join(__dirname, '../public/logos');

const subs = JSON.parse(fs.readFileSync(subsPath, 'utf8'));
const files = fs.readdirSync(logosDir);

console.log(`Processing ${subs.length} subscriptions...`);

let updatedCount = 0;

// Helper to normalize strings for comparison
const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

// Manual overrides for hard-to-match cases
const overrides = {
    'walmart_plus': 'walmart_.png',
    'walmart+': 'walmart_.png',
    'paramount+': 'paramount_.png',
    'apple_tv+': 'apple_tv_.png',
    'max_(hbo)': 'max__hbo_.png',
    'hbo_max': 'max__hbo_.png',
    'instacart+': 'instacart_.png',
    'the_new_york_times': 'ny_times.png',
    'new_york_times': 'ny_times.png',
    'the_wall_street_journal': 'wall_street_journal.png',
    'wall_street_journal': 'wall_street_journal.png',
    'amazon_prime_video': 'amazon_prime.png',
    'kindle_unlimited': 'amazon_prime.png', // Fallback
    'audible': 'audible.png',
    'siriusxm': 'siriusxm.png',
    'spotify': 'spotify.png',
    'disney+': 'disney_.png',
    'discovery+': 'discovery_.png',
    'apple_music': 'apple_services.png',
    'apple_one': 'apple_services.png',
    'apple_arcade': 'apple_services.png',
    'google_one': 'google_one.png',
    'google_play': 'google_play.png',
    'google_workspace': 'google_one.png', // Fallback
    'youtube_music': 'youtube_premium.png', // Fallback
    'adobe_creative_cloud': 'adobe_creative_cloud.png',
    'adobe_acrobat_pro': 'adobe_creative_cloud.png',
    'github_copilot': 'github.png',
    'chatgpt_plus': 'chatgpt_plus.png',
    't-mobile': 't_mobile.png',
    'mint_mobile': 't_mobile.png', // Fallback/Close enough? Maybe not.
    'orangetheory_fitness': 'orangetheory.png',
    'ww_(weight_watchers)': 'weightwatchers.png',
    'match.com': 'match_com.png',
    'blue_apron': 'blue_apron.png',
    'jira': 'atlassian___jira.png',
    'confluence': 'atlassian___jira.png',
    'monday.com': 'monday_com.png',
    'quickbooks_online': 'quickbooks.png',
    'shopify': 'shopify.png'
};

subs.forEach(sub => {
    let matchedFile = null;

    // 1. Check ID in overrides
    if (overrides[sub.id]) {
        matchedFile = overrides[sub.id];
    }
    // 2. Check Name in overrides
    else if (overrides[normalize(sub.name)]) {
        matchedFile = overrides[normalize(sub.name)];
    }
    else {
        // 3. Try to match 'logo' filename if it looks like a local path but is broken
        if (sub.logo && !sub.logo.startsWith('http')) {
            const currentBase = path.basename(sub.logo);
            if (files.includes(currentBase)) {
                // It's valid, but ensure full path format
                matchedFile = currentBase;
            } else {
                // Broken local path, try fuzzy
                // e.g. /logos/walmart_plus.png -> try to find 'walmart' in files
                const simple = normalize(currentBase.split('.')[0]);
                const fuzzy = files.find(f => normalize(f).includes(simple));
                if (fuzzy) matchedFile = fuzzy;
            }
        }

        // 4. If still null, try matching Name against Files
        if (!matchedFile) {
            const simpleName = normalize(sub.name);
            // Try exact match first
            let match = files.find(f => normalize(f).split('.')[0] === simpleName);

            // Try contains match (safer than before)
            if (!match) {
                match = files.find(f => {
                    const fName = normalize(f).split('.')[0];
                    // Check if filename contains sub name or vice versa, but be careful of short words
                    if (simpleName.length > 3 && fName.includes(simpleName)) return true;
                    if (fName.length > 5 && simpleName.includes(fName)) return true;
                    return false;
                });
            }
            if (match) matchedFile = match;
        }
    }

    // Update if found and different
    if (matchedFile) {
        const newPath = `/logos/${matchedFile}`;
        if (sub.logo !== newPath) {
            console.log(`✅ Updating ${sub.name}: ${sub.logo} -> ${newPath}`);
            sub.logo = newPath;
            updatedCount++;
        }
    }
});

if (updatedCount > 0) {
    fs.writeFileSync(subsPath, JSON.stringify(subs, null, 2));
    console.log(`\nFixed ${updatedCount} logo paths.`);
} else {
    console.log('\nNo changes needed.');
}
