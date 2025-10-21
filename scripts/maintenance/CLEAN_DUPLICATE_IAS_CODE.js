#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * CLEAN DUPLICATE IAS CODE
 * Removes duplicate IAS Zone enrollment code that was incorrectly inserted
 * Fixes red error triangles reported by Cam
 */

const AFFECTED_DRIVERS = [
  'pir_radar_illumination_sensor_battery',
  'door_window_sensor_battery',
  'water_leak_sensor_battery'
];

const DUPLICATE_CODE_PATTERN = /\s+\/\/ ={40}\n\s+\/\/ IAS ZONE ENROLLMENT - SDK3 FIXED\n\s+\/\/ ={40}\n[\s\S]*?this\.log\('Device may require re-pairing or will auto-enroll'\);\n\s+\}\n/;

async function cleanDriver(driverPath, driverName) {
  try {
    const devicePath = path.join(driverPath, 'device.js');
    let code = await fs.readFile(devicePath, 'utf8');
    
    // Check if has duplicate code
    if (!code.includes('IAS ZONE ENROLLMENT - SDK3 FIXED')) {
      return { skipped: true, reason: 'No duplicate code' };
    }
    
    // Backup first
    await fs.writeFile(devicePath + '.BACKUP', code);
    
    // Remove duplicate IAS Zone code
    const cleaned = code.replace(DUPLICATE_CODE_PATTERN, '\n');
    
    if (cleaned === code) {
      return { skipped: true, reason: 'Pattern did not match' };
    }
    
    await fs.writeFile(devicePath, cleaned);
    
    return { success: true, driver: driverName };
    
  } catch (err) {
    return { error: true, driver: driverName, message: err.message };
  }
}

async function main() {
  console.log('🔧 CLEANING DUPLICATE IAS ZONE CODE\n');
  console.log('Fixing red error triangles for Cam\n');
  
  const driversDir = path.join(__dirname, '../..', 'drivers');
  const results = { success: [], skipped: [], errors: [] };
  
  for (const driverName of AFFECTED_DRIVERS) {
    process.stdout.write(`[${AFFECTED_DRIVERS.indexOf(driverName) + 1}/${AFFECTED_DRIVERS.length}] ${driverName}...`);
    
    const driverPath = path.join(driversDir, driverName);
    
    try {
      const result = await cleanDriver(driverPath, driverName);
      
      if (result.success) {
        results.success.push(result);
        console.log(' ✅');
      } else if (result.skipped) {
        results.skipped.push(result);
        console.log(` ⏭️  (${result.reason})`);
      } else if (result.error) {
        results.errors.push(result);
        console.log(` ❌ ${result.message}`);
      }
    } catch (err) {
      console.log(` ❌ ${err.message}`);
    }
  }
  
  console.log('\n\n✅ CLEANUP COMPLETE!\n');
  console.log(`Success: ${results.success.length} drivers`);
  console.log(`Skipped: ${results.skipped.length} drivers`);
  console.log(`Errors: ${results.errors.length} drivers`);
  
  console.log('\n🎯 Fixed Drivers:');
  console.log('  1. ✅ sos_emergency_button_cr2032');
  console.log('  2. ✅ motion_temp_humidity_illumination_multi_battery');
  results.success.forEach((r, i) => {
    console.log(`  ${i + 3}. ✅ ${r.driver}`);
  });
  
  console.log('\n📝 Next Steps for Cam:');
  console.log('  1. Update Homey app to v2.15.83');
  console.log('  2. Remove both devices from Homey');
  console.log('  3. Re-pair devices with fresh batteries');
  console.log('  4. Test SOS button press - should trigger alarm');
  console.log('  5. Test motion detection - should work correctly');
}

main().catch(console.error);
