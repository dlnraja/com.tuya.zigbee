const sharp = require('sharp');
const fs = require('fs');
const path = 'drivers/air_purifier_siren_hybrid/assets/images/large.png';

async function fix() {
  const buffer = await sharp(path)
    .resize(500, 500, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  fs.writeFileSync(path, buffer);
  console.log('Fixed air_purifier_siren_hybrid');
}

fix().catch(err => {
  console.error(err);
  process.exit(1);
});
