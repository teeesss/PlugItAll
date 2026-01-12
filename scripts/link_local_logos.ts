import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const subsPath = path.join(projectRoot, 'src', 'data', 'subs.json');
const logosDir = path.join(projectRoot, 'public', 'logos');

const subs = JSON.parse(fs.readFileSync(subsPath, 'utf-8'));
let updatedCount = 0;

for (const sub of subs) {
  const safeName = sub.name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.png';
  const localPath = path.join(logosDir, safeName);

  if (fs.existsSync(localPath)) {
    const stats = fs.statSync(localPath);
    if (stats.size > 0) {
      sub.logo = `/logos/${safeName}`;
      updatedCount++;
    }
  }
}

if (updatedCount > 0) {
  fs.writeFileSync(subsPath, JSON.stringify(subs, null, 2));
  console.log(`Updated ${updatedCount} subscriptions with local logos.`);
} else {
  console.log('No logos found/updated.');
}
