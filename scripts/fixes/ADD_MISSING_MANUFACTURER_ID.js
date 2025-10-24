#!/usr/bin/env node

/**
 * ADD MISSING MANUFACTURER ID
 * Ajoute _TZ3000_bczr4e10 aux drivers TS0043 (3-button switch)
 */

const fs = require('fs');
const path = require('path');

const MANUFACTURER_ID = '_TZ3000_bczr4e10';
const PRODUCT_ID = 'TS0043';

const driversToUpdate = [
  'wireless_switch_3gang_cr2032',
  'switch_3gang_battery',
  'scene_controller'
];

function updateDriver(driverName) {
  const driverPath = path.join(__dirname, '..', '..', 'drivers', driverName, 'driver.compose.json');
  
  if (!fs.existsSync(driverPath)) {
    console.log(`⚠️  Driver not found: ${driverName}`);
    return false;
  }
  
  try {
    const content = fs.readFileSync(driverPath, 'utf8');
    const driver = JSON.parse(content);
    
    // Check if manufacturer ID already exists
    if (driver.zigbee.manufacturerName && driver.zigbee.manufacturerName.includes(MANUFACTURER_ID)) {
      console.log(`✅ ${driverName}: Already has ${MANUFACTURER_ID}`);
      return false;
    }
    
    // Check if it supports TS0043
    if (!driver.zigbee.productId || !driver.zigbee.productId.includes(PRODUCT_ID)) {
      console.log(`⚠️  ${driverName}: Doesn't support ${PRODUCT_ID}`);
      return false;
    }
    
    // Add manufacturer ID
    if (!driver.zigbee.manufacturerName) {
      driver.zigbee.manufacturerName = [];
    }
    driver.zigbee.manufacturerName.push(MANUFACTURER_ID);
    driver.zigbee.manufacturerName.sort();
    
    // Write back
    fs.writeFileSync(driverPath, JSON.stringify(driver, null, 2) + '\n', 'utf8');
    console.log(`✅ ${driverName}: Added ${MANUFACTURER_ID}`);
    return true;
    
  } catch (err) {
    console.error(`❌ Error updating ${driverName}:`, err.message);
    return false;
  }
}

console.log(`\n🔧 Adding ${MANUFACTURER_ID} to TS0043 drivers...\n`);

let updated = 0;
driversToUpdate.forEach(driverName => {
  if (updateDriver(driverName)) {
    updated++;
  }
});

console.log(`\n✅ Updated ${updated} drivers\n`);
