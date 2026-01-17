const fs = require('fs');
const path = require('path');

const subsPath = path.join(__dirname, '../src/data/subs.json');
const subs = JSON.parse(fs.readFileSync(subsPath, 'utf8'));

console.log(`Starting cleanup on ${subs.length} entries...\n`);

const nameMap = new Map();
const cleanedSubs = [];
const mergedIds = [];

// 1. DEDUPLICATION
subs.forEach(sub => {
    const norm = sub.name.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (nameMap.has(norm)) {
        // Merge logic: Keep the one with existing logo or more keywords
        const existing = nameMap.get(norm);

        // If current has logo and existing doesn't, swap
        if (sub.logo && !existing.logo) {
            existing.logo = sub.logo;
        }

        // Merge keywords
        const combinedKeywords = new Set([...(existing.regex_keywords || []), ...(sub.regex_keywords || [])]);
        existing.regex_keywords = Array.from(combinedKeywords);

        console.log(`Merged duplicate '${sub.name}' into '${existing.name}'`);
        mergedIds.push(sub.id);
    } else {
        nameMap.set(norm, sub);
        cleanedSubs.push(sub);
    }
});

// 2. FIX MISSING LOGO PATHS
// We map missing logos to existing ones where it makes sense, or remove the path to allow fallback
const logoFixes = {
    'google_play': '/logos/google_one.png', // Fallback to generic Google
    'target_circle': null, // No file
    'costco': null, // No file
    'sams_club': null, // No file
    'lyft_pink': null, // No file
    'grubhub_plus': null // No file
};

cleanedSubs.forEach(sub => {
    if (logoFixes.hasOwnProperty(sub.id)) {
        const fix = logoFixes[sub.id];
        if (fix) {
            console.log(`Refining logo for ${sub.name}: ${sub.logo} -> ${fix}`);
            sub.logo = fix;
        } else {
            console.log(`Removing broken logo path for ${sub.name} (will use initial fallback)`);
            delete sub.logo;
        }
    }

    // Also specific fix for "Visible Mobile" to simple "Visible" if preferred, 
    // but here we just ensure the logo path is correct from previous audit
    if (sub.id === 'visible_mobile') {
        // Ensure it uses the file we know exists
        sub.logo = '/logos/visible_mobile.png';
    }
});

// Write back
fs.writeFileSync(subsPath, JSON.stringify(cleanedSubs, null, 2));

console.log(`\nCleanup complete.`);
console.log(`- Removed ${mergedIds.length} duplicates`);
console.log(`- Final count: ${cleanedSubs.length}`);
