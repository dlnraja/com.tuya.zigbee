#!/usr/bin/env node
'use strict';

/**
 * FIX APP.JSON - ADD LEADING SLASH TO IMAGE PATHS
 * 
 * Critical fix: Image paths MUST start with "/" to be absolute
 * FROM: "drivers/{id}/assets/images/small.png"
 * TO:   "/drivers/{id}/assets/images/small.png"
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const APP_JSON_PATH = path.join(ROOT, 'app.json');

console.log('🔧 FIXING APP.JSON - ADDING LEADING SLASH TO IMAGE PATHS\n');
console.log('='.repeat(60));

// Read app.json
const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));

let fixed = 0;

// Fix each driver
for (const driver of appJson.drivers) {
  if (!driver.images) continue;
  
  let driverFixed = false;
  
  // Fix small image - add leading slash if missing
  if (driver.images.small && !driver.images.small.startsWith('/')) {
    driver.images.small = '/' + driver.images.small;
    driverFixed = true;
  }
  
  // Fix large image - add leading slash if missing
  if (driver.images.large && !driver.images.large.startsWith('/')) {
    driver.images.large = '/' + driver.images.large;
    driverFixed = true;
  }
  
  // Fix xlarge image if exists - add leading slash if missing
  if (driver.images.xlarge && !driver.images.xlarge.startsWith('/')) {
    driver.images.xlarge = '/' + driver.images.xlarge;
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
  console.log('\n✅ All image paths now start with "/" (absolute paths)');
  console.log('\n📝 Next step: Commit and push');
  console.log('  git add app.json');
  console.log('  git commit -m "fix: Add leading slash to all driver image paths (absolute paths required)"');
  console.log('  git push origin master');
} else {
  console.log('\n✅ All drivers already have correct absolute image paths!');
}
