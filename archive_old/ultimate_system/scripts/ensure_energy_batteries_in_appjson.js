#!/usr/bin/env node
/*
 * ensure_energy_batteries_in_appjson.js
 * --------------------------------------------------------------
 * Patch app.json: for each driver with capability 'measure_battery',
 * ensure energy.batteries is a non-empty array. If missing, set to ['CR2032'].
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
    const caps = Array.isArray(d.capabilities) ? d.capabilities : [];
    if (caps.includes('measure_battery')) {
      d.energy = d.energy || {};
      if (!Array.isArray(d.energy.batteries) || d.energy.batteries.length === 0) {
        d.energy.batteries = ['CR2032'];
        changed++;
      }
    }
    return d;
  });
  if (changed > 0) {
    fs.writeFileSync(APP_JSON, JSON.stringify(app, null, 2), 'utf8');
    console.log(`✅ Ensured energy.batteries for ${changed} drivers in app.json`);
  } else {
    console.log('No changes needed: energy.batteries present for all measure_battery drivers');
  }
}

if (require.main === module) {
  try { main(); } catch (e) { console.error('Failed:', e); process.exit(1); }
}
