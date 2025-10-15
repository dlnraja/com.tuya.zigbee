#!/usr/bin/env node

/**
 * HOTFIX: Fix CLUSTER.POWER_CONFIGURATION reference
 * Replace with 'genPowerCfg' string
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🔧 HOTFIX: Fixing CLUSTER reference bug\n');
console.log('='.repeat(70) + '\n');

const stats = {
  total: 0,
  fixed: 0,
  skipped: 0
};

const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
  return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory();
});

drivers.forEach(driverName => {
  const devicePath = path.join(DRIVERS_DIR, driverName, 'device.js');
  
  if (!fs.existsSync(devicePath)) return;
  
  try {
    let content = fs.readFileSync(devicePath, 'utf8');
    
    // Check if file has the bug
    if (content.includes('CLUSTER.POWER_CONFIGURATION')) {
      stats.total++;
      
      // Fix the bug
      content = content.replace(
        /this\.registerCapability\('measure_battery', CLUSTER\.POWER_CONFIGURATION,/g,
        "this.registerCapability('measure_battery', 'genPowerCfg',"
      );
      
      // Also remove unused CLUSTER import if present
      content = content.replace(
        /const { CLUSTER } = require\('zigbee-clusters'\);\n/g,
        ''
      );
      
      // Write fixed content
      fs.writeFileSync(devicePath, content, 'utf8');
      
      console.log(`✅ ${driverName}`);
      stats.fixed++;
    }
    
  } catch (err) {
    console.log(`❌ ${driverName}: ${err.message}`);
  }
});

console.log('\n' + '='.repeat(70));
console.log('\n📊 HOTFIX SUMMARY\n');
console.log(`Drivers with bug: ${stats.total}`);
console.log(`Fixed: ${stats.fixed}`);

console.log('\n✅ HOTFIX COMPLETE!');
