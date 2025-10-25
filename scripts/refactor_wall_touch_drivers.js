#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * REFACTOR WALL TOUCH DRIVERS - Automated SDK3 Migration
 * 
 * Converts all 8 wall_touch drivers from SDK2 to SDK3:
 * - Removes registerCapability()
 * - Removes registerMultipleCapabilityListener()
 * - Uses new WallTouchDevice base class
 */

console.log('\n🔧 WALL TOUCH DRIVERS - SDK3 REFACTOR\n');
console.log('='.repeat(80));

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

const WALL_TOUCH_DRIVERS = [
  { name: 'wall_touch_1gang', buttons: 1 },
  { name: 'wall_touch_2gang', buttons: 2 },
  { name: 'wall_touch_3gang', buttons: 3 },
  { name: 'wall_touch_4gang', buttons: 4 },
  { name: 'wall_touch_5gang', buttons: 5 },
  { name: 'wall_touch_6gang', buttons: 6 },
  { name: 'wall_touch_7gang', buttons: 7 },
  { name: 'wall_touch_8gang', buttons: 8 }
];

/**
 * Generate SDK3 device.js content
 */
function generateDeviceJs(buttons) {
  return `'use strict';

const WallTouchDevice = require('../../lib/WallTouchDevice');

/**
 * Wall Touch Button ${buttons} Gang - SDK3 Compliant
 * 
 * Features:
 * - ${buttons}-gang button control
 * - Button combination detection
 * - Temperature monitoring (if supported)
 * - Tamper detection (if supported)
 * - Battery vs AC auto-detection
 * - 100% SDK3 compliant (no deprecated APIs)
 */
class WallTouch${buttons}GangDevice extends WallTouchDevice {

  async onNodeInit() {
    this.log('🎨 WallTouch${buttons}Gang initializing...');
    
    // Set button count (required by base class)
    this.buttonCount = ${buttons};
    
    // Initialize via SDK3 base class
    await super.onNodeInit();
    
    this.log('✅ WallTouch${buttons}Gang ready (SDK3)');
  }
}

module.exports = WallTouch${buttons}GangDevice;
`;
}

/**
 * Refactor a single driver
 */
function refactorDriver(driver) {
  const driverPath = path.join(DRIVERS_DIR, driver.name);
  const devicePath = path.join(driverPath, 'device.js');
  
  console.log(`\n🔧 Refactoring: ${driver.name}`);
  
  // Check if driver exists
  if (!fs.existsSync(devicePath)) {
    console.log(`   ⚠️  device.js not found, skipping`);
    return false;
  }
  
  // Backup original
  const backupPath = devicePath + '.backup-sdk3-refactor.' + Date.now();
  fs.copyFileSync(devicePath, backupPath);
  console.log(`   💾 Backup created: ${path.basename(backupPath)}`);
  
  // Generate new SDK3 code
  const newContent = generateDeviceJs(driver.buttons);
  
  // Write new file
  fs.writeFileSync(devicePath, newContent, 'utf8');
  console.log(`   ✅ device.js refactored to SDK3`);
  console.log(`   📝 ${driver.buttons} button(s) configured`);
  
  return true;
}

/**
 * Main refactor function
 */
function refactorAllDrivers() {
  let success = 0;
  let failed = 0;
  
  console.log(`\n📋 Refactoring ${WALL_TOUCH_DRIVERS.length} drivers...\n`);
  
  for (const driver of WALL_TOUCH_DRIVERS) {
    if (refactorDriver(driver)) {
      success++;
    } else {
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 REFACTOR COMPLETE\n');
  console.log(`✅ Success: ${success} drivers`);
  console.log(`❌ Failed: ${failed} drivers`);
  
  if (success > 0) {
    console.log('\n📝 CHANGES MADE:');
    console.log('   - Removed registerCapability() (SDK2)');
    console.log('   - Removed registerMultipleCapabilityListener() (SDK2)');
    console.log('   - Now extends WallTouchDevice (SDK3)');
    console.log('   - Direct cluster listeners implemented');
    console.log('   - Debounced button combinations');
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('   1. Run: homey app validate --level publish');
    console.log('   2. Run: node scripts/scan_deprecations.js');
    console.log('   3. Test: pair device and test buttons');
    console.log('   4. Commit: git commit -m "feat: SDK3 wall_touch drivers"');
    console.log('   5. Push: git push origin master');
  }
  
  console.log('\n' + '='.repeat(80) + '\n');
  
  return { success, failed };
}

// Run refactor
try {
  const result = refactorAllDrivers();
  
  if (result.success > 0) {
    process.exit(0);
  } else {
    console.error('❌ No drivers refactored');
    process.exit(1);
  }
} catch (err) {
  console.error('\n❌ Refactor failed:', err.message);
  console.error(err.stack);
  process.exit(1);
}
