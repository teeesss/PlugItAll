import ftp from 'basic-ftp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper for ESM directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read credentials
const credsPath = path.join(__dirname, '../deploy_creds.json');
if (!fs.existsSync(credsPath)) {
  console.error('❌ No .credentials file found.');
  process.exit(1);
}
const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));

async function deploy() {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    console.log('🔌 Connecting to FTP...');
    await client.access({
      host: creds.host,
      user: creds.user,
      password: creds.password,
      secure: creds.secure,
    });

    const remotePath = creds.remotePath || '/public_html/plugit';
    const localPath = path.join(__dirname, '../dist');

    if (!fs.existsSync(localPath)) {
      console.error("❌ 'dist' folder not found. Run 'npm run build' first.");
      process.exit(1);
    }

    console.log(`📂 Ensuring remote directory exists: ${remotePath}`);
    await client.ensureDir(remotePath);

    // Get list of existing logos to skip them
    const remoteLogosPath = path.posix.join(remotePath, 'logos');
    const existingLogos = new Set();
    try {
      const list = await client.list(remoteLogosPath);
      list.forEach(item => existingLogos.add(item.name));
      console.log(`🔍 Found ${existingLogos.size} existing logos on server.`);
    } catch (e) {
      console.log('ℹ️ Logos directory empty or not found.');
    }

    console.log(`🚀 Starting Incremental Sync to ${remotePath}...`);
    await client.uploadFromDir(localPath, remotePath, (file) => {
      const relativePath = path.relative(localPath, file).replace(/\\/g, '/');

      // ALWAYS upload core files (index.html) and hashed assets
      if (relativePath === 'index.html' || relativePath.startsWith('assets/')) {
        return true;
      }

      // SKIP all logos - they are static and never change
      if (relativePath.startsWith('logos/')) {
        return false;
      }

      // Upload everything else (vite.svg, etc.)
      return true;
    });

    console.log('✅ Deployment complete!');
  } catch (err) {
    console.error('❌ Deployment failed:', err);
  }
  client.close();
}

deploy();
