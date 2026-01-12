import { normalizeDescription } from '../src/utils/normalizer';
import { matchSubscription } from '../src/utils/matcher';
import { detectSubscriptions } from '../src/utils/analyzer';
import type { Transaction } from '../src/mocks/statements';

// Debug YouTube TV
const desc = 'GOOGLE *YOUTUBE TV';
const normalized = normalizeDescription(desc);
const isKnown = matchSubscription(normalized);

console.log('--- YouTube TV Debug ---');
console.log('Raw Description:', desc);
console.log('Normalized:', normalized);
console.log('isKnown:', isKnown);

// Now test the full flow
const txs: Transaction[] = [
  { date: '2023-01-10', amount: 72.99, description: 'GOOGLE *YOUTUBE TV' },
  { date: '2023-02-10', amount: 72.99, description: 'GOOGLE *YOUTUBE TV' },
  { date: '2023-03-10', amount: 72.99, description: 'GOOGLE *YOUTUBE TV' },
];

const subs = detectSubscriptions(txs);
console.log('\n--- Analyzer Output ---');
console.log('Detected Subs:', subs.length);
subs.forEach((s, i) => {
  console.log(`  ${i + 1}. ${s.name} @ $${s.averageAmount} (${s.confidence})`);
});
