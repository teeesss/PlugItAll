const fs = require('fs');
const path = require('path');

const subsPath = path.join(__dirname, '../src/data/subs.json');
const subs = JSON.parse(fs.readFileSync(subsPath, 'utf8'));

// Simulated inputs that MIGHT fail or have failed in the past
const testCases = [
    "NETFLIX.COM",
    "NETFLIX",
    "TST* NETFLIX",
    "SQ *NETFLIX",
    "AMAZON PRIME",
    "AMZN MKT",
    "Prime Video",
    "Disney+",
    "Disney Plus",
    "DISNEYPLUS",
    "Hulu",
    "Hulu 12345",
    "Spotify USA",
    "Spotify",
    "SPOTIFY.COM"
];

console.log(`Loaded ${subs.length} subscriptions from DB.\n`);

function findMatch(raw) {
    const normalized = raw.toUpperCase();

    return subs.find(sub => {
        if (!sub.regex_keywords) return false;

        return sub.regex_keywords.some(k => {
            const keyword = k.toUpperCase();

            // LOGIC REPLICATION FROM matcher.ts
            if (keyword.length <= 5) {
                const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`\\b${escaped}\\b`, 'i');
                return regex.test(normalized);
            }

            return normalized.includes(keyword);
        });
    });
}

console.log("--- MATCHING AUDIT ---");
testCases.forEach(input => {
    const match = findMatch(input);
    if (match) {
        console.log(`✅ '${input}' -> MATCH: ${match.name} (ID: ${match.id})`);
    } else {
        console.log(`❌ '${input}' -> NO MATCH`);
    }
});

// Also check for empty keywords
const emptyKeywords = subs.filter(s => !s.regex_keywords || s.regex_keywords.length === 0);
console.log(`\n--- DATA INTEGRITY ---`);
console.log(`Entries with NO regex_keywords: ${emptyKeywords.length}`);
if (emptyKeywords.length > 0) {
    console.log("Examples:", emptyKeywords.slice(0, 5).map(s => s.name));
}
