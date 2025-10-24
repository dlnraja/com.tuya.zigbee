#!/usr/bin/env node
'use strict';

/**
 * FIX MOTION SENSOR IAS ZONE
 * 
 * Corrige les motion sensors qui n'ont pas IASZoneEnroller
 * Suite au check de cohérence qui a détecté:
 * - motion_sensor_pir_battery: Pas d'IASZoneEnroller
 * 
 * Usage: node scripts/fixes/fix-motion-sensor-ias-zone.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🔧 FIX MOTION SENSOR IAS ZONE\n');

const MOTION_SENSOR_TEMPLATE = `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');

class MotionSensorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Motion sensor initialized');

    // IAS Zone Enrollment (CRITICAL for motion detection)
    if (this.hasCapability('alarm_motion')) {
      try {
        this.iasZoneEnroller = new IASZoneEnroller(this, this.zclNode.endpoints[1], {
          capability: 'alarm_motion',
          zoneType: 13, // Motion sensor
          autoResetTimeout: 30000 // 30 seconds
        });
        
        const enrollResult = await this.iasZoneEnroller.enroll(zclNode);
        this.log('IAS Zone enrollment:', enrollResult);
      } catch (err) {
        this.error('IAS Zone enrollment failed:', err);
      }
    }

    // Register battery capability
    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        reportParser: value => value / 2,
        getOpts: {
          getOnStart: true,
        },
      });
    }

    // Mark device as available
    await this.setAvailable();
  }

  async onDeleted() {
    this.log('Motion sensor deleted');
    
    if (this.iasZoneEnroller) {
      this.iasZoneEnroller.destroy();
    }
  }

}

module.exports = MotionSensorDevice;
`;

// =============================================================================
// FIX MOTION_SENSOR_PIR_BATTERY
// =============================================================================

console.log('📋 Fixing motion_sensor_pir_battery...\n');

const pirBatteryPath = path.join(DRIVERS_DIR, 'motion_sensor_pir_battery');
const pirBatteryDeviceJs = path.join(pirBatteryPath, 'device.js');

if (fs.existsSync(pirBatteryDeviceJs)) {
  const content = fs.readFileSync(pirBatteryDeviceJs, 'utf8');
  
  if (!content.includes('IASZoneEnroller')) {
    console.log('❌ No IASZoneEnroller found');
    console.log('✅ Writing new device.js with IASZoneEnroller...');
    
    fs.writeFileSync(pirBatteryDeviceJs, MOTION_SENSOR_TEMPLATE, 'utf8');
    console.log('✅ device.js updated with IAS Zone support');
  } else {
    console.log('✅ IASZoneEnroller already present');
  }
} else {
  console.log('❌ device.js not found');
}

// =============================================================================
// FIX MOTION_SENSOR_PIR_AC_BATTERY (syntax errors)
// =============================================================================

console.log('\n📋 Fixing motion_sensor_pir_ac_battery...\n');

const pirAcBatteryPath = path.join(DRIVERS_DIR, 'motion_sensor_pir_ac_battery');
const pirAcBatteryDeviceJs = path.join(pirAcBatteryPath, 'device.js');

if (fs.existsSync(pirAcBatteryDeviceJs)) {
  const content = fs.readFileSync(pirAcBatteryDeviceJs, 'utf8');
  
  // Check for syntax errors
  if (content.includes('catch (err) {') && !content.includes('try {')) {
    console.log('❌ Syntax error: catch without try');
    console.log('✅ Fixing syntax errors...');
    
    // Remove orphan catch block
    const fixed = String(content).replace(/\n\s+catch \(err\) \{[\s\S]*?\n\s+\}\n\s+\}\n/, '\n}\n');
    fs.writeFileSync(pirAcBatteryDeviceJs, fixed, 'utf8');
    console.log('✅ Syntax errors fixed');
  }
  
  // Check if has IAS Zone
  if (!content.includes('IASZoneEnroller') && !content.includes('TuyaClusterHandler')) {
    console.log('⚠️  No IAS Zone or Tuya handler - may need manual review');
  } else {
    console.log('✅ Has motion detection implementation');
  }
} else {
  console.log('❌ device.js not found');
}

// =============================================================================
// CHECK OTHER MOTION SENSORS
// =============================================================================

console.log('\n' + '='.repeat(80));
console.log('📊 CHECKING ALL MOTION SENSORS');
console.log('='.repeat(80) + '\n');

const motionDrivers = [
  'motion_sensor_battery',
  'motion_sensor_illuminance_battery',
  'motion_sensor_mmwave_battery',
  'motion_sensor_pir_battery',
  'motion_sensor_pir_ac_battery',
  'motion_sensor_zigbee_204z_battery',
  'motion_temp_humidity_illumination_multi_battery',
  'radar_motion_sensor_advanced_battery',
  'radar_motion_sensor_mmwave_battery'
];

let stats = {
  total: 0,
  hasIASZone: 0,
  hasTuya: 0,
  missing: 0
};

for (const driverName of motionDrivers) {
  const driverPath = path.join(DRIVERS_DIR, driverName);
  const deviceJs = path.join(driverPath, 'device.js');
  
  if (!fs.existsSync(driverPath)) {
    console.log(`⚠️  ${driverName}: Driver not found`);
    continue;
  }
  
  stats.total++;
  
  if (fs.existsSync(deviceJs)) {
    const content = fs.readFileSync(deviceJs, 'utf8');
    
    const hasIAS = content.includes('IASZoneEnroller');
    const hasTuya = content.includes('TuyaClusterHandler');
    
    if (hasIAS) {
      stats.hasIASZone++;
      console.log(`✅ ${driverName}: IAS Zone`);
    } else if (hasTuya) {
      stats.hasTuya++;
      console.log(`✅ ${driverName}: Tuya (may have motion via DP)`);
    } else {
      stats.missing++;
      console.log(`❌ ${driverName}: No motion detection implementation!`);
    }
  } else {
    stats.missing++;
    console.log(`❌ ${driverName}: device.js missing!`);
  }
}

// =============================================================================
// SUMMARY
// =============================================================================

console.log('\n' + '='.repeat(80));
console.log('📊 SUMMARY');
console.log('='.repeat(80));

console.log(`\nMotion sensors checked: ${stats.total}`);
console.log(`  ✅ With IAS Zone: ${stats.hasIASZone}`);
console.log(`  ✅ With Tuya handler: ${stats.hasTuya}`);
console.log(`  ❌ Missing implementation: ${stats.missing}`);

if (stats.missing === 0) {
  console.log('\n✅ All motion sensors have motion detection implementation!');
} else {
  console.log(`\n⚠️  ${stats.missing} motion sensors need implementation`);
}

console.log('\n' + '='.repeat(80));
console.log('Fix complete!');
console.log('='.repeat(80));

process.exit(0);
