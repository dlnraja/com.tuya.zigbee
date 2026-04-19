const fs = require('fs');
const path = require('path');

/**
 * Script used to reduce the size of the Homey App for production/run deployment.
 * Removes unnecessary App Store assets (small.png, large.png, xlarge.png) 
 * from driver directories to prevent installation timeouts.
 */

const driversPath = path.join(__dirname, '..', '..', 'drivers');

if (!fs.existsSync(driversPath)) {
  console.error('drivers directory not found');
  process.exit(1);
}

const driverFolders = fs.readdirSync(driversPath, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

let totalDeleted = 0;
let totalSizeSaved = 0;

for (const folder of driverFolders) {
  const imagesPath = path.join(driversPath, folder, 'assets', 'images');

  if (!fs.existsSync(imagesPath)) continue;

  const composePath = path.join(driversPath, folder, 'driver.compose.json');
  let referencedImages = [];
  if (fs.existsSync(composePath)) {
    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      if (compose.images) {
        referencedImages = Object.values(compose.images).map(v => path.basename(v));
      }
    } catch (e) {}
  }

  const files = fs.readdirSync(imagesPath, { withFileTypes: true })
    .filter(f => f.isFile());

  for (const file of files) {
    // Only delete if it's an app store naming convention AND NOT referenced in compose.json
    if (file.name.endsWith('.png') && (file.name.includes('small') || file.name.includes('large') || file.name.includes('xlarge'))) {
      if (referencedImages.includes(file.name)) {
        // console.log(`Skipping referenced image: drivers/${folder}/assets/images/${file.name}`);
        continue;
      }

      const filePath = path.join(imagesPath, file.name);
      try {
        const stats = fs.statSync(filePath);
        totalSizeSaved += stats.size;
        fs.unlinkSync(filePath);
        console.log(`Deleted orphaned: drivers/${folder}/assets/images/${file.name} (${(stats.size / 1024).toFixed(1)} KB)`);
        totalDeleted++;
      } catch (err) {
        console.error(`Failed to delete ${filePath}: ${err.message}`);
      }
    }
  }
}


console.log(`\nCleanup complete.`);
console.log(`Total files deleted: ${totalDeleted}`);
console.log(`Total size saved: ${(totalSizeSaved / (1024 * 1024)).toFixed(2)} MB`);
