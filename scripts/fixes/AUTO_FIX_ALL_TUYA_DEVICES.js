#!/usr/bin/env node

/**
 * AUTO FIX ALL TUYA DEVICES
 * 
 * Automatically updates all device.js files that use Tuya cluster
 * to use the universal TuyaClusterHandler
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const TUYA_CLUSTER = 61184;

console.log('🔧 AUTO-FIXING ALL TUYA CLUSTER DEVICES\n');
console.log('='.repeat(70) + '\n');

// Template for updated device.js
const DEVICE_TEMPLATE = `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const TuyaClusterHandler = require('../../utils/tuya-cluster-handler');

class {{CLASS_NAME}} extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('{{DEVICE_NAME}} initialized');

    // Call parent
    await super.onNodeInit({ zclNode });

    // Auto-detect device type and initialize Tuya cluster handler
    const deviceType = TuyaClusterHandler.detectDeviceType('{{DRIVER_ID}}');
    const tuyaInitialized = await TuyaClusterHandler.init(this, zclNode, deviceType);
    
    if (tuyaInitialized) {
      this.log('✅ Tuya cluster handler initialized for type:', deviceType);
    } else {
      this.log('⚠️  No Tuya cluster found, using standard Zigbee');
      
      // Fallback to standard cluster handling if needed
      await this.registerStandardCapabilities();
    }

    // Mark device as available
    await this.setAvailable();
  }

  /**
   * Register standard Zigbee capabilities (fallback)
   */
  async registerStandardCapabilities() {
    // Battery
    if (this.hasCapability('measure_battery')) {
      try {
        this.registerCapability('measure_battery', 'genPowerCfg', {
          get: 'batteryPercentageRemaining',
          report: 'batteryPercentageRemaining',
          reportParser: value => Math.max(0, Math.min(100, value / 2)),
          getParser: value => Math.max(0, Math.min(100, value / 2))
        });
      } catch (err) {
        this.log('Could not register battery capability:', err.message);
      }
    }
  }

  async onDeleted() {
    this.log('{{DEVICE_NAME}} deleted');
  }

}

module.exports = {{CLASS_NAME}};
`;

const stats = {
  total: 0,
  updated: 0,
  skipped: 0,
  errors: []
};

// Read report from previous analysis
const reportPath = path.join(ROOT, 'reports', 'TUYA_CLUSTER_DRIVERS_REPORT.json');
let driversToFix = [];

if (fs.existsSync(reportPath)) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  driversToFix = report.drivers.needsFix || [];
  console.log(`📊 Found ${driversToFix.length} drivers to fix from report\n`);
} else {
  console.log('⚠️  No report found, scanning all drivers...\n');
  
  // Scan for drivers with Tuya cluster
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
    return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory();
  });
  
  drivers.forEach(driverName => {
    const manifestPath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        if (manifest.zigbee && manifest.zigbee.endpoints) {
          Object.values(manifest.zigbee.endpoints).forEach(endpoint => {
            if (endpoint.clusters && endpoint.clusters.includes(TUYA_CLUSTER)) {
              driversToFix.push(driverName);
            }
          });
        }
      } catch (err) {
        // Skip
      }
    }
  });
}

stats.total = driversToFix.length;

console.log(`🔧 Fixing ${stats.total} drivers...\n`);

driversToFix.forEach(driverName => {
  const devicePath = path.join(DRIVERS_DIR, driverName, 'device.js');
  
  if (!fs.existsSync(devicePath)) {
    console.log(`⚠️  ${driverName}: No device.js found, skipping`);
    stats.skipped++;
    return;
  }
  
  try {
    // Read existing device.js to check if already using TuyaClusterHandler
    const existingCode = fs.readFileSync(devicePath, 'utf8');
    
    if (existingCode.includes('TuyaClusterHandler')) {
      console.log(`✅ ${driverName}: Already using TuyaClusterHandler`);
      stats.skipped++;
      return;
    }
    
    // Generate class name from driver name
    const className = driverName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('') + 'Device';
    
    // Generate new device.js code
    const newCode = DEVICE_TEMPLATE
      .replace(/{{CLASS_NAME}}/g, className)
      .replace(/{{DEVICE_NAME}}/g, driverName)
      .replace(/{{DRIVER_ID}}/g, driverName);
    
    // Backup original
    const backupPath = devicePath + '.backup-auto';
    fs.copyFileSync(devicePath, backupPath);
    
    // Write new code
    fs.writeFileSync(devicePath, newCode, 'utf8');
    
    console.log(`✅ ${driverName}: Updated successfully`);
    stats.updated++;
    
  } catch (err) {
    console.log(`❌ ${driverName}: ${err.message}`);
    stats.errors.push({ driver: driverName, error: err.message });
  }
});

console.log('\n' + '='.repeat(70));
console.log('\n📊 SUMMARY\n');
console.log(`Total drivers: ${stats.total}`);
console.log(`Updated: ${stats.updated}`);
console.log(`Skipped: ${stats.skipped}`);
console.log(`Errors: ${stats.errors.length}`);

if (stats.errors.length > 0) {
  console.log('\n❌ ERRORS:\n');
  stats.errors.forEach(({ driver, error }) => {
    console.log(`   ${driver}: ${error}`);
  });
}

// Save summary
const summary = {
  timestamp: new Date().toISOString(),
  stats,
  errors: stats.errors
};

fs.writeFileSync(
  path.join(ROOT, 'reports', 'TUYA_AUTO_FIX_SUMMARY.json'),
  JSON.stringify(summary, null, 2)
);

console.log('\n📝 Summary saved to reports/TUYA_AUTO_FIX_SUMMARY.json');
console.log('\n✅ DONE! All drivers updated to use TuyaClusterHandler');
console.log('\n💡 TIP: Test devices to ensure data is flowing correctly');
console.log('⚠️  Backup files saved as *.backup-auto (can be deleted if all works)');
