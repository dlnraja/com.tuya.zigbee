#!/usr/bin/env node
'use strict';

/**
 * FIX ALL DRIVER IMAGE PATHS
 * 
 * Update all driver.compose.json files to use correct absolute paths for images
 * FROM: "./assets/images/small.png"
 * TO: "drivers/{driver_id}/assets/images/small.png"
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

function fixDriverImagePaths(driverName) {
  const composeJsonPath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composeJsonPath)) {
    return false;
  }
  
  let content = fs.readFileSync(composeJsonPath, 'utf8');
  let composeJson = JSON.parse(content);
  
  if (!composeJson.images) {
    return false;
  }
  
  let modified = false;
  
  // Fix small image
  if (composeJson.images.small && composeJson.images.small === './assets/images/small.png') {
    composeJson.images.small = `drivers/${driverName}/assets/images/small.png`;
    modified = true;
  }
  
  // Fix large image
  if (composeJson.images.large && composeJson.images.large === './assets/images/large.png') {
    composeJson.images.large = `drivers/${driverName}/assets/images/large.png`;
    modified = true;
  }
  
  // Fix xlarge image if exists
  if (composeJson.images.xlarge && composeJson.images.xlarge === './assets/images/xlarge.png') {
    composeJson.images.xlarge = `drivers/${driverName}/assets/images/xlarge.png`;
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(composeJsonPath, JSON.stringify(composeJson, null, 2) + '\n', 'utf8');
    return true;
  }
  
  return false;
}

console.log('🔧 FIXING ALL DRIVER IMAGE PATHS\n');
console.log('='.repeat(60));

const drivers = fs.readdirSync(DRIVERS_DIR)
  .filter(f => fs.statSync(path.join(DRIVERS_DIR, f)).isDirectory());

let fixed = 0;

for (const driver of drivers) {
  if (fixDriverImagePaths(driver)) {
    console.log(`✅ ${driver}`);
    fixed++;
  }
}

console.log('\n' + '='.repeat(60));
console.log(`\n📊 SUMMARY:`);
console.log(`  Drivers scanned: ${drivers.length}`);
console.log(`  Drivers fixed: ${fixed}`);

if (fixed > 0) {
  console.log('\n✅ All driver image paths fixed!');
  console.log('\n📝 Next step: Rebuild app.json');
  console.log('  Run: homey app validate (will rebuild app.json automatically)');
} else {
  console.log('\n✅ All drivers already have correct image paths!');
}
