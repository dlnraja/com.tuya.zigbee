#!/usr/bin/env node
/*
 * normalize_driver_images_paths.js
 * --------------------------------------------------------------
 * For each driver:
 * - Set images.small to './assets/small.png'
 * - Set images.large to './assets/large.png'
 * - Generate 75x75 small.png and 500x500 large.png under drivers/*/assets/
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const GEN = path.join(ROOT, 'ultimate_system', 'scripts', 'generate_placeholder_png.js');

function readJsonSafe(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (_) { return null; }
}
function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function fixDriver(driverName, color) {
  const driverDir = path.join(DRIVERS_DIR, driverName);
  const composePath = path.join(driverDir, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return null;

  const manifest = readJsonSafe(composePath);
  if (!manifest) return null;

  manifest.images = manifest.images || {};
  if (manifest.images.small !== './assets/small.png') manifest.images.small = './assets/small.png';
  if (manifest.images.large !== './assets/large.png') manifest.images.large = './assets/large.png';

  const assetsDir = path.join(driverDir, 'assets');
  ensureDir(assetsDir);

  try {
    execSync(`node "${GEN}" --width 75 --height 75 --color "#1E88E5" --output "${path.join(assetsDir, 'small.png')}"`, { cwd: ROOT });
    execSync(`node "${GEN}" --width 500 --height 500 --color "#1E88E5" --output "${path.join(assetsDir, 'large.png')}"`, { cwd: ROOT });
  } catch (e) {
    // continue per driver
  }

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
