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

    const largePng = path.join(assetsDir, 'large.png');
    if (fs.existsSync(largePng)) {
      try {
        const metadata = await sharp(largePng).metadata();
        if (metadata.width !== 500 || metadata.height !== 500) {
          console.log(`📏 Resizing ${driver}/assets/images/large.png from ${metadata.width}x${metadata.height} to 500x500`);
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
        console.error(`❌ Error processing ${largePng}:`, err.message);
        errors++;
      }
    }
  }

  console.log(`\n✅ Summary:`);
  console.log(`Fixed:   ${fixed}`);
  console.log(`Skipped: ${skipped} (already 500x500)`);
  console.log(`Errors:  ${errors}`);
}

fixImages().catch(console.error);
