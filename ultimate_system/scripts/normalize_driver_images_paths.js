#!/usr/bin/env node
/*
 * normalize_driver_images_paths.js
 * --------------------------------------------------------------
 * For each driver:
 * - Set images.small to './assets/small.png'
 * - Set images.large to './assets/large.png'
 * - Does NOT (re)generate images; paths only. Use fix_all_driver_assets.js for image generation.
 * - Use absolute per-driver paths: /drivers/<driverId>/assets/small.png and /drivers/<driverId>/assets/large.png
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

function readJsonSafe(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (_) { return null; }
}
function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function fixDriver(driverName) {
  const driverDir = path.join(DRIVERS_DIR, driverName);
  const composePath = path.join(driverDir, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return null;

  const manifest = readJsonSafe(composePath);
  if (!manifest) return null;

  manifest.images = manifest.images || {};
  const smallRef = `/drivers/${driverName}/assets/small.png`;
  const largeRef = `/drivers/${driverName}/assets/large.png`;
  if (manifest.images.small !== smallRef) manifest.images.small = smallRef;
  if (manifest.images.large !== largeRef) manifest.images.large = largeRef;

  writeJson(composePath, manifest);
  return { driver: driverName };
}

function main() {
  console.log('🛠️  Normalisation des chemins d\'images drivers');
  const entries = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);
  let count = 0;
  entries.forEach((name, i) => {
    const res = fixDriver(name);
    if (res) count++;
    if ((i + 1) % 20 === 0) console.log(`   • Progression: ${i + 1}/${entries.length}`);
  });
  console.log(`✅ ${count} manifests normalisés`);
}

if (require.main === module) { main(); }

module.exports = { main };
