'use strict';

const fs = require('fs-extra');
const path = require('path');

const srcDir = path.join(__dirname, '..', '.homeybuild');
const destDir = 'c:\\Users\\HP\\Desktop\\homey-publish-temp';

console.log(`Copying built files from ${srcDir} to ${destDir}...`);

if (!fs.existsSync(srcDir)) {
  console.error(`Error: Source directory ${srcDir} does not exist. Run npm run build first.`);
  process.exit(1);
}

try {
  // Empty or create destination directory
  fs.emptyDirSync(destDir);
  console.log(`Cleared destination directory: ${destDir}`);

  // Copy everything
  fs.copySync(srcDir, destDir);
  console.log('Successfully copied all files.');

  // Validate the resulting app.json size
  const destAppJson = path.join(destDir, 'app.json');
  if (fs.existsSync(destAppJson)) {
    const stats = fs.statSync(destAppJson);
    const sizeMB = stats.size / (1024 * 1024);
    console.log(`Target app.json size: ${sizeMB.toFixed(2)} MB`);
    if (sizeMB > 4) {
      console.error('Warning: app.json is larger than 4MB. The publish might fail on Athom servers.');
    } else {
      console.log('Success: app.json is optimized and under 4MB limit.');
    }
  } else {
    console.error('Error: app.json not found in destination directory!');
    process.exit(1);
  }

} catch (err) {
  console.error('Error during copy:', err.message);
  process.exit(1);
}
