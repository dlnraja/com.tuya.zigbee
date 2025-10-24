#!/usr/bin/env node
'use strict';

/**
 * ADD GIRIER DEVICE (_TZ3000_ltt60asa)
 * 
 * Ajoute le manufacturer ID GIRIER à un driver existant
 * Basé sur Issue #1187 de Johan Bendz
 */

const fs = require('fs');
const path = require('path');

console.log('\n🎯 AJOUT DEVICE GIRIER\n');

const appJsonPath = path.join(__dirname, '../../app.json');
const app = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

const GIRIER_MANUFACTURER_ID = '_TZ3000_ltt60asa';
const GIRIER_PRODUCT_ID = 'TS0004';

// Chercher driver AC 4-gang approprié
const targetDrivers = [
  'moes_smart_switch_4gang_ac',
  'moes_wall_switch_4gang_ac',
  'moes_touch_switch_4gang_ac'
];

let driverToModify = null;

for (const driverId of targetDrivers) {
  const driver = app.drivers.find(d => d.id === driverId);
  if (driver && driver.zigbee) {
    driverToModify = driver;
    console.log(`✅ Found target driver: ${driverId}`);
    break;
  }
}

if (!driverToModify) {
  console.error('❌ No suitable 4-gang AC driver found');
  process.exit(1);
}

// Vérifier si déjà présent
if (driverToModify.zigbee.manufacturerName.includes(GIRIER_MANUFACTURER_ID)) {
  console.log(`✅ ${GIRIER_MANUFACTURER_ID} already in ${driverToModify.id}`);
  process.exit(0);
}

// Ajouter manufacturer ID
console.log(`\n📝 Adding to driver: ${driverToModify.id}`);
console.log(`   Current manufacturer IDs: ${driverToModify.zigbee.manufacturerName.length}`);

driverToModify.zigbee.manufacturerName.push(GIRIER_MANUFACTURER_ID);

console.log(`   New count: ${driverToModify.zigbee.manufacturerName.length}`);

// Vérifier productId
if (!driverToModify.zigbee.productId.includes(GIRIER_PRODUCT_ID)) {
  console.log(`   Adding product ID: ${GIRIER_PRODUCT_ID}`);
  driverToModify.zigbee.productId.push(GIRIER_PRODUCT_ID);
}

// Backup
const backupPath = appJsonPath + '.backup';
fs.copyFileSync(appJsonPath, backupPath);
console.log(`\n✅ Backup created: ${path.basename(backupPath)}`);

// Save
fs.writeFileSync(appJsonPath, JSON.stringify(app, null, 2));
console.log(`✅ app.json updated`);

console.log(`\n🎉 GIRIER DEVICE ADDED SUCCESSFULLY\n`);
console.log(`Driver: ${driverToModify.id}`);
console.log(`Manufacturer ID: ${GIRIER_MANUFACTURER_ID}`);
console.log(`Product ID: ${GIRIER_PRODUCT_ID}`);
console.log(`\n📝 Next steps:`);
console.log(`   1. Test with your physical GIRIER device`);
console.log(`   2. Verify all 4 channels work`);
console.log(`   3. Check power monitoring (if available)`);
console.log(`   4. Commit and push changes`);
console.log('');
