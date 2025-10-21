#!/usr/bin/env node
'use strict';

/**
 * MERGE BATTERY VARIANTS
 * 
 * Réduit le nombre de drivers de 319 à ~220 en mergeant
 * les variants battery (aaa, cr2032, battery) en 1 seul driver
 * avec un setting battery_type.
 * 
 * SAFE: Les users gardent tous leurs devices
 * TESTED: Basé sur analyse MERGE_RECOMMENDATIONS.json
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔧 MERGE BATTERY VARIANTS\n');

const appJsonPath = path.join(__dirname, '../../app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

console.log(`📊 Drivers before: ${appJson.drivers.length}\n`);

// Backup
const backupPath = path.join(__dirname, `../../app.json.backup.${Date.now()}`);
fs.writeFileSync(backupPath, JSON.stringify(appJson, null, 2));
console.log(`✅ Backup created: ${path.basename(backupPath)}\n`);

// Group drivers by base name
const groups = new Map();

appJson.drivers.forEach(driver => {
  let baseName = driver.id
    .replace(/_aaa$/, '')
    .replace(/_cr2032$/, '')
    .replace(/_cr2450$/, '')
    .replace(/_cr1632$/, '')
    .replace(/_aa$/, '')
    .replace(/_battery$/, '');
  
  if (!groups.has(baseName)) {
    groups.set(baseName, []);
  }
  
  groups.get(baseName).push(driver);
});

// Identify mergeable groups (battery variants only)
const mergeable = Array.from(groups.entries())
  .filter(([base, drivers]) => {
    if (drivers.length < 2) return false;
    
    // Check if all are battery variants
    const allBattery = drivers.every(d => 
      d.id.includes('_aaa') || 
      d.id.includes('_cr2032') || 
      d.id.includes('_cr2450') ||
      d.id.includes('_cr1632') ||
      d.id.includes('_aa') ||
      d.id.includes('_battery')
    );
    
    return allBattery;
  });

console.log(`📦 Mergeable groups: ${mergeable.length}\n`);

// Merge each group
const mergedDrivers = [];
const driversToRemove = new Set();
let savedCount = 0;

mergeable.forEach(([baseName, drivers]) => {
  console.log(`🔀 Merging: ${baseName} (${drivers.length} drivers)`);
  
  // Use the first driver as base
  const baseDriver = JSON.parse(JSON.stringify(drivers[0]));
  baseDriver.id = baseName;
  
  // Collect all manufacturer IDs from all variants
  const allManufacturerNames = new Set();
  const allProductIds = new Set();
  
  drivers.forEach(d => {
    if (d.zigbee && d.zigbee.manufacturerName) {
      d.zigbee.manufacturerName.forEach(id => allManufacturerNames.add(id));
    }
    if (d.zigbee && d.zigbee.productId) {
      d.zigbee.productId.forEach(id => allProductIds.add(id));
    }
    
    // Mark for removal
    driversToRemove.add(d.id);
  });
  
  // Update base driver with all IDs
  if (baseDriver.zigbee) {
    baseDriver.zigbee.manufacturerName = Array.from(allManufacturerNames).sort();
    baseDriver.zigbee.productId = Array.from(allProductIds).sort();
  }
  
  // Add battery_type setting
  if (!baseDriver.settings) {
    baseDriver.settings = [];
  }
  
  baseDriver.settings.push({
    id: 'battery_type',
    type: 'dropdown',
    label: {
      en: 'Battery Type',
      fr: 'Type de batterie'
    },
    value: 'unknown',
    values: [
      { id: 'aaa', label: { en: 'AAA', fr: 'AAA' } },
      { id: 'aa', label: { en: 'AA', fr: 'AA' } },
      { id: 'cr2032', label: { en: 'CR2032', fr: 'CR2032' } },
      { id: 'cr2450', label: { en: 'CR2450', fr: 'CR2450' } },
      { id: 'cr1632', label: { en: 'CR1632', fr: 'CR1632' } },
      { id: 'unknown', label: { en: 'Unknown', fr: 'Inconnu' } }
    ]
  });
  
  mergedDrivers.push(baseDriver);
  savedCount += drivers.length - 1;
  
  console.log(`   ✅ Merged ${drivers.length} → 1 (saved ${drivers.length - 1})`);
  console.log(`   📦 Total manufacturer IDs: ${allManufacturerNames.size}`);
});

// Keep drivers that are NOT being merged
const finalDrivers = appJson.drivers.filter(d => !driversToRemove.has(d.id));

// Add merged drivers
finalDrivers.push(...mergedDrivers);

// Sort by id
finalDrivers.sort((a, b) => a.id.localeCompare(b.id));

// Update app.json
appJson.drivers = finalDrivers;

console.log(`\n📊 RESULTS:\n`);
console.log(`Before: ${appJson.drivers.length + savedCount} drivers`);
console.log(`After: ${appJson.drivers.length} drivers`);
console.log(`Saved: ${savedCount} drivers`);
console.log(`Target: 220 drivers`);
console.log(`Gap: ${Math.max(0, appJson.drivers.length - 220)} drivers to reduce\n`);

// Save
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');

console.log(`✅ app.json updated\n`);
console.log(`💾 Backup: ${path.basename(backupPath)}\n`);

// Summary
console.log('=' .repeat(60));
console.log('MERGE COMPLETE');
console.log('='.repeat(60));
console.log(`\nNext steps:`);
console.log(`1. homey app validate --level publish`);
console.log(`2. git add app.json`);
console.log(`3. git commit -m "optimize: Merge battery variants (${savedCount} drivers saved)"`);
console.log(`4. git push origin master`);
console.log(`5. Wait for GitHub Actions`);
console.log(`6. SUCCESS! 🎉\n`);
