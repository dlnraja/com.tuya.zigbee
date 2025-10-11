#!/usr/bin/env node

/**
 * FIX ALL TUYA CLUSTER DRIVERS
 * Identifie et liste tous les drivers utilisant cluster Tuya 0xEF00 (61184)
 * Ces drivers ont besoin d'écouter les datapoints Tuya au lieu des clusters standards
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🔍 FINDING ALL TUYA CLUSTER DRIVERS\n');
console.log('='.repeat(70) + '\n');

const TUYA_CLUSTER = 61184; // 0xEF00

const results = {
  tuyaDrivers: [],
  needsFix: [],
  alreadyFixed: []
};

const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
  return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory();
});

console.log(`📊 Analyzing ${drivers.length} drivers...\n`);

drivers.forEach(driverName => {
  const manifestPath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  const devicePath = path.join(DRIVERS_DIR, driverName, 'device.js');
  
  if (!fs.existsSync(manifestPath)) return;
  
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Check if driver uses Tuya cluster
    if (manifest.zigbee && manifest.zigbee.endpoints) {
      Object.values(manifest.zigbee.endpoints).forEach(endpoint => {
        if (endpoint.clusters && endpoint.clusters.includes(TUYA_CLUSTER)) {
          results.tuyaDrivers.push(driverName);
          
          // Check if device.js exists and if it's using Tuya cluster properly
          if (fs.existsSync(devicePath)) {
            const deviceCode = fs.readFileSync(devicePath, 'utf8');
            
            if (deviceCode.includes('61184') || deviceCode.includes('0xEF00') || deviceCode.includes('tuyaCluster')) {
              results.alreadyFixed.push(driverName);
              console.log(`✅ ${driverName} - Already uses Tuya cluster`);
            } else {
              results.needsFix.push(driverName);
              console.log(`⚠️  ${driverName} - NEEDS FIX (uses cluster 61184 but not in code)`);
            }
          } else {
            console.log(`❌ ${driverName} - No device.js found`);
          }
        }
      });
    }
  } catch (err) {
    console.log(`❌ ${driverName}: ${err.message}`);
  }
});

console.log('\n' + '='.repeat(70));
console.log('\n📊 SUMMARY\n');
console.log(`Total Tuya drivers (cluster 61184): ${results.tuyaDrivers.length}`);
console.log(`Already fixed: ${results.alreadyFixed.length}`);
console.log(`Need fix: ${results.needsFix.length}`);

if (results.needsFix.length > 0) {
  console.log('\n⚠️  DRIVERS THAT NEED FIXING:\n');
  results.needsFix.forEach(driver => {
    console.log(`   - ${driver}`);
  });
}

// Save report
const report = {
  timestamp: new Date().toISOString(),
  tuyaCluster: TUYA_CLUSTER,
  summary: {
    total: results.tuyaDrivers.length,
    fixed: results.alreadyFixed.length,
    needsFix: results.needsFix.length
  },
  drivers: {
    all: results.tuyaDrivers,
    fixed: results.alreadyFixed,
    needsFix: results.needsFix
  },
  fixInstructions: {
    problem: 'Tuya devices use custom cluster 0xEF00 with datapoints instead of standard Zigbee clusters',
    solution: 'Listen to Tuya cluster datapoint reports and parse them correctly',
    datapoints: {
      common: {
        1: 'motion/alarm (bool)',
        2: 'battery (0-100)',
        4: 'temperature (int/10)',
        5: 'humidity (int)',
        9: 'illuminance (int lux)',
        101: 'smoke alarm (bool)',
        13: 'button press (enum)',
        14: 'battery_low (bool)'
      }
    },
    example: 'See: drivers/motion_temp_humidity_illumination_multi_battery/device.js'
  }
};

fs.writeFileSync(
  path.join(ROOT, 'reports', 'TUYA_CLUSTER_DRIVERS_REPORT.json'),
  JSON.stringify(report, null, 2)
);

console.log('\n📝 Report saved to reports/TUYA_CLUSTER_DRIVERS_REPORT.json');
console.log('\n💡 NEXT STEPS:');
console.log('1. Review drivers that need fixing');
console.log('2. Update device.js to listen to Tuya cluster');
console.log('3. Parse Tuya datapoints correctly');
console.log('4. Test with real devices');
console.log('\n🎯 This fixes the "No data coming through" issue!');
