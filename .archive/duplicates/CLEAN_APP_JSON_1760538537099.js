#!/usr/bin/env node

/**
 * CLEAN APP JSON - Remove non-existent drivers completely
 * Keep ONLY drivers that physically exist in drivers/ folder
 * 
 * @version 2.1.46
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const driversDir = path.join(rootDir, 'drivers');
const appJsonPath = path.join(rootDir, 'app.json');
const packageJsonPath = path.join(rootDir, 'package.json');

console.log('\n🧹 CLEANING APP.JSON - Remove non-existent drivers\n');

// Get list of existing drivers
const existingDrivers = fs.readdirSync(driversDir).filter(dir => {
  return fs.statSync(path.join(driversDir, dir)).isDirectory();
});

console.log(`✅ Found ${existingDrivers.length} existing drivers in /drivers/ folder\n`);

// Load app.json
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
const originalDriversCount = appJson.drivers ? appJson.drivers.length : 0;

console.log(`📋 Original app.json has ${originalDriversCount} drivers\n`);

// Filter: Keep ONLY drivers that exist
const cleanedDrivers = appJson.drivers.filter(driver => {
  const driverExists = existingDrivers.includes(driver.id);
  
  if (!driverExists) {
    console.log(`❌ REMOVE: ${driver.id} (folder does not exist)`);
  }
  
  return driverExists;
});

console.log(`\n✅ Kept ${cleanedDrivers.length} drivers that exist`);
console.log(`❌ Removed ${originalDriversCount - cleanedDrivers.length} non-existent drivers\n`);

// Update app.json
appJson.drivers = cleanedDrivers;
appJson.version = '2.1.46';

// Save
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf-8');
console.log('✅ app.json cleaned and saved\n');

// Update package.json version
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
packageJson.version = '2.1.46';
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');
console.log('✅ package.json version updated\n');

// Verify all drivers
console.log('🔍 Verifying all drivers have existing folders...\n');
let allValid = true;
cleanedDrivers.forEach(driver => {
  const driverPath = path.join(driversDir, driver.id);
  if (!fs.existsSync(driverPath)) {
    console.log(`❌ ERROR: ${driver.id} in app.json but folder missing!`);
    allValid = false;
  }
});

if (allValid) {
  console.log('✅ ALL drivers in app.json have existing folders!\n');
  console.log('🎉 APP.JSON CLEANED SUCCESSFULLY\n');
} else {
  console.log('❌ Some drivers still have issues\n');
  process.exit(1);
}
