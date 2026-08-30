'use strict';

/**
 * P2315 — Align driver images + compose paths
 *
 * 1) Regenerate small/large/xlarge PNG from each driver's own icon.svg
 *    (same padding/design pipeline → visual coherence)
 * 2) Point compose images to {{driverAssetsPath}}/images/{small,large}.png
 *    (no cross-driver absolute paths)
 * 3) learnmode.image → {{driverAssetsPath}}/icon.svg when present
 *
 * Usage: node tools/ci/align-driver-images.js [--dry-run] [--skip-png]
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..', '..');
const DRIVERS = path.join(ROOT, 'drivers');
const DRY = process.argv.includes('--dry-run');
const SKIP_PNG = process.argv.includes('--skip-png');

const SIZES = [
  { name: 'small.png', size: 75 },
  { name: 'large.png', size: 500 },
  // xlarge omitted on purpose (publish size budget)
];

async function renderFromSvg(svgPath, outPath, size) {
  const svgBuf = fs.readFileSync(svgPath);
  const pad = Math.round(size * 0.12);
  const iconSz = Math.max(1, size - pad * 2);
  const icon = await sharp(svgBuf)
    .resize(iconSz, iconSz, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: icon, left: pad, top: pad }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outPath);
}

function fixComposeImages(driverId, composePath) {
  const raw = fs.readFileSync(composePath, 'utf8');
  let j;
  try {
    j = JSON.parse(raw);
  } catch {
    return { changed: false, reason: 'invalid-json' };
  }

  let changed = false;
  const desired = {
    small: '{{driverAssetsPath}}/images/small.png',
    large: '{{driverAssetsPath}}/images/large.png',
  };

  if (!j.images || typeof j.images !== 'object') {
    j.images = { ...desired };
    changed = true;
  } else {
    // Drop xlarge from compose if present (Homey pair UI uses small+large;
    // file still generated on disk for CI/size gates that expect it).
    for (const key of Object.keys(j.images)) {
      if (key === 'xlarge') {
        delete j.images.xlarge;
        changed = true;
        continue;
      }
      if (desired[key] && j.images[key] !== desired[key]) {
        j.images[key] = desired[key];
        changed = true;
      }
    }
    for (const [k, v] of Object.entries(desired)) {
      if (j.images[k] !== v) {
        j.images[k] = v;
        changed = true;
      }
    }
  }

  if (j.zigbee?.learnmode && typeof j.zigbee.learnmode === 'object') {
    const want = '{{driverAssetsPath}}/icon.svg';
    if (j.zigbee.learnmode.image && j.zigbee.learnmode.image !== want) {
      j.zigbee.learnmode.image = want;
      changed = true;
    }
  }

  if (changed && !DRY) {
    fs.writeFileSync(composePath, `${JSON.stringify(j, null, 2)}\n`);
  }
  return { changed, reason: changed ? 'fixed' : 'ok' };
}

async function main() {
  const dirs = fs.readdirSync(DRIVERS).filter((d) =>
    fs.statSync(path.join(DRIVERS, d)).isDirectory());

  let pngOk = 0;
  let pngFail = 0;
  let composeFixed = 0;
  const failures = [];

  for (const d of dirs) {
    const assets = path.join(DRIVERS, d, 'assets');
    const svg = path.join(assets, 'icon.svg');
    const imgDir = path.join(assets, 'images');
    const compose = path.join(DRIVERS, d, 'driver.compose.json');

    if (!SKIP_PNG) {
      if (!fs.existsSync(svg)) {
        pngFail++;
        failures.push(`${d}: missing icon.svg`);
      } else {
        try {
          if (!DRY) {fs.mkdirSync(imgDir, { recursive: true });}
          for (const { name, size } of SIZES) {
            const out = path.join(imgDir, name);
            if (!DRY) {
              await renderFromSvg(svg, out, size);
            }
          }
          pngOk++;
        } catch (e) {
          pngFail++;
          failures.push(`${d}: ${e.message}`);
        }
      }
    }

    if (fs.existsSync(compose)) {
      const r = fixComposeImages(d, compose);
      if (r.changed) {composeFixed++;}
    }

    if ((pngOk + pngFail) % 50 === 0 && pngOk + pngFail > 0) {
      process.stdout.write(`… ${pngOk + pngFail}/${dirs.length}\n`);
    }
  }

  // Verify dims + path coherence
  function pngSize(buf) {
    if (!buf || buf[0] !== 0x89) {return null;}
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }

  let dimBad = 0;
  let pathBad = 0;
  let cross = 0;
  if (!DRY && !SKIP_PNG) {
    for (const d of dirs) {
      for (const { name, size } of SIZES) {
        const p = path.join(DRIVERS, d, 'assets', 'images', name);
        if (!fs.existsSync(p)) {dimBad++; continue;}
        const s = pngSize(fs.readFileSync(p));
        if (!s || s.w !== size || s.h !== size) {dimBad++;}
      }
      const compose = path.join(DRIVERS, d, 'driver.compose.json');
      if (!fs.existsSync(compose)) {continue;}
      try {
        const j = JSON.parse(fs.readFileSync(compose, 'utf8'));
        for (const [k, v] of Object.entries(j.images || {})) {
          const s = String(v);
          if (!s.includes('{{driverAssetsPath}}')) {pathBad++;}
          const m = s.match(/\/drivers\/([^/]+)\//);
          if (m && m[1] !== d) {cross++;}
        }
      } catch { /* ignore */ }
    }
  }

  console.log(JSON.stringify({
    dry: DRY,
    skipPng: SKIP_PNG,
    drivers: dirs.length,
    pngOk,
    pngFail,
    composeFixed,
    dimBad,
    pathBad,
    cross,
    failures: failures.slice(0, 20),
  }, null, 2));

  if (pngFail > 0 || dimBad > 0 || pathBad > 0 || cross > 0) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
