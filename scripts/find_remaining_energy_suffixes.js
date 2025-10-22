#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../drivers');
const ENERGY_SUFFIXES = ['_ac', '_dc', '_battery', '_cr2032', '_cr2450', '_aaa', '_aa', '_usb'];

console.log('🔍 Scanning for remaining drivers with energy suffixes...\n');

const drivers = fs.readdirSync(driversDir)
  .filter(name => fs.statSync(path.join(driversDir, name)).isDirectory())
  .sort();

const remaining = [];

for (const driverName of drivers) {
  for (const suffix of ENERGY_SUFFIXES) {
    if (driverName.endsWith(suffix)) {
      remaining.push({
        name: driverName,
        suffix,
        baseName: driverName.slice(0, -suffix.length)
      });
      break;
    }
  }
}

console.log(`Found ${remaining.length} drivers with energy suffixes:\n`);

for (const driver of remaining) {
  console.log(`  - ${driver.name} → ${driver.baseName}`);
}

console.log(`\nTotal: ${remaining.length} / ${drivers.length} drivers`);

// Save to JSON
fs.writeFileSync(
  path.join(__dirname, '../REMAINING_ENERGY_SUFFIXES.json'),
  JSON.stringify(remaining, null, 2)
);

console.log('\n✅ Saved to REMAINING_ENERGY_SUFFIXES.json');
