#!/usr/bin/env node
/**
 * Add ceiling_fan driver entry to app.json
 */

const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const ceilingFanComposePath = path.join(__dirname, '..', 'drivers', 'ceiling_fan', 'driver.compose.json');

console.log('📦 Loading app.json...');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

console.log('📦 Loading ceiling_fan driver.compose.json...');
const ceilingFanCompose = JSON.parse(fs.readFileSync(ceilingFanComposePath, 'utf8'));

// Check if ceiling_fan already exists
const existingIndex = appJson.drivers.findIndex(d => d.id === 'ceiling_fan');

if (existingIndex >= 0) {
  console.log('✓ ceiling_fan already exists at index', existingIndex);
  console.log('  Updating existing entry...');
  
  // Add missing manufacturer from PR #1210
  if (!ceilingFanCompose.zigbee.manufacturerName.includes('_TZE204_lawxy9e2')) {
    ceilingFanCompose.zigbee.manufacturerName.push('_TZE204_lawxy9e2');
    ceilingFanCompose.zigbee.manufacturerName.sort();
  }
  
  // Update with connectivity and remove duplicate capabilitiesOptions
  const updatedDriver = {
    ...ceilingFanCompose,
    connectivity: ['zigbee'],
    id: 'ceiling_fan'
  };
  
  appJson.drivers[existingIndex] = updatedDriver;
} else {
  console.log('✓ ceiling_fan not found, adding new entry...');
  
  // Add manufacturer from PR #1210
  if (!ceilingFanCompose.zigbee.manufacturerName.includes('_TZE204_lawxy9e2')) {
    ceilingFanCompose.zigbee.manufacturerName.push('_TZE204_lawxy9e2');
    ceilingFanCompose.zigbee.manufacturerName.sort();
  }
  
  // Create complete driver entry
  const newDriver = {
    ...ceilingFanCompose,
    connectivity: ['zigbee'],
    id: 'ceiling_fan'
  };
  
  // Find insertion point (after ceiling_light_rgb)
  const ceilingLightIndex = appJson.drivers.findIndex(d => d.id === 'ceiling_light_rgb');
  
  if (ceilingLightIndex >= 0) {
    appJson.drivers.splice(ceilingLightIndex + 1, 0, newDriver);
    console.log(`  Inserted after ceiling_light_rgb (index ${ceilingLightIndex + 1})`);
  } else {
    appJson.drivers.push(newDriver);
    console.log('  Added to end of drivers array');
  }
}

// Backup
console.log('\n💾 Creating backup...');
const backupPath = appJsonPath + '.backup.' + Date.now();
fs.copyFileSync(appJsonPath, backupPath);
console.log(`  Backup: ${path.basename(backupPath)}`);

// Save
console.log('\n💾 Saving app.json...');
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
console.log('  ✅ app.json updated successfully');

console.log('\n📊 Summary:');
console.log(`  Total drivers: ${appJson.drivers.length}`);
console.log(`  ceiling_fan index: ${appJson.drivers.findIndex(d => d.id === 'ceiling_fan')}`);
console.log(`  ceiling_fan manufacturers: ${appJson.drivers.find(d => d.id === 'ceiling_fan')?.zigbee?.manufacturerName?.length || 0}`);

console.log('\n✨ Done!');
