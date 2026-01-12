import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const subsPath = path.join(projectRoot, 'src', 'data', 'subs.json');

const subs = JSON.parse(fs.readFileSync(subsPath, 'utf-8'));

const testStr = 'TARGET MARY ESTHER FL';

console.log(`Testing string: "${testStr}"`);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
subs.forEach((sub: any) => {
  sub.regex_keywords.forEach((pattern: string) => {
    // Convert wildcard * to .* for regex
    const regexPattern = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
    if (regexPattern.test(testStr)) {
      console.log(`MATCH FOUND!`);
      console.log(`Subscription: ${sub.name} (${sub.id})`);
      console.log(`Pattern: ${pattern}`);
    }
  });
});
