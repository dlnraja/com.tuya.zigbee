#!/usr/bin/env node
'use strict';

/**
 * MERGE ADVANCED/BASIC VARIANTS
 * 
 * Merge drivers avec suffixes _advanced/_basic
 * en 1 driver avec setting device_level
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔧 MERGE ADVANCED/BASIC VARIANTS\n');

const appJsonPath = path.join(__dirname, '../../app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

console.log(`📊 Drivers before: ${appJson.drivers.length}\n`);

// Backup
const backupPath = path.join(__dirname, `../../app.json.backup.advanced.${Date.now()}`);
fs.writeFileSync(backupPath, JSON.stringify(appJson, null, 2));

// Group by base name
const groups = new Map();

appJson.drivers.forEach(driver => {
  let baseName = driver.id
    .replace(/_advanced$/, '')
    .replace(/_basic$/, '');
  
  if (!groups.has(baseName)) {
    groups.set(baseName, []);
  }
  
  groups.get(baseName).push(driver);
});

// Find mergeable (advanced/basic only)
const mergeable = Array.from(groups.entries())
  .filter(([base, drivers]) => {
    if (drivers.length < 2) return false;
    
    const allLevel = drivers.every(d => 
      d.id.endsWith('_advanced') || 
      d.id.endsWith('_basic')
    );
    
    return allLevel;
  });

console.log(`📦 Mergeable groups: ${mergeable.length}\n`);

const mergedDrivers = [];
const driversToRemove = new Set();
let savedCount = 0;

mergeable.forEach(([baseName, drivers]) => {
  console.log(`🔀 Merging: ${baseName} (${drivers.length} drivers)`);
  
  const baseDriver = JSON.parse(JSON.stringify(drivers[0]));
  baseDriver.id = baseName;
  
  const allManufacturerNames = new Set();
  const allProductIds = new Set();
  
  drivers.forEach(d => {
    if (d.zigbee && d.zigbee.manufacturerName) {
      d.zigbee.manufacturerName.forEach(id => allManufacturerNames.add(id));
    }
    if (d.zigbee && d.zigbee.productId) {
      d.zigbee.productId.forEach(id => allProductIds.add(id));
    }
    driversToRemove.add(d.id);
  });
  
  if (baseDriver.zigbee) {
    baseDriver.zigbee.manufacturerName = Array.from(allManufacturerNames).sort();
    baseDriver.zigbee.productId = Array.from(allProductIds).sort();
  }
  
  if (!baseDriver.settings) {
    baseDriver.settings = [];
  }
  
  baseDriver.settings.push({
    id: 'device_level',
    type: 'dropdown',
    label: {
      en: 'Device Level',
      fr: 'Niveau appareil'
    },
    value: 'advanced',
    values: [
      { id: 'basic', label: { en: 'Basic', fr: 'Basique' } },
      { id: 'advanced', label: { en: 'Advanced', fr: 'Avancé' } }
    ]
  });
  
  mergedDrivers.push(baseDriver);
  savedCount += drivers.length - 1;
  
  console.log(`   ✅ Merged ${drivers.length} → 1 (saved ${drivers.length - 1})`);
});

const finalDrivers = appJson.drivers.filter(d => !driversToRemove.has(d.id));
finalDrivers.push(...mergedDrivers);
finalDrivers.sort((a, b) => a.id.localeCompare(b.id));

appJson.drivers = finalDrivers;

console.log(`\n📊 RESULTS:\n`);
console.log(`Before: ${appJson.drivers.length + savedCount} drivers`);
console.log(`After: ${appJson.drivers.length} drivers`);
console.log(`Saved: ${savedCount} drivers`);
console.log(`Target: 220 drivers`);
console.log(`Gap: ${Math.max(0, appJson.drivers.length - 220)} drivers\n`);

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');

console.log(`✅ app.json updated\n`);
console.log(`💾 Backup: ${path.basename(backupPath)}\n`);
