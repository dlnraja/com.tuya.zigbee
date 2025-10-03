#!/usr/bin/env node
/*
 * absolute_driver_image_paths.js
 * --------------------------------------------------------------
 * For each driver manifest (drivers/<id>/driver.compose.json):
 * - images.small -> `/drivers/<id>/assets/small.png`
 * - images.large -> `/drivers/<id>/assets/large.png`
 * - zigbee.learnmode.image (if present) -> `/drivers/<id>/assets/large.png`
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

function fixManifest(driverId, file) {
  const manifest = readJsonSafe(file);
  if (!manifest) return false;
  let changed = false;
  const base = `/drivers/${driverId}/assets`;
  manifest.images = manifest.images || {};
  if (manifest.images.small !== `${base}/small.png`) { manifest.images.small = `${base}/small.png`; changed = true; }
  if (manifest.images.large !== `${base}/large.png`) { manifest.images.large = `${base}/large.png`; changed = true; }
  if (manifest.zigbee && manifest.zigbee.learnmode && typeof manifest.zigbee.learnmode.image === 'string') {
    if (manifest.zigbee.learnmode.image !== `${base}/large.png`) { manifest.zigbee.learnmode.image = `${base}/large.png`; changed = true; }
  }
  if (changed) writeJson(file, manifest);
  return changed;
}

function main() {
  const entries = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);
  let changedCount = 0;
  entries.forEach((driverId, idx) => {
    const file = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
    if (fs.existsSync(file) && fixManifest(driverId, file)) changedCount++;
    if ((idx + 1) % 25 === 0) console.log(`   • Progression: ${idx + 1}/${entries.length}`);
  });
  console.log(`✅ Absolute image paths applied to ${changedCount} manifests`);
}

if (require.main === module) {
  try { main(); } catch (e) { console.error('Failed:', e); process.exit(1); }
}
