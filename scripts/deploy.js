import ftp from 'basic-ftp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * DEPLOYMENT SAFETY RULES:
 * 1. NEVER delete the remote assets folder before uploading. Orphaned files are better than 404s.
 * 2. ALWAYS upload index.html to ensure it points to the latest bundles.
 * 3. USE a fresh index of remote files to decide what to skip.
 * 4. SKIP static images only if size matches exactly.
 */

// Helper for ESM directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read credentials
const credsPath = path.join(__dirname, '../deploy_creds.json');
if (!fs.existsSync(credsPath)) {
  console.error('❌ No credentials file found.');
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

    // Get list of all remote files recursively to avoid redundant uploads
    console.log('🔍 Indexing remote files...');
    const remoteFiles = new Map();

    async function listRecursive(dir, prefix = '') {
      const list = await client.list(dir);
      for (const item of list) {
        const relPath = prefix ? `${prefix}/${item.name}` : item.name;
        if (item.type === ftp.FileType.Directory) {
          // Just recursively list
          await listRecursive(`${dir}/${item.name}`, relPath);
        } else {
          remoteFiles.set(relPath, item);
        }
      }
    }

    await listRecursive(remotePath);
    console.log(`🔍 Found ${remoteFiles.size} files on server.`);

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
          const isImage = /\.(png|jpg|jpeg|svg|webp|ico)$/i.test(item);

          let shouldUpload = true;

          if (remoteFile) {
            // For static images, skip if size matches
            if (isImage && remoteFile.size === stats.size) {
              shouldUpload = false;
            }
            // For code/assets, skip if name and size match.
            // Vite already handles versioning via hashes in filenames.
            else if (relativePath !== 'index.html' && remoteFile.size === stats.size) {
              shouldUpload = false;
            }
          }

          if (shouldUpload) {
            console.log(`📤 Uploading: ${relativePath}`);
            await client.uploadFrom(localFile, `${remoteDir}/${item}`);
          } else {
            // Log skipping for visibility
            // console.log(`⏭️ Skipping: ${relativePath}`);
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
