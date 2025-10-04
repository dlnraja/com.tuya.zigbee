#!/usr/bin/env node
// remove_invalid_image_fields.js
// --------------------------------------------------------------
// For each drivers/<driverId>/driver.compose.json:
//   - Keep only images.small and images.large under images{}
//   - Ensure images.small = './assets/small.png', images.large = './assets/large.png'
//   - If zigbee.learnmode.image exists and starts with '/drivers/', set to './assets/large.png'
//   - Remove any other keys under images (e.g., xlarge)

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

function readJsonSafe(filePath){ try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return null; } }
function writeJson(filePath, data){ fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8'); }

function fixManifest(file){
  const m = readJsonSafe(file);
  if (!m) return false;
  let changed = false;

  // Normalize images to absolute per-driver paths
  const driverId = path.basename(path.dirname(file));
  const imgs = m.images || {};
  const small = `/drivers/${driverId}/assets/small.png`;
  const large = `/drivers/${driverId}/assets/large.png`;
  if (imgs.small !== small) { imgs.small = small; changed = true; }
  if (imgs.large !== large) { imgs.large = large; changed = true; }
  // Remove any extra keys
  const allowed = new Set(['small', 'large']);
  for (const k of Object.keys(imgs)){
    if (!allowed.has(k)) { delete imgs[k]; changed = true; }
  }
  m.images = imgs;

  // Normalize learnmode.image to absolute per-driver large asset
  if (m.zigbee && m.zigbee.learnmode && typeof m.zigbee.learnmode.image === 'string'){
    const desired = large;
    if (m.zigbee.learnmode.image !== desired) { m.zigbee.learnmode.image = desired; changed = true; }
  }

  if (changed) writeJson(file, m);
  return changed;
}

function main(){
  const entries = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true }).filter(e=>e.isDirectory()).map(e=>e.name);
  let fixed = 0;
  entries.forEach((dir, i) => {
    const file = path.join(DRIVERS_DIR, dir, 'driver.compose.json');
    if (fs.existsSync(file) && fixManifest(file)) fixed++;
    if ((i+1)%20===0) console.log(`   • Progress: ${i+1}/${entries.length}`);
  });
  console.log(`✅ Removed invalid image fields and normalized paths in ${fixed} manifests`);
}

if (require.main===module){ try{ main(); } catch(e){ console.error('❌ remove_invalid_image_fields failed:', e.message); process.exit(1);} }

module.exports = { main };
