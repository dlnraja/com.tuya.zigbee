import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const repoRoot = process.cwd();
const outputPath = path.join(repoRoot, 'analysis', 'dupes.csv');

async function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

async function findDuplicates() {
  const seen = new Map();
  const duplicates = [];

  async function traverse(dir) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await traverse(fullPath);
      } else {
        const hash = await hashFile(fullPath);
        if (seen.has(hash)) {
          duplicates.push([fullPath, seen.get(hash)]);
        } else {
          seen.set(hash, fullPath);
        }
      }
    }
  }

  await traverse(repoRoot);

  // Write duplicates to CSV
  let csvContent = 'File1,File2\n';
  duplicates.forEach(([file1, file2]) => {
    csvContent += `${file1},${file2}\n`;
  });
  fs.writeFileSync(outputPath, csvContent);
}

findDuplicates().then(() => {
  console.log('Duplicate search completed');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
