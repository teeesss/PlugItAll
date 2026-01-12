import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const subsPath = path.join(projectRoot, 'src', 'data', 'subs.json');

const subsDB = JSON.parse(fs.readFileSync(subsPath, 'utf-8'));

const testCases = ['TARGET MARY ESTHER FL', 'MCDONALDS F31602', 'FABLETICS', 'SiriusXM'];

const matchSubscription = (description: string) => {
  const normalized = description.toUpperCase();
  console.log(`\nAnalyzing: "${normalized}"`);

  for (const sub of subsDB) {
    // Check 1: Name exact include
    if (normalized.includes(sub.name.toUpperCase())) {
      console.log(`MATCHED BY NAME: ${sub.name}`);
      return true;
    }

    // Check 2: Regex Keywords
    if (sub.regex_keywords && sub.regex_keywords.length > 0) {
      for (const k of sub.regex_keywords) {
        if (normalized.includes(k.toUpperCase())) {
          console.log(`MATCHED BY KEYWORD: ${k} (Sub: ${sub.name})`);
          return true;
        }
      }
    }
  }
  console.log('NO MATCH FOUND.');
  return false;
};

testCases.forEach(matchSubscription);
