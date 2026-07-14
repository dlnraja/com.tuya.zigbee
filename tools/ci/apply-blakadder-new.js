#!/usr/bin/env node
/**
 * apply-blakadder-new.js — P53
 *
 * Take the 48 Blakadder-only fingerprints (not in mfs_db) and try to add them
 * to the appropriate driver.compose.json based on category → driver mapping.
 *
 * Conservative approach:
 *   - Only adds to a driver if the mfr isn't already there
 *   - Backs up driver.compose.json before modifying
 *   - Reports what it would do and what it did
 *   - Dry-run by default; pass --apply to actually modify
 *
 * Run: node tools/ci/apply-blakadder-new.js [--apply] [--only=vendor]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const ONLY_PATH = path.join(ROOT, '.github', 'state', 'blakadder', 'blakadder-only.json');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const onlyVendor = (() => {
  const a = args.find(x => x.startsWith('--only='));
  return a ? a.split('=')[1] : null;
})();

// Category → driver map (we already have these in cross-ref; refine here)
const CATEGORY_TO_DRIVER = {
  bulb: ['bulb_1gang', 'bulb_color', 'bulb_tunable'],
  light: ['light_strip', 'light_1channel', 'light_2channel', 'bulb_1gang'],
  dimmer: ['dimmer_1gang', 'dimmer_wall'],
  switch: ['switch_1gang', 'switch_2gang', 'switch_3gang', 'switch_4gang', 'generic_switch'],
  plug: ['plug_smart', 'plug_energy', 'plug_outdoor', 'outdoor_plug'],
  sensor: ['climate_sensor', 'motion_sensor', 'door_window_sensor', 'water_leak_sensor', 'soil_sensor', 'air_quality'],
  remote: ['button_wireless_1', 'button_wireless_2', 'button_wireless_3', 'button_wireless_4', 'wireless_switch'],
  hvac: ['thermostatic_radiator_valve', 'thermostat', 'climate_sensor'],
  cover: ['curtain', 'blind', 'garage_door', 'curtain_motor_wall'],
  lock: ['lock_smart'],
  router: ['router_zigbee'],
  coordinator: [],
};

function loadOnly() {
  if (!fs.existsSync(ONLY_PATH)) {
    console.error('FATAL: ' + ONLY_PATH + ' missing — run blakadder-cross-ref.js first');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(ONLY_PATH, 'utf8'));
}

function findDriverForCategory(category, vendor) {
  // Returns the FIRST existing driver matching the category
  const candidates = CATEGORY_TO_DRIVER[category] || ['generic_tuya'];
  for (const c of candidates) {
    const p = path.join(ROOT, 'drivers', c);
    if (fs.existsSync(p) && fs.existsSync(path.join(p, 'driver.compose.json'))) {
      return c;
    }
  }
  // Fallback: generic_tuya
  return 'generic_tuya';
}

function loadCompose(driver) {
  const fp = path.join(ROOT, 'drivers', driver, 'driver.compose.json');
  return { fp, json: JSON.parse(fs.readFileSync(fp, 'utf8')) };
}

function saveCompose(driver, json) {
  const fp = path.join(ROOT, 'drivers', driver, 'driver.compose.json');
  fs.writeFileSync(fp, JSON.stringify(json, null, 2) + '\n');
}

function hasMfr(json, mfrLower) {
  const mfrs = json.zigbee?.manufacturerName || [];
  return mfrs.map(s => String(s).toLowerCase()).includes(mfrLower);
}

function addMfr(json, mfr) {
  if (!json.zigbee) json.zigbee = {};
  if (!json.zigbee.manufacturerName) json.zigbee.manufacturerName = [];
  if (!Array.isArray(json.zigbee.manufacturerName)) json.zigbee.manufacturerName = [json.zigbee.manufacturerName];
  if (!hasMfr(json, mfr.toLowerCase())) {
    json.zigbee.manufacturerName.push(mfr);
    return true;
  }
  return false;
}

function main() {
  const all = loadOnly();
  const filtered = onlyVendor ? all.filter(x => x.vendor === onlyVendor) : all;
  console.log('=== Apply Blakadder new candidates ===');
  console.log('Mode:', APPLY ? 'APPLY' : 'DRY-RUN');
  console.log('Total candidates:', all.length);
  console.log('After filter    :', filtered.length, onlyVendor ? `(vendor=${onlyVendor})` : '');

  // Group by target driver
  const byDriver = new Map();
  for (const cand of filtered) {
    const driver = findDriverForCategory(cand.category, cand.vendor);
    if (!byDriver.has(driver)) byDriver.set(driver, []);
    byDriver.get(driver).push(cand);
  }

  let added = 0;
  let skipped = 0;
  const report = [];
  for (const [driver, cands] of byDriver) {
    let json;
    try { ({ json } = loadCompose(driver)); }
    catch (e) { console.log('  [skip] ' + driver + ': ' + e.message); continue; }

    for (const c of cands) {
      const mfrLower = c.mfr.toLowerCase();
      if (hasMfr(json, mfrLower)) {
        skipped++;
        report.push({ driver, mfr: c.mfr, action: 'skipped (already present)', vendor: c.vendor, model: c.model });
        continue;
      }
      if (APPLY) {
        addMfr(json, c.mfr);
        report.push({ driver, mfr: c.mfr, action: 'added', vendor: c.vendor, model: c.model, category: c.category });
        added++;
      } else {
        report.push({ driver, mfr: c.mfr, action: 'would-add (dry-run)', vendor: c.vendor, model: c.model, category: c.category });
        added++;
      }
    }
    if (APPLY) {
      // Backup
      const { fp } = loadCompose(driver);
      fs.copyFileSync(fp, fp + '.bak.blakadder.' + Date.now());
      saveCompose(driver, json);
    }
  }

  // Print summary
  console.log('\n=== SUMMARY ===');
  console.log('Drivers touched  :', byDriver.size);
  console.log('Mfrs added       :', added);
  console.log('Mfrs skipped     :', skipped);
  console.log('\nBy driver:');
  for (const [d, cs] of byDriver) {
    console.log('  ' + d.padEnd(30) + ' ' + cs.length + ' candidates');
  }

  console.log('\n=== DETAIL ===');
  for (const r of report.slice(0, 50)) {
    console.log('  [' + r.action.padEnd(28) + '] ' + (r.driver || '?').padEnd(30) + ' ' + r.mfr.padEnd(28) + ' ' + (r.vendor || '?') + ' — ' + (r.model || '?'));
  }

  // Save report
  const outDir = path.join(ROOT, '.github', 'state', 'blakadder');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'apply-report.json'), JSON.stringify({ added, skipped, byDriver: Object.fromEntries(byDriver), report }, null, 2));
  console.log('\nReport: .github/state/blakadder/apply-report.json');
  if (!APPLY) {
    console.log('\nNOTE: dry-run only. Pass --apply to modify driver.compose.json files.');
  }
}

try { main(); }
catch (e) { console.error('FATAL:', e.stack || e.message); process.exit(1); }
