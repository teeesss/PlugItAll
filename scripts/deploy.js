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

    const remotePath = creds.remotePath || '/public_html/unsub';
    const localPath = path.join(__dirname, '../dist');

    if (!fs.existsSync(localPath)) {
      console.error("❌ 'dist' folder not found. Run 'npm run build' first.");
      process.exit(1);
    }

    console.log(`📂 Ensuring remote directory exists: ${remotePath}`);
    await client.ensureDir(remotePath);

    console.log('🧹 Clearing remote directory...');
    await client.clearWorkingDir();

    console.log(`🚀 Uploading '${localPath}' to current directory...`);
    await client.uploadFromDir(localPath);

    console.log('✅ Deployment complete!');
  } catch (err) {
    console.error('❌ Deployment failed:', err);
  }
  client.close();
}

deploy();
