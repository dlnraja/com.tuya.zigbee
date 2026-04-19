/**
 * Fix PNG images: Ensure correct dimensions per Homey spec.
 * small.png = 75x75, large.png = 500x500, xlarge.png = 1000x1000
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DRIVERS_DIR = path.join(__dirname, '..', '..', 'drivers');

const SIZES = {
  'small.png': 75,
  'large.png': 500,
  'xlarge.png': 1000,
};

async function main() {
  const dirs = fs.readdirSync(DRIVERS_DIR);
  let fixed = 0;
  let total = 0;
  let errors = 0;

  for (const dir of dirs) {
    for (const [img, size] of Object.entries(SIZES)) {
      const f = path.join(DRIVERS_DIR, dir, 'assets', 'images', img);
      if (!fs.existsSync(f)) continue;
      total++;

      try {
        const buf = fs.readFileSync(f);
        const meta = await sharp(buf).metadata();

        // Check if already correct size
        if (meta.width === size && meta.height === size && meta.format === 'png') {
          continue;
        }

        // Resize and convert to PNG
        const pngBuf = await sharp(buf)
          .resize(size, size, { fit: 'cover', position: 'centre' })
          .png()
          .toBuffer();

        const tmpFile = f + '.tmp';
        fs.writeFileSync(tmpFile, pngBuf);
        try { fs.unlinkSync(f); } catch (e) {}
        fs.renameSync(tmpFile, f);
        fixed++;
      } catch (err) {
        errors++;
        if (errors <= 10) console.error(`  Error: ${dir}/${img}: ${err.message}`);
      }
    }
  }

  console.log(`Resized ${fixed}/${total} images to correct Homey dimensions`);
  if (errors > 0) console.log(`Errors: ${errors}`);
}

main().catch(err => console.error(err));
