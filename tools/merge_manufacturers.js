#!/usr/bin/env node
/**
 * Merge manufacturer IDs from external sources into app.json
 * This script enriches driver manufacturer lists with validated IDs from zigbee2mqtt/herdsman
 */

const fs = require('fs');
const path = require('path');

// Load data
const appJsonPath = path.join(__dirname, '..', 'app.json');
const sourcePath = path.join(__dirname, '..', '.external_sources', 'koenkk_tuya_devices_herdsman_converters_1759501156003.json');

console.log('📦 Loading app.json...');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

console.log('📦 Loading manufacturer source...');
const sourceData = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

const newManufacturers = sourceData.manufacturers || [];
console.log(`✅ Found ${newManufacturers.length} manufacturers in source`);

// Count stats
let totalAdded = 0;
let driversEnriched = 0;
let driversWithMfr = 0;

// Process each driver
console.log('\n🔄 Processing drivers...');
if (appJson.drivers && Array.isArray(appJson.drivers)) {
  appJson.drivers.forEach((driver, index) => {
    if (driver.zigbee && driver.zigbee.manufacturerName) {
      driversWithMfr++;
      const existingMfrs = driver.zigbee.manufacturerName;
      const beforeCount = existingMfrs.length;
      
      // Create Set for deduplication
      const mfrSet = new Set(existingMfrs);
      let addedCount = 0;
      
      // Add new manufacturers
      newManufacturers.forEach(mfr => {
        if (!mfrSet.has(mfr)) {
          mfrSet.add(mfr);
          addedCount++;
        }
      });
      
      // Update driver if new entries were added
      if (addedCount > 0) {
        driver.zigbee.manufacturerName = Array.from(mfrSet).sort();
        totalAdded += addedCount;
        driversEnriched++;
        console.log(`  ✓ ${driver.id}: +${addedCount} manufacturers (${beforeCount} → ${driver.zigbee.manufacturerName.length})`);
      }
    }
  });
}

console.log('\n📊 Summary:');
console.log(`  Drivers with manufacturers: ${driversWithMfr}`);
console.log(`  Drivers enriched: ${driversEnriched}`);
console.log(`  Total manufacturers added: ${totalAdded}`);

// Backup and save
console.log('\n💾 Saving changes...');
const backupPath = appJsonPath + '.backup.' + Date.now();
fs.copyFileSync(appJsonPath, backupPath);
console.log(`  Backup created: ${path.basename(backupPath)}`);

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
console.log('  ✅ app.json updated successfully');

console.log('\n✨ Done!');
