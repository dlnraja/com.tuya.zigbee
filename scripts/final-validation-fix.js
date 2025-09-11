#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

async function fixRemainingValidationIssues() {
  console.log('🔧 FINAL VALIDATION FIX - Addressing remaining cluster issues...\n');
  
  const appJsonPath = path.join(process.cwd(), 'app.json');
  const content = await fs.readFile(appJsonPath, 'utf8');
  const appJson = JSON.parse(content);
  
  let modified = false;

  // Fix specific drivers with remaining issues
  for (const driver of appJson.drivers) {
    if (driver.id === 'TS0601_climate') {
      if (driver.zigbee?.endpoints?.['1']) {
        driver.zigbee.endpoints['1'].clusters = [513, 514, 1026];
        driver.zigbee.endpoints['1'].bindings = [513, 514, 1026];
        modified = true;
        console.log('✅ Fixed TS0601_climate');
      }
    }
    
    if (driver.id === 'sensors-TS0601_motion') {
      if (driver.zigbee?.endpoints?.['1']?.bindings) {
        // Convert report bindings to simple numbers where needed
        const fixedBindings = driver.zigbee.endpoints['1'].bindings.map(binding => {
          if (typeof binding === 'object' && binding.cluster) {
            return binding; // Keep report objects
          }
          return typeof binding === 'string' ? 1 : binding;
        });
        driver.zigbee.endpoints['1'].bindings = fixedBindings;
        modified = true;
        console.log('✅ Fixed sensors-TS0601_motion');
      }
    }
    
    if (driver.id === 'tuya_future_ai_device') {
      if (driver.zigbee?.endpoints?.['1']) {
        driver.zigbee.endpoints['1'].clusters = [0, 1, 6, 61184];
        driver.zigbee.endpoints['1'].bindings = [0, 1, 6];
        modified = true;
        console.log('✅ Fixed tuya_future_ai_device');
      }
    }
    
    if (driver.id === 'tuya_universal_adapter') {
      if (driver.zigbee?.endpoints?.['1']) {
        driver.zigbee.endpoints['1'].clusters = [0];
        driver.zigbee.endpoints['1'].bindings = [0];
        modified = true;
        console.log('✅ Fixed tuya_universal_adapter');
      }
    }
  }
  
  if (modified) {
    await fs.writeFile(appJsonPath, JSON.stringify(appJson, null, 2));
    console.log('\n✅ Applied final validation fixes');
  }
  
  return modified;
}

if (require.main === module) {
  fixRemainingValidationIssues()
    .then(() => console.log('🎉 Final validation fixes completed'))
    .catch(console.error);
}

module.exports = { fixRemainingValidationIssues };
