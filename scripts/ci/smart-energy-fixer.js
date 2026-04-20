#!/usr/bin/env node
const fs = require('fs');
const glob = require('glob').sync;

console.log(' Smart Energy Fixer - Scanning drivers for SDK 3 validation issues...');

let fixed = 0;
glob('drivers/**/driver.compose.json').forEach(f => {
  let changed = false;
  let t;
  try {
    t = JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch (e) {
    console.error(` Parse error in ${f}: ${e.message}`);
    return;
  }
  
  const hasBatteryCap = (t.capabilities || []).includes('measure_battery');
  
  if (hasBatteryCap) {
    if (!t.energy) {
      t.energy = { cumulative: true };
      changed = true;
    }
    if (typeof t.energy === 'object') {
      if (t.energy.mains === undefined) {
        t.energy.mains = true;
        changed = true;
      }
      if (!t.energy.batteries || !Array.isArray(t.energy.batteries)) {
        t.energy.batteries = ['NON_SPECIFIED'];
        changed = true;
      } else if (!t.energy.batteries.length || t.energy.batteries.includes('other')) {
        t.energy.batteries = ['NON_SPECIFIED'];
        changed = true;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(f, JSON.stringify(t, null, 2) + '\n');
    console.log(` Fixed SDK 3 Energy array for ${f}`);
    fixed++;
  }
});

console.log(` Smart Energy Fixer completed. Fixed ${fixed} drivers.`);
