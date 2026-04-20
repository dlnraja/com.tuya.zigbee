const fs = require('fs');
const path = require('path');

const d = 'c:/Users/HP/Desktop/homey app/tuya_repair/drivers';
const dirs = fs.readdirSync(d);
let badPng = [];

dirs.forEach(dir => {
  const imgs = ['small.png', 'large.png', 'xlarge.png'];
  imgs.forEach(img => {
    const f = path.join(d, dir, 'assets', 'images', img);
    if (!fs.existsSync(f)) return;
    const b = fs.readFileSync(f);
    const h = b.slice(0, 4).toString('hex');
    // Valid PNG starts with 89504e47
    if (h !== '89504e47') {
      badPng.push({ dir, img, header: h, size: b.length });
    }
  });
});

console.log('Bad PNGs (wrong format):', badPng.length);
badPng.forEach(b => console.log(`  ${b.dir}/${b.img}: header=${b.header} (${b.size}b)`));
