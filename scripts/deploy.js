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

    console.log(`🚀 Starting Intelligent Sync to ${remotePath}...`);

    async function syncDir(localDir, remoteDir) {
      const items = fs.readdirSync(localDir);
      for (const item of items) {
        const localFile = path.join(localDir, item);
        const relativePath = path.relative(localPath, localFile).replace(/\\/g, '/');
        const stats = fs.statSync(localFile);

        if (stats.isDirectory()) {
          await client.ensureDir(`${remoteDir}/${item}`);
          await syncDir(localFile, `${remoteDir}/${item}`);
          await client.cd(remoteDir); // Return to parent
        } else {
          const remoteFile = remoteFiles.get(relativePath);
          const isImage = /\.(png|jpg|jpeg|svg|webp)$/i.test(item);
          const isLogo = relativePath.startsWith('logos/');
          const isAsset = relativePath.startsWith('assets/');

          let shouldUpload = true;
          if (remoteFile) {
            if (isLogo) {
              shouldUpload = false; // NEVER re-upload logos
            } else if (isAsset) {
              shouldUpload = true; // FORCE upload assets (we cleaned the dir anyway)
            } else if (isImage && remoteFile.size === stats.size) {
              shouldUpload = false; // Skip unchanged images
            } else if (relativePath === 'index.html') {
              shouldUpload = true; // ALWAYS upload index.html
            }
          }

          if (shouldUpload) {
            console.log(`📤 Uploading: ${relativePath}`);
            await client.uploadFrom(localFile, `${remoteDir}/${item}`);
          } else {
            console.log(`⏭️ Skipping: ${relativePath}`);
          }
        }
      }
    }

    await syncDir(localPath, remotePath);
    console.log('✅ Deployment complete!');
  } catch (err) {
    console.error('❌ Deployment failed:', err);
  }
  client.close();
}

deploy();
