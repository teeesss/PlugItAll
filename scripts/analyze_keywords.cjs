const fs = require('fs');
const path = require('path');

const subsPath = path.join(__dirname, '../src/data/subs.json');
const subs = JSON.parse(fs.readFileSync(subsPath, 'utf8'));

const popularServices = [
    'New York Times',
    'Wall Street Journal',
    'Washington Post',
    'Netflix',
    'Spotify',
    'Hulu',
    'Adobe',
    'Apple',
    'ChatGPT',
    'GitHub',
    'LinkedIn',
    'Medium',
    'Patreon'
];

console.log('=== Merchant Alias Coverage Analysis ===\n');

popularServices.forEach(serviceName => {
    const match = subs.find(s => s.name.toLowerCase().includes(serviceName.toLowerCase()));

    if (match) {
        console.log(`✅ ${match.name}: ${match.regex_keywords.length} keyword(s)`);
        console.log(`   Keywords: ${JSON.stringify(match.regex_keywords.slice(0, 5))}`);
        if (match.regex_keywords.length < 3) {
            console.log(`   ⚠️  Recommendation: Add more variations`);
        }
    } else {
        console.log(`❌ ${serviceName}: NOT IN DATABASE`);
    }
    console.log('');
});
