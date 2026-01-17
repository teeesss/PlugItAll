const fs = require('fs');
const path = require('path');

const subsPath = path.join(__dirname, '../src/data/subs.json');
const subs = JSON.parse(fs.readFileSync(subsPath, 'utf8'));

console.log(`Checking ${subs.length} entries for duplicates...\n`);

const nameMap = new Map();
const duplicates = [];

subs.forEach(sub => {
    const norm = sub.name.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (nameMap.has(norm)) {
        duplicates.push({ original: nameMap.get(norm), duplicate: sub });
    } else {
        nameMap.set(norm, sub);
    }
});

if (duplicates.length > 0) {
    console.log(`⚠️ FOUND ${duplicates.length} POTENTIAL DUPLICATES based on Name:\n`);
    duplicates.forEach(d => {
        console.log(`1. ${d.original.name} (ID: ${d.original.id}) [Logo: ${d.original.logo || 'NONE'}]`);
        console.log(`2. ${d.duplicate.name} (ID: ${d.duplicate.id}) [Logo: ${d.duplicate.logo || 'NONE'}]`);
        console.log('---');
    });
} else {
    console.log("No obvious name-based duplicates found.");
}

// Check for missing logo files
const publicLogosPath = path.join(__dirname, '../public/logos');
let missingLogos = 0;

subs.forEach(sub => {
    if (sub.logo && sub.logo.startsWith('/logos/')) {
        const filename = sub.logo.replace('/logos/', '');
        if (!fs.existsSync(path.join(publicLogosPath, filename))) {
            console.log(`❌ Missing Logo File: ${sub.name} (ID: ${sub.id}) -> ${sub.logo}`);
            missingLogos++;
        }
    }
});

if (missingLogos === 0) console.log("\n✅ All referenced local logos exist.");
