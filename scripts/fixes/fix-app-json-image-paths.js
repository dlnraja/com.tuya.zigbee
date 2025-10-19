#!/usr/bin/env node
'use strict';

/**
 * FIX APP.JSON IMAGE PATHS
 * 
 * Update all driver image paths in app.json to use correct driver-specific paths
 * FROM: "./assets/images/small.png"
 * TO: "drivers/{driver_id}/assets/images/small.png"
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const APP_JSON_PATH = path.join(ROOT, 'app.json');

console.log('🔧 FIXING APP.JSON IMAGE PATHS\n');
console.log('='.repeat(60));

// Read app.json
const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));

let fixed = 0;

// Fix each driver
for (const driver of appJson.drivers) {
  if (!driver.images) continue;
  
  let driverFixed = false;
  
  // Fix small image
  if (driver.images.small === './assets/images/small.png') {
    driver.images.small = `drivers/${driver.id}/assets/images/small.png`;
    driverFixed = true;
  }
  
  // Fix large image
  if (driver.images.large === './assets/images/large.png') {
    driver.images.large = `drivers/${driver.id}/assets/images/large.png`;
    driverFixed = true;
  }
  
  // Fix xlarge image if exists
  if (driver.images.xlarge === './assets/images/xlarge.png') {
    driver.images.xlarge = `drivers/${driver.id}/assets/images/xlarge.png`;
    driverFixed = true;
  }
  
  if (driverFixed) {
    console.log(`✅ ${driver.id}`);
    fixed++;
  }
}

// Write back app.json
fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2) + '\n', 'utf8');

console.log('\n' + '='.repeat(60));
console.log(`\n📊 SUMMARY:`);
console.log(`  Total drivers: ${appJson.drivers.length}`);
console.log(`  Drivers fixed: ${fixed}`);

if (fixed > 0) {
  console.log('\n✅ All image paths in app.json fixed!');
  console.log('\n📝 Next step: Validate');
  console.log('  Run: homey app validate');
} else {
  console.log('\n✅ All drivers already have correct image paths!');
}
