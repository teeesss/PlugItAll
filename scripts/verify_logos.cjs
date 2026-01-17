
const fs = require('fs');
const path = require('path');

const subsPath = path.join(__dirname, '../src/data/subs.json');
const logosDir = path.join(__dirname, '../public/logos');

const subs = JSON.parse(fs.readFileSync(subsPath, 'utf8'));
const files = fs.readdirSync(logosDir);

console.log(`Checking ${subs.length} subscriptions against ${files.length} logo files...`);

const missing = [];
const mismatches = [];

subs.forEach(sub => {
    if (sub.logo) {
        const logoName = path.basename(sub.logo);
        // Decode URI component in case of encoded spaces, though usually they are normal
        const decodedName = decodeURIComponent(logoName);

        if (!files.includes(decodedName)) {
            missing.push({
                name: sub.name,
                expected: sub.logo,
                id: sub.id
            });

            // Try fuzzy match
            const baseName = logoName.split('.')[0].replace(/[_-]/g, '').toLowerCase();
            const match = files.find(f => f.replace(/[_-]/g, '').toLowerCase().includes(baseName));
            if (match) {
                mismatches.push({
                    name: sub.name,
                    current: sub.logo,
                    suggested: `/logos/${match}`
                });
            }
        }
    }
});

console.log(`\nFound ${missing.length} missing logos.`);
missing.forEach(m => {
    const suggestion = mismatches.find(mis => mis.name === m.name);
    if (suggestion) {
        console.log(`❌ ${m.name}: ${m.expected} (Suggestion: ${suggestion.suggested})`);
    } else {
        console.log(`❌ ${m.name}: ${m.expected} (No file found)`);
    }
});

// Also find unused logos?
const usedLogos = new Set(subs.map(s => path.basename(s.logo || '')));
const unused = files.filter(f => !usedLogos.has(f));
console.log(`\nFound ${unused.length} unused logo files (potential naming mismatches):`);
// unused.forEach(u => console.log(`❓ ${u}`));
// List first 10 unused
unused.slice(0, 10).forEach(u => console.log(`❓ ${u}`));
if (unused.length > 10) console.log(`... and ${unused.length - 10} more.`);
