'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');
const tar = require('tar');

const url = 'https://apps.homeycdn.net/app/com.dlnraja.tuya.zigbee/2159/1baccab5-6eaf-424f-9dae-8a0ba944d21b/5836c4ed-3ce6-4d79-afb2-16c5e3c43449.tar.gz';
const destDir = path.join(__dirname, '..', 'tmp', 'good_build');
const destFile = path.join(__dirname, '..', 'tmp', 'good_build.tar.gz');

fs.mkdirSync(destDir, { recursive: true });

console.log('Downloading good build archive...');
const file = fs.createWriteStream(destFile);
https.get(url, (response) => {
  if (response.statusCode !== 200) {
    console.error(`HTTP status: ${response.statusCode}`);
    process.exit(1);
  }
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Download complete. Unpacking...');
    
    fs.createReadStream(destFile)
      .pipe(zlib.createGunzip())
      .pipe(tar.extract({ cwd: destDir }))
      .on('finish', () => {
        console.log('Unpacked successfully. Inspecting structure...');
        
        // Find all files and their sizes
        const listFiles = (dir, list = []) => {
          const files = fs.readdirSync(dir);
          for (const f of files) {
            const fp = path.join(dir, f);
            const stat = fs.statSync(fp);
            if (stat.isDirectory()) {
              listFiles(fp, list);
            } else {
              list.push({ path: path.relative(destDir, fp), size: stat.size });
            }
          }
          return list;
        };
        
        const files = listFiles(destDir);
        console.log(`Total files: ${files.length}`);
        
        // Sort by size descending
        files.sort((a, b) => b.size - a.size);
        console.log('\nTop 20 largest files in good build:');
        files.slice(0, 20).forEach(f => {
          console.log(`  ${f.path}: ${(f.size / 1024).toFixed(1)} KB`);
        });
        
        // Check app.json specifically
        const appJsonPath = path.join(destDir, 'app.json');
        if (fs.existsSync(appJsonPath)) {
          const content = fs.readFileSync(appJsonPath, 'utf8');
          console.log(`\napp.json details in good build:`);
          console.log(`  Size on disk: ${(fs.statSync(appJsonPath).size / 1024).toFixed(1)} KB`);
          console.log(`  Parsed key count: ${Object.keys(JSON.parse(content)).length}`);
          console.log(`  Is formatted (multi-line): ${content.includes('\n')}`);
        }
      });
  });
}).on('error', (err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
