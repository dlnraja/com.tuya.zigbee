'use strict';
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const DRIVERS = path.join(__dirname, '..', '..', 'drivers');
const SIZES = { small: 75, large: 500, xlarge: 1000 };

async function renderIcon(svgPath, outPath, size) {
  const svgBuf = fs.readFileSync(svgPath);
  const pad = Math.round(size * 0.15);
  const iconSz = size - pad * 2;
  const icon = await sharp(svgBuf)
    .resize(iconSz, iconSz, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png().toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
  }).composite([{ input: icon, left: pad, top: pad }]).png().toFile(outPath);
}

async function run() {
  const dirs = fs.readdirSync(DRIVERS).filter(d =>
    fs.statSync(path.join(DRIVERS, d)).isDirectory()
  );
  let ok = 0, fail = 0;
  for (const d of dirs) {
    const svg = path.join(DRIVERS, d, 'assets', 'icon.svg');
    if (!fs.existsSync(svg)) { console.log('SKIP:', d); continue; }
    const imgDir = path.join(DRIVERS, d, 'assets', 'images');
    fs.mkdirSync(imgDir, { recursive: true });
    try {
      for (const [name, sz] of Object.entries(SIZES)) {
        await renderIcon(svg, path.join(imgDir, name + '.png'), sz);
      }
      ok++;
      if (ok % 20 === 0) console.log('Progress:', ok + '/' + dirs.length);
    } catch (e) { fail++; console.log('FAIL:', d, e.message); }
  }
  console.log('Done:', ok, 'ok,', fail, 'fail, total', dirs.length);
}

run().catch(e => { console.error(e); process.exit(1); });
