const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

async function fixImages() {
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => 
    fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()
  );

  let fixed = 0;
  let skipped = 0;
  let errors = 0;

  for (const driver of drivers) {
    const assetsDir = path.join(DRIVERS_DIR, driver, 'assets', 'images');
    if (!fs.existsSync(assetsDir)) continue;

    // Process large.png (500x500)
    const largePng = path.join(assetsDir, 'large.png');
    if (fs.existsSync(largePng)) {
      try {
        const metadata = await sharp(largePng).metadata();
        if (metadata.width !== 500 || metadata.height !== 500) {
          console.log(` [LARGE] Resizing ${driver}/assets/images/large.png from ${metadata.width}x${metadata.height} to 500x500`);
          const buffer = await sharp(largePng)
            .resize(500, 500, {
              fit: 'contain',
              background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .toBuffer();
          fs.writeFileSync(largePng, buffer);
          fixed++;
        } else {
          skipped++;
        }
      } catch (err) {
        console.error(` Error processing ${largePng}:`, err.message);
        errors++;
      }
    }

    // Process small.png (75x75) - Homey App Store strict requirement
    const smallPng = path.join(assetsDir, 'small.png');
    if (fs.existsSync(smallPng)) {
      try {
        const metadata = await sharp(smallPng).metadata();
        if (metadata.width !== 75 || metadata.height !== 75) {
          console.log(` [SMALL] Resizing ${driver}/assets/images/small.png from ${metadata.width}x${metadata.height} to 75x75`);
          const buffer = await sharp(smallPng)
            .resize(75, 75, {
              fit: 'contain',
              background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .toBuffer();
          fs.writeFileSync(smallPng, buffer);
          fixed++;
        } else {
          skipped++;
        }
      } catch (err) {
        console.error(` Error processing ${smallPng}:`, err.message);
        errors++;
      }
    }
  }

  console.log(`\n Summary:`);
  console.log(`Fixed:   ${fixed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors:  ${errors}`);
}

fixImages().catch(console.error);
