#!/usr/bin/env node
'use strict';

/**
 * Rebuild app.json to only include existing drivers
 */

const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '../app.json');
const driversDir = path.join(__dirname, '../drivers');

console.log('🔧 Rebuilding app.json with current drivers...\n');

// Get list of existing drivers
const existingDrivers = fs.readdirSync(driversDir)
  .filter(name => {
    const driverPath = path.join(driversDir, name);
    return fs.statSync(driverPath).isDirectory();
  })
  .sort();

console.log(`Found ${existingDrivers.length} existing drivers\n`);

// Read current app.json
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));

// Filter drivers to only include existing ones
if (appJson.drivers) {
  const oldCount = appJson.drivers.length;
  
  appJson.drivers = appJson.drivers.filter(driver => {
    const driverId = driver.id;
    const exists = existingDrivers.includes(driverId);
    
    if (!exists) {
      console.log(`❌ Removing deleted driver: ${driverId}`);
    }
    
    return exists;
  });
  
  const newCount = appJson.drivers.length;
  const removed = oldCount - newCount;
  
  console.log(`\n📊 Summary:`);
  console.log(`   Old drivers in app.json: ${oldCount}`);
  console.log(`   New drivers in app.json: ${newCount}`);
  console.log(`   Removed: ${removed}`);
}

// Write back
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));

console.log('\n✅ app.json rebuilt successfully!');
