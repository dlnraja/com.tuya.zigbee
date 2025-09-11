#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

async function fixValidationErrors() {
  console.log('🔧 VALIDATION ERROR FIXER - Fixing specific errors...\n');
  
  const appJsonPath = path.join(process.cwd(), 'app.json');
  const content = await fs.readFile(appJsonPath, 'utf8');
  const appJson = JSON.parse(content);
  
  let modified = false;
  
  // Fix each driver by ID
  for (const driver of appJson.drivers) {
    // Fix sensors-TS0601_motion driver
    if (driver.id === 'sensors-TS0601_motion') {
      if (driver.zigbee?.endpoints?.['1']?.bindings) {
        // Force simple numeric bindings
        driver.zigbee.endpoints['1'].bindings = [1026, 1];
        modified = true;
        console.log('✅ Fixed sensors-TS0601_motion bindings to numeric');
      }
    }
    
    // Fix tuya driver - ensure endpoints exist
    if (driver.id === 'tuya') {
      if (!driver.zigbee?.endpoints) {
        driver.zigbee.endpoints = {
          "1": {
            "clusters": [0, 6],
            "bindings": [6]
          }
        };
        modified = true;
        console.log('✅ Added endpoints to tuya driver');
      }
    }
  }
  
  if (modified) {
    await fs.writeFile(appJsonPath, JSON.stringify(appJson, null, 2));
    console.log('\n✅ Applied validation fixes to app.json');
  } else {
    console.log('\n⚠️ No changes needed');
  }
}

if (require.main === module) {
  fixValidationErrors()
    .then(() => console.log('🎉 Validation error fixing completed'))
    .catch(console.error);
}

module.exports = { fixValidationErrors };
