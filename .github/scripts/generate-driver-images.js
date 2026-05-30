'use strict';
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// ─────────────────────────────────────────────────────────────────────────────
// generate-driver-images.js
//
// Generates PNG assets from each driver's icon.svg.
//
// ARCHIVE BUDGET STRATEGY (fix 2026-05-30):
//   In CI / Athom publish context, only small.png (75×75) is generated.
//   large.png + xlarge.png are EXCLUDED from the Athom archive via .homeyignore
//   to keep the archive under the ~15MB Athom processing limit.
//
//   large.png (13MB) + xlarge.png (10MB) = 23MB → archive ~22MB → processing_failed
//   Without large+xlarge → archive ~12MB → OK ✅
//
// Usage:
//   node generate-driver-images.js           → small only (CI default)
//   node generate-driver-images.js --all     → small + large + xlarge (local dev)
//   node generate-driver-images.js --small-only  → explicit small only
// ─────────────────────────────────────────────────────────────────────────────

const DRIVERS = path.join(__dirname, '..', '..', 'drivers');
const ALL_SIZES = { small: 75, large: 500, xlarge: 1000 };
const SMALL_ONLY = { small: 75 };

const args = process.argv.slice(2);
const generateAll = args.includes('--all');
const SIZES = generateAll ? ALL_SIZES : SMALL_ONLY;

console.log(`[generate-driver-images] Mode: ${generateAll ? 'ALL sizes (small+large+xlarge)' : 'SMALL ONLY (CI mode — large/xlarge excluded from archive)'}`);
if (!generateAll) {
  console.log('[generate-driver-images] TIP: use --all to also generate large.png + xlarge.png for local preview');
}

async function renderIcon(svgPath, outPath, size) {
  const svgBuf = fs.readFileSync(svgPath);
  const pad = Math.round(size * 0.15);
  const iconSz = size - pad * 2;
  const icon = await sharp(svgBuf)
    .resize(iconSz, iconSz, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite([{ input: icon, left: pad, top: pad }]).png().toFile(outPath);
}

async function run() {
  const dirs = fs.readdirSync(DRIVERS).filter(d =>
    fs.statSync(path.join(DRIVERS, d)).isDirectory()
  );
  let ok = 0, fail = 0, skip = 0;
  for (const d of dirs) {
    const svg = path.join(DRIVERS, d, 'assets', 'icon.svg');
    if (!fs.existsSync(svg)) { skip++; continue; }
    const imgDir = path.join(DRIVERS, d, 'assets', 'images');
    fs.mkdirSync(imgDir, { recursive: true });
    try {
      for (const [name, sz] of Object.entries(SIZES)) {
        await renderIcon(svg, path.join(imgDir, name + '.png'), sz);
      }
      ok++;
      if (ok % 50 === 0) console.log(`Progress: ${ok}/${dirs.length}`);
    } catch (e) { fail++; console.log('FAIL:', d, e.message); }
  }
  const sizeNames = Object.keys(SIZES).join(', ');
  console.log(`Done: ${ok} ok, ${fail} fail, ${skip} skipped (no icon.svg) — generated: ${sizeNames}`);
  if (!generateAll) {
    console.log('[generate-driver-images] large.png + xlarge.png NOT generated (use --all if needed locally)');
  }
}

run().catch(e => { console.error(e); process.exit(1); });


