#!/usr/bin/env node
/*
 * normalize_app_driver_images.js
 * --------------------------------------------------------------
 * Ensure all drivers in app.json reference driver-level images:
 * - images.small -> './assets/small.png' (75x75)
 * - images.large -> './assets/large.png' (500x500)
 * - zigbee.learnmode.image (if present) -> './assets/large.png'
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const APP_JSON = path.join(ROOT, 'app.json');

function main() {
  if (!fs.existsSync(APP_JSON)) {
    console.error('app.json not found');
    process.exit(1);
  }
  const app = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
  if (!Array.isArray(app.drivers)) {
    console.error('app.json has no drivers array');
    process.exit(1);
  }
  let changed = 0;
  app.drivers = app.drivers.map((drv) => {
    const d = { ...drv };
    d.images = d.images || {};
    if (d.images.small !== './assets/small.png') { d.images.small = './assets/small.png'; changed++; }
    if (d.images.large !== './assets/large.png') { d.images.large = './assets/large.png'; changed++; }
    if (d.zigbee && d.zigbee.learnmode && typeof d.zigbee.learnmode.image === 'string') {
      if (d.zigbee.learnmode.image !== './assets/large.png') { d.zigbee.learnmode.image = './assets/large.png'; changed++; }
    }
    return d;
  });
  if (changed > 0) {
    fs.writeFileSync(APP_JSON, JSON.stringify(app, null, 2), 'utf8');
    console.log(`✅ Normalized image paths for ${changed} fields in app.json`);
  } else {
    console.log('No image path changes required in app.json');
  }
}

if (require.main === module) {
  try { main(); } catch (e) { console.error('Failed:', e); process.exit(1); }
}
