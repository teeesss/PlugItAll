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

    const remotePath = creds.remotePath || '/public_html/PlugItAll';
    const localPath = path.join(__dirname, '../dist');

    if (!fs.existsSync(localPath)) {
      console.error("❌ 'dist' folder not found. Run 'npm run build' first.");
      process.exit(1);
    }

    console.log(`📂 Ensuring remote directory exists: ${remotePath}`);
    await client.ensureDir(remotePath);

    // Get list of all remote files recursively to avoid re-uploading
    console.log('🔍 Listing remote files (this may take a moment)...');
    const remoteFiles = new Map();

    async function listRecursive(dir, prefix = '') {
      const list = await client.list(dir);
      for (const item of list) {
        const relPath = prefix ? `${prefix}/${item.name}` : item.name;
        if (item.type === ftp.FileType.Directory) {
          await listRecursive(`${dir}/${item.name}`, relPath);
        } else {
          remoteFiles.set(relPath, item);
        }
      }
    }

    await listRecursive(remotePath);
    console.log(`🔍 Found ${remoteFiles.size} files on server.`);

    async function cleanRemoteAssets() {
      try {
        console.log('🧹 Cleaning remote assets folder...');
        await client.removeDir(`${remotePath}/assets`);
        await client.ensureDir(`${remotePath}/assets`);
        console.log('✅ Remote assets folder cleaned.');
      } catch (e) {
        console.log('ℹ️ Assets folder not found or already clean.');
        await client.ensureDir(`${remotePath}/assets`);
      }
    }

    await cleanRemoteAssets();

    console.log(`🚀 Uploading dist folder to ${remotePath}...`);
    await client.uploadFromDir(localPath);
    console.log('✅ Deployment complete!');
  } catch (err) {
    console.error('❌ Deployment failed:', err);
  }
  client.close();
}

deploy();
