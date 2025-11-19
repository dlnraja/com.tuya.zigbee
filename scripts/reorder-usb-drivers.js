#!/usr/bin/env node
'use strict';

/**
 * Reorder USB Outlet Drivers in app.json
 * Fix: usb_outlet_2port BEFORE usb_outlet_1gang (specific before generic)
 */

const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', 'app.json');

console.log('🔧 Reordering USB Outlet Drivers in app.json...\n');

// Read app.json
const json = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// Find driver indices
const drivers = json.drivers;
let idx1gang = -1;
let idx2port = -1;

for (let i = 0; i < drivers.length; i++) {
  if (drivers[i].id === 'usb_outlet_1gang') {
    idx1gang = i;
    console.log(`   Found usb_outlet_1gang at index ${i}`);
  }
  if (drivers[i].id === 'usb_outlet_2port') {
    idx2port = i;
    console.log(`   Found usb_outlet_2port at index ${i}`);
  }
}

if (idx1gang === -1 || idx2port === -1) {
  console.error('❌ ERROR: Could not find both drivers!');
  process.exit(1);
}

// Check if already in correct order
if (idx2port < idx1gang) {
  console.log('\n✅ Already in correct order (2port before 1gang)');
  process.exit(0);
}

console.log(`\n🔄 Swapping drivers...`);
console.log(`   Before: 1gang at ${idx1gang}, 2port at ${idx2port}`);

// Swap: Remove 2port and insert before 1gang
const driver2port = drivers.splice(idx2port, 1)[0];
drivers.splice(idx1gang, 0, driver2port);

console.log(`   After:  2port at ${idx1gang}, 1gang at ${idx1gang + 1}`);

// Write back with same formatting
fs.writeFileSync(appJsonPath, JSON.stringify(json, null, 2), 'utf8');

console.log('\n✅ SUCCESS! USB Outlet drivers reordered');
console.log('   usb_outlet_2port now BEFORE usb_outlet_1gang\n');
console.log('💡 Rule: Specific drivers BEFORE generic drivers');
console.log('   - 2-port (2 endpoints) → More specific');
console.log('   - 1-gang (1 endpoint) → More generic (fallback)\n');
