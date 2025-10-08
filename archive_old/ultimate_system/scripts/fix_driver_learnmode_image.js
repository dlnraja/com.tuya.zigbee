#!/usr/bin/env node
/*
 * fix_driver_learnmode_image.js
 * --------------------------------------------------------------
 * For each driver manifest:
 * - images.small -> './assets/small.png'
 * - images.large -> './assets/large.png'
 * - zigbee.learnmode.image (if present) -> './assets/large.png'
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

function readJsonSafe(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (_) { return null; }
}
function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function fixManifest(file) {
  const manifest = readJsonSafe(file);
  if (!manifest) return false;
  let changed = false;
  manifest.images = manifest.images || {};
  if (manifest.images.small !== './assets/small.png') { manifest.images.small = './assets/small.png'; changed = true; }
  if (manifest.images.large !== './assets/large.png') { manifest.images.large = './assets/large.png'; changed = true; }
  if (manifest.zigbee && manifest.zigbee.learnmode && typeof manifest.zigbee.learnmode.image === 'string') {
    if (manifest.zigbee.learnmode.image !== './assets/large.png') { manifest.zigbee.learnmode.image = './assets/large.png'; changed = true; }
  }
  if (changed) writeJson(file, manifest);
  return changed;
}

function main() {
  const entries = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);
  let changedCount = 0;
  entries.forEach((dir) => {
    const file = path.join(DRIVERS_DIR, dir, 'driver.compose.json');
    if (fs.existsSync(file) && fixManifest(file)) changedCount++;
  });
  console.log(`✅ Fixed ${changedCount} manifests (images + learnmode.image)`);
}

if (require.main === module) {
  try { main(); } catch (e) { console.error('Failed:', e); process.exit(1); }
}
