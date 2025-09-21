#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

async function definitiveValidationFix() {
  console.log('🎯 DEFINITIVE VALIDATION FIX - Final resolution...\n');
  
  const appJsonPath = path.join(process.cwd(), 'app.json');
  const content = await fs.readFile(appJsonPath, 'utf8');
  const appJson = JSON.parse(content);
  
  let modified = false;
  
  // Find and fix each problematic driver
  for (let i = 0; i < appJson.drivers.length; i++) {
    const driver = appJson.drivers[i];
    
    // Fix sensors-TS0601_motion driver
    if (driver.id === 'sensors-TS0601_motion') {
      if (driver.zigbee && driver.zigbee.endpoints && driver.zigbee.endpoints['1']) {
        // Ensure bindings are simple numeric array
        driver.zigbee.endpoints['1'].bindings = [1026, 1];
        modified = true;
        console.log('✅ Fixed sensors-TS0601_motion bindings to [1026, 1]');
      }
    }
    
    // Fix tuya driver - ensure it has endpoints
    if (driver.id === 'tuya') {
      if (!driver.zigbee) {
        driver.zigbee = {};
      }
      
      if (!driver.zigbee.endpoints) {
        driver.zigbee.endpoints = {
          "1": {
            "clusters": [0, 6],
            "bindings": [6]
          }
        };
        modified = true;
        console.log('✅ Added endpoints to tuya driver');
      }
      
      // Ensure manufacturerName and productId exist
      if (!driver.zigbee.manufacturerName) {
        driver.zigbee.manufacturerName = ["Tuya"];
        modified = true;
      }
      if (!driver.zigbee.productId) {
        driver.zigbee.productId = ["GENERIC"];
        modified = true;
      }
    }
  }
  
  // Save the file if modified
  if (modified) {
    await fs.writeFile(appJsonPath, JSON.stringify(appJson, null, 2));
    console.log('💾 Saved fixed app.json');
  }
  
  // Verify all fixes
  console.log('\n🔍 Verification:');
  const verification = JSON.parse(await fs.readFile(appJsonPath, 'utf8'));
  
  let issuesRemaining = 0;
  
  for (const driver of verification.drivers) {
    if (driver.id === 'sensors-TS0601_motion') {
      const bindings = driver.zigbee?.endpoints?.['1']?.bindings;
      if (Array.isArray(bindings) && bindings.every(b => typeof b === 'number')) {
        console.log('✅ sensors-TS0601_motion: bindings are numeric');
      } else {
        console.log('❌ sensors-TS0601_motion: bindings still invalid:', bindings);
        issuesRemaining++;
      }
    }
    
    if (driver.id === 'tuya') {
      if (driver.zigbee?.endpoints) {
        console.log('✅ tuya: has endpoints');
      } else {
        console.log('❌ tuya: missing endpoints');
        issuesRemaining++;
      }
    }
  }
  
  if (issuesRemaining === 0) {
    console.log('\n🎉 All validation issues resolved!');
    return true;
  } else {
    console.log(`\n⚠️ ${issuesRemaining} issues still remain`);
    return false;
  }
}

if (require.main === module) {
  definitiveValidationFix()
    .then((success) => {
      if (success) {
        console.log('\n🚀 Validation should now pass!');
        process.exit(0);
      } else {
        console.log('\n❌ Some issues persist');
        process.exit(1);
      }
    })
    .catch(console.error);
}

module.exports = { definitiveValidationFix };
