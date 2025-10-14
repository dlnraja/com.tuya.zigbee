#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * FIX INVALID SWITCH CLASS
 * Replace invalid "switch" class with correct Homey SDK3 classes
 */

async function fixInvalidSwitchClass() {
  console.log('🔧 FIXING INVALID SWITCH CLASS\n');
  
  const appJsonPath = path.join(__dirname, '../../app.json');
  const appJson = JSON.parse(await fs.readFile(appJsonPath, 'utf8'));
  
  let fixed = 0;
  
  for (const driver of appJson.drivers || []) {
    if (driver.class === 'switch') {
      const driverName = driver.id.toLowerCase();
      const capabilities = driver.capabilities || [];
      
      let newClass = 'socket'; // default
      
      // Determine correct class based on driver characteristics
      if (capabilities.includes('button.1') || 
          capabilities.includes('button.2') ||
          capabilities.includes('button.3') ||
          capabilities.includes('button.4') ||
          (capabilities.includes('measure_battery') && !capabilities.includes('onoff'))) {
        // Wireless buttons/scene controllers
        newClass = 'button';
      } else if (driverName.includes('wall') || 
                 driverName.includes('touch') ||
                 driverName.includes('relay') ||
                 (capabilities.includes('onoff') && !capabilities.includes('measure_battery'))) {
        // Wall switches, touch switches, relays (AC powered)
        newClass = 'socket';
      } else if (driverName.includes('roller') || 
                 driverName.includes('shutter') ||
                 capabilities.includes('windowcoverings_set')) {
        // Window covering controllers
        newClass = 'windowcoverings';
      } else if (capabilities.includes('measure_battery') && capabilities.includes('onoff')) {
        // Battery powered switches
        newClass = 'button';
      }
      
      console.log(`  ✅ ${driver.id}: switch → ${newClass}`);
      driver.class = newClass;
      fixed++;
    }
  }
  
  await fs.writeFile(appJsonPath, JSON.stringify(appJson, null, 2));
  
  console.log(`\n✅ Fixed ${fixed} drivers with invalid "switch" class`);
  
  return fixed;
}

fixInvalidSwitchClass().catch(console.error);
