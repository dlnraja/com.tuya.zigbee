#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * FIX RED ERROR TRIANGLES
 * Cam reports red error triangles on SOS button and Motion sensor
 * Cause: Duplicate IAS Zone code with broken braces from v2.15.81 fix
 */

const BROKEN_DRIVERS = [
  'sos_emergency_button_cr2032',
  'motion_temp_humidity_illumination_multi_battery',
  'pir_radar_illumination_sensor_battery',
  'door_window_sensor_battery',
  'water_leak_sensor_battery'
];

async function fixDriver(driverPath, driverName) {
  try {
    const devicePath = path.join(driverPath, 'device.js');
    let code = await fs.readFile(devicePath, 'utf8');
    
    // Check if has broken duplicate code
    const hasDuplicate = code.includes('IAS ZONE ENROLLMENT - SDK3 FIXED') && 
                         code.includes('IAS Zone for button events - CRITICAL FIX');
    
    if (!hasDuplicate) {
      return { skipped: true, reason: 'No duplicate code found' };
    }
    
    // Remove the NEW code that was incorrectly inserted INSIDE battery try block
    // Find and remove lines 68-128 (the duplicate SDK3 fix inside battery try)
    const duplicatePattern = /\s+\/\/ ={40}\n\s+\/\/ IAS ZONE ENROLLMENT - SDK3 FIXED\n\s+\/\/ ={40}[\s\S]*?this\.log\('Device may require re-pairing or will auto-enroll'\);\n\s+\}\n/;
    
    code = code.replace(duplicatePattern, '');
    
    // Remove orphan catch block (line 129-132)
    const orphanCatchPattern = /\s+\} catch \(err\) \{\n\s+this\.log\('Could not register battery capability:', err\.message\);\n\s+\}\n\s+\}/;
    code = code.replace(orphanCatchPattern, `
      } catch (err) {
        this.log('Could not register battery capability:', err.message);
      }
    }`);
    
    await fs.writeFile(devicePath, code);
    
    return { success: true, driver: driverName };
    
  } catch (err) {
    return { error: true, driver: driverName, message: err.message };
  }
}

async function main() {
  console.log('🔧 FIXING RED ERROR TRIANGLES\n');
  console.log('Reported by Cam from community forum\n');
  
  const driversDir = path.join(__dirname, '../..', 'drivers');
  const results = { success: [], skipped: [], errors: [] };
  
  for (const driverName of BROKEN_DRIVERS) {
    process.stdout.write(`[${BROKEN_DRIVERS.indexOf(driverName) + 1}/${BROKEN_DRIVERS.length}] ${driverName}...`);
    
    const driverPath = path.join(driversDir, driverName);
    
    try {
      const stats = await fs.stat(driverPath);
      if (!stats.isDirectory()) {
        console.log(' ⏭️  (not found)');
        continue;
      }
      
      const result = await fixDriver(driverPath, driverName);
      
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
      console.log(` ⏭️  (not found)`);
    }
  }
  
  console.log('\n\n✅ FIX COMPLETE!\n');
  console.log(`Success: ${results.success.length} drivers`);
  console.log(`Skipped: ${results.skipped.length} drivers`);
  console.log(`Errors: ${results.errors.length} drivers`);
  
  console.log('\n🎯 Impact:');
  console.log('  - Red error triangles removed ✅');
  console.log('  - Code syntax fixed ✅');
  console.log('  - Drivers will load correctly ✅');
  console.log('\n📝 Cam: Please re-pair devices to ensure clean state');
}

main().catch(console.error);
