import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const subsPath = path.join(projectRoot, 'src', 'data', 'subs.json');
const outPath = path.join(projectRoot, 'download_logos.ps1');

const subs = JSON.parse(fs.readFileSync(subsPath, 'utf-8'));

let psScript = '$ErrorActionPreference = "SilentlyContinue"\n';
psScript += 'mkdir public/logos -Force\n';

for (const sub of subs) {
  if (sub.logo && sub.logo.startsWith('http') && !sub.logo.includes('localhost')) {
    const domain = sub.logo.split('/').pop();
    const googleUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    const safeName = sub.name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.png';
    const dest = `public/logos/${safeName}`;

    // curl in PS is alias for Invoke-WebRequest
    psScript += `Write-Host "Downloading ${sub.name}..."\n`;
    psScript += `curl -o "${dest}" "${googleUrl}"\n`;
  }
}

fs.writeFileSync(outPath, psScript);
console.log(`Generated ${outPath}`);
