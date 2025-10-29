#!/usr/bin/env node
'use strict';

/**
 * Fix 12 drivers with missing manufacturerName
 * Adds appropriate manufacturerName arrays based on productId
 */

const fs = require('fs');
const path = require('path');

// Manufacturer mappings by productId and device type
const MANUFACTURER_DB = {
  // TS0001/TS0002 - Switches/Modules
  'TS0001': ['_TZ3000_qzjcsmar', '_TZ3000_ji4araar', '_TZ3000_tqlv4ug4'],
  'TS0002': ['_TZ3000_h1ipgkwn', '_TZ3000_w0qqde0g', '_TZ3000_gjnozsaz'],
  
  // TS0201 - Climate sensors
  'TS0201': ['_TZ3000_zl1kmjqx', '_TZ3000_yd2e749y', '_TZ3000_fllyghyj'],
  
  // TS0601 - Tuya specialized (by device type)
  'TS0601_air_quality': ['_TZE200_dwcarsat', '_TZE200_ryfmq5rl', '_TZE284_sgabhwa6'],
  'TS0601_ceiling_fan': ['_TZE200_eevqq1uv', '_TZE200_3towulqd', '_TZE284_1emhi5mm'],
  'TS0601_gateway': ['_TZE200_bjzrowv2', '_TZE200_vm1gyrso'],
  'TS0601_humidity': ['_TZE200_locansqn', '_TZE200_bjawzodf', '_TZE284_aagrxlbd'],
  'TS0601_lock': ['_TZE200_bmzphld8', '_TZE200_eaac7dkw'],
  'TS0601_radiator': ['_TZE200_b6wax7g0', '_TZE200_9gvruqf5', '_TZE284_aao6qtcs'],
  'TS0601_shutter': ['_TZE200_fctwhugx', '_TZE200_cowvfni3', '_TZE200_zpzndjez'],
  'TS0601_solar': ['_TZE200_lsanae15', '_TZE284_sgabhwa6'],
  'TS0601_sound': ['_TZE200_9yapgbuv', '_TZE284_rccgwzz8'],
  'TS0601_thermostat': ['_TZE200_cwbvmsar', '_TZE200_locansqn', '_TZE284_aagrxlbd'],
  
  // TS130F - Curtains
  'TS130F': ['_TZE200_fctwhugx', '_TZE200_cowvfni3', '_TZ3000_vd43bbfq'],
};

const FIXES = [
  { driver: 'module_mini', ids: ['TS0001', 'TS0002'], type: 'switch' },
  { driver: 'humidity_controller', ids: ['TS0201', 'TS0601_humidity'], type: 'climate' },
  { driver: 'thermostat_temperature_control', ids: ['TS0201', 'TS0601_thermostat'], type: 'climate' },
  { driver: 'air_quality_pm25', ids: ['TS0601_air_quality'], type: 'sensor' },
  { driver: 'ceiling_fan', ids: ['TS0601_ceiling_fan'], type: 'fan' },
  { driver: 'gateway_zigbee_hub', ids: ['TS0601_gateway'], type: 'other' },
  { driver: 'lock_smart_fingerprint', ids: ['TS0601_lock'], type: 'lock' },
  { driver: 'radiator_valve_smart', ids: ['TS0601_radiator'], type: 'thermostat' },
  { driver: 'shutter_roller_controller', ids: ['TS130F', 'TS0601_shutter'], type: 'curtain' },
  { driver: 'solar_panel_controller', ids: ['TS0601_solar'], type: 'sensor' },
  { driver: 'sound_controller', ids: ['TS0601_sound'], type: 'other' },
  { driver: 'thermostat_smart', ids: ['TS0601_thermostat'], type: 'thermostat' },
];

const driversDir = path.join(__dirname, '..', 'drivers');
let fixed = 0;
let errors = 0;

console.log('🔧 Fixing 12 drivers with manufacturerName arrays...\n');

FIXES.forEach(fix => {
  const driverPath = path.join(driversDir, fix.driver);
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    console.log(`❌ ${fix.driver}: driver.compose.json not found`);
    errors++;
    return;
  }
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    // Collect all manufacturerNames for this driver
    const manufacturers = new Set();
    fix.ids.forEach(id => {
      const mfgs = MANUFACTURER_DB[id] || [];
      mfgs.forEach(mfg => manufacturers.add(mfg));
    });
    
    if (manufacturers.size === 0) {
      console.log(`⚠️  ${fix.driver}: No manufacturers found for ${fix.ids.join(', ')}`);
      return;
    }
    
    // Update zigbee.manufacturerName
    if (!compose.zigbee) compose.zigbee = {};
    compose.zigbee.manufacturerName = Array.from(manufacturers);
    
    // Write back
    fs.writeFileSync(composePath, JSON.stringify(compose, null, 2) + '\n');
    
    console.log(`✅ ${fix.driver}: Added ${manufacturers.size} manufacturers`);
    console.log(`   → ${Array.from(manufacturers).join(', ')}\n`);
    
    fixed++;
    
  } catch (err) {
    console.log(`❌ ${fix.driver}: ${err.message}`);
    errors++;
  }
});

console.log('='.repeat(80));
console.log(`📊 RESULTS: ${fixed} fixed, ${errors} errors`);
console.log('='.repeat(80));

process.exit(errors > 0 ? 1 : 0);
