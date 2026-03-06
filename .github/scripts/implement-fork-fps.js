#!/usr/bin/env node
'use strict';
// v5.12.1: Implement new fingerprints + productIds from fork scans
const fs = require('fs');
const path = require('path');

const DDIR = path.join(__dirname, '..', '..', 'drivers');
const FORK_FPS = path.join(__dirname, '..', 'state', 'new-fork-fps.json');

// Map fork driver names to our driver names
const DRIVER_MAP = {
  'switch_1_gang': 'switch_1gang',
  'switch_2_gang': 'switch_2gang',
  'switch_3_gang': 'switch_3gang',
  'switch_4_gang': 'switch_4gang',
  'wall_switch_1_gang': 'wall_switch_1gang_1way',
  'wall_switch_2_gang': 'wall_switch_2gang_1way',
  'wall_switch_3_gang': 'wall_switch_3gang_1way',
  'wall_switch_4_gang': 'wall_switch_4gang_1way',
  'smoke_sensor': 'smoke_detector',
  'rain_sensor_simple': 'rain_sensor',
  'doorwindowsensor': 'contact_sensor',
  'doorwindowsensor_2': 'contact_sensor',
  'doorwindowsensor_4': 'contact_sensor',
  'flood_sensor': 'water_leak_sensor',
  'pirsensor': 'motion_sensor',
  'rgb_bulb_E27': 'bulb_rgb',
  'tuya_dummy_device': null, // skip
};

// Validate FP format
function isValidFP(mfr) {
  if (!mfr || mfr.length < 6) return false;
  if (mfr.includes('xxxxxxxx')) return false;
  if (/ts0\d{3}$/i.test(mfr)) return false; // concatenated mfr+pid
  if (/TS0\d{3}$/.test(mfr) && mfr.length > 15) return false; // concatenated
  if (mfr === 'undefined' || mfr === 'null') return false;
  return true;
}

function main() {
  console.log('=== Implement Fork FPs v5.12.0 ===');
  
  // Build current index (mfrs + pids)
  const allMfrs = new Set();
  const allPids = new Set();
  const driverFiles = {};
  const dirs = fs.readdirSync(DDIR).filter(d => 
    fs.existsSync(path.join(DDIR, d, 'driver.compose.json'))
  );
  for (const d of dirs) {
    const fp = path.join(DDIR, d, 'driver.compose.json');
    const f = JSON.parse(fs.readFileSync(fp, 'utf8'));
    driverFiles[d] = { path: fp, data: f };
    for (const m of (f.zigbee?.manufacturerName || [])) allMfrs.add(m);
    for (const p of (f.zigbee?.productId || [])) allPids.add(p);
  }
  console.log(`Local: ${dirs.length} drivers, ${allMfrs.size} FPs, ${allPids.size} PIDs`);
  
  // Load fork FPs
  const forkFPs = JSON.parse(fs.readFileSync(FORK_FPS, 'utf8'));
  console.log(`Fork FPs: ${Object.keys(forkFPs).length}`);
  
  // Group by target driver
  const toAdd = {};
  let skipped = 0, invalid = 0, alreadyHave = 0;
  
  for (const [mfr, info] of Object.entries(forkFPs)) {
    if (allMfrs.has(mfr)) { alreadyHave++; continue; }
    if (!isValidFP(mfr)) { invalid++; continue; }
    
    let drv = info.driver;
    if (DRIVER_MAP[drv] === null) { skipped++; continue; }
    if (DRIVER_MAP[drv]) drv = DRIVER_MAP[drv];
    if (!driverFiles[drv]) { skipped++; continue; }
    
    if (!toAdd[drv]) toAdd[drv] = [];
    toAdd[drv].push(mfr);
  }
  
  console.log(`Already have: ${alreadyHave}, Invalid: ${invalid}, Skipped: ${skipped}`);
  
  // Apply changes
  let totalAdded = 0;
  for (const [drv, fps] of Object.entries(toAdd).sort((a, b) => b[1].length - a[1].length)) {
    const df = driverFiles[drv];
    const existing = new Set(df.data.zigbee.manufacturerName);
    let added = 0;
    for (const mfr of fps) {
      if (!existing.has(mfr)) {
        df.data.zigbee.manufacturerName.push(mfr);
        existing.add(mfr);
        added++;
      }
    }
    if (added > 0) {
      fs.writeFileSync(df.path, JSON.stringify(df.data, null, 2) + '\n');
      console.log(`  ${drv}: +${added} (total: ${df.data.zigbee.manufacturerName.length})`);
      totalAdded += added;
    }
  }
  
  // Also integrate productIds from fork data
  let totalPids = 0;
  for (const [, info] of Object.entries(forkFPs)) {
    if (!info.pids || !info.pids.length) continue;
    let drv = info.driver;
    if (DRIVER_MAP[drv] === null) continue;
    if (DRIVER_MAP[drv]) drv = DRIVER_MAP[drv];
    const df = driverFiles[drv];
    if (!df || !df.data.zigbee) continue;
    if (!df.data.zigbee.productId) df.data.zigbee.productId = [];
    const ex = new Set(df.data.zigbee.productId);
    for (const pid of info.pids) {
      if (pid && pid.length >= 4 && !ex.has(pid)) {
        df.data.zigbee.productId.push(pid);
        ex.add(pid); totalPids++;
      }
    }
    if (totalPids > 0) fs.writeFileSync(df.path, JSON.stringify(df.data, null, 2) + '\n');
  }
  if (totalPids) console.log(`PIDs added: ${totalPids}`);
  console.log(`\n=== Done: +${totalAdded} FPs, +${totalPids} PIDs ===`);
  
  // Recount
  let newTotal = 0;
  for (const d of dirs) {
    const f = JSON.parse(fs.readFileSync(path.join(DDIR, d, 'driver.compose.json'), 'utf8'));
    newTotal += (f.zigbee?.manufacturerName || []).length;
  }
  console.log(`New total FPs: ${newTotal}`);
}

main();
