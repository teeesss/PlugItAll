const fs = require('fs');
const path = require('path');

const subsPath = path.join(__dirname, '../src/data/subs.json');
const subs = JSON.parse(fs.readFileSync(subsPath, 'utf8'));

// Enhancement map: service name -> additional keywords
const enhancements = {
    'Netflix': [
        'NETFLIX.COM',
        'NETFLIX INC',
        'NETFLIX STREAMING',
        'PAYPAL *NETFLIX',
        'SQ *NETFLIX'
    ],
    'Spotify': [
        'SPOTIFY USA',
        'SPOTIFY.COM',
        'SPOTIFY AB',
        'SPOTIFY PREMIUM',
        'PAYPAL *SPOTIFY'
    ],
    'Hulu': [
        'HULU.COM',
        'HULU LLC',
        'HULU STREAMING',
        'PAYPAL *HULU'
    ],
    'Wall Street Journal': [
        'WALL STREET JOURNAL',
        'WSJ.COM',
        'WSJ DIGITAL',
        'DOW JONES'
    ],
    'Washington Post': [
        'WASH POST',
        'WAPO',
        'WASHINGTONPOST.COM',
        'THE WASHINGTON POST'
    ],
    'GitHub': [
        'GITHUB.COM',
        'GITHUB INC',
        'PAYPAL *GITHUB'
    ],
    'Medium': [
        'MEDIUM',
        'A MEDIUM CORPORATION',
        'PAYPAL *MEDIUM'
    ],
    'Patreon': [
        'PATREON.COM',
        'PATREON INC',
        'PAYPAL *PATREON'
    ],
    'Apple Services': [
        'APPLE.COM BILL',
        'APPLE SERVICES',
        'APPLE SUBSCRIPTION',
        'APP STORE'
    ]
};

let updatedCount = 0;

Object.entries(enhancements).forEach(([serviceName, newKeywords]) => {
    const service = subs.find(s => s.name.toLowerCase().includes(serviceName.toLowerCase()));

    if (service) {
        const existingKeywords = new Set(service.regex_keywords.map(k => k.toUpperCase()));
        const uniqueNewKeywords = newKeywords.filter(k => !existingKeywords.has(k.toUpperCase()));

        if (uniqueNewKeywords.length > 0) {
            service.regex_keywords.push(...uniqueNewKeywords);
            console.log(`✅ Enhanced ${service.name}: +${uniqueNewKeywords.length} keyword(s)`);
            console.log(`   Added: ${JSON.stringify(uniqueNewKeywords)}`);
            updatedCount++;
        }
    }
});

fs.writeFileSync(subsPath, JSON.stringify(subs, null, 2));

console.log(`\n✅ Updated ${updatedCount} service(s) in subs.json`);
