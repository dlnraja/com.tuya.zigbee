'use strict';

/**
 * Analyze requested devices from GitHub issues and forum
 * Check if they are already supported in the app
 */

const fs = require('fs');
const path = require('path');

// Devices requested from Johan Bendz GitHub issues (New Device label)
const REQUESTED_DEVICES = [
  // From GitHub issues
  { mfr: '_TZE204_gkfbdvyx', model: 'TS0601', type: 'motion_sensor_radar', name: 'WenzhiIoT Smart Motion Sensor 24GHz mmWave', source: 'GH#1322' },
  { mfr: '_TZE200_ghynnvos', model: 'TS0601', type: 'motion_sensor', name: 'Tuya PIR', source: 'GH#1321' },
  { mfr: '_TZ3000_hy6ncvmw', model: 'TS0222', type: 'light_sensor', name: 'Smart Light Sensor', source: 'GH#1320' },
  { mfr: '_TZ3000_bgsigers', model: 'TS0201', type: 'temphumidsensor', name: 'Temperature & Humidity Sensor', source: 'GH#1318' },
  { mfr: '_TZE204_iaeejhvf', model: 'TS0601', type: 'presence_sensor_radar', name: 'Radar Sensor', source: 'GH#1314' },
  { mfr: '_TZ3210_dwytrmda', model: 'TS130F', type: 'curtain_motor', name: 'ZIGBEE Curtain Module 1CH', source: 'GH#1313' },

  // From Peter's climate sensor reports
  { mfr: '_TZE284_vvmbj46n', model: 'TS0601', type: 'climate_sensor', name: 'TH05Z Temperature Humidity LCD', source: 'Forum/Peter' },
  { mfr: '_TZE284_oitavov2', model: 'TS0601', type: 'soil_sensor', name: 'Soil Moisture Sensor', source: 'Forum/Peter' },

  // Popular devices from Z2M
  { mfr: '_TZE200_locansqn', model: 'TS0601', type: 'climate_sensor', name: 'TH05 Temperature Humidity', source: 'Z2M' },
  { mfr: '_TZE200_lve3dvpy', model: 'TS0601', type: 'climate_sensor', name: 'Temperature Humidity LCD', source: 'Z2M' },
  { mfr: '_TZE200_a8sdabtg', model: 'TS0601', type: 'climate_sensor', name: 'TH01 Temperature Humidity', source: 'Z2M' },
  { mfr: '_TZE200_pisltm67', model: 'TS0601', type: 'climate_sensor', name: 'TH05 Alt Temperature Humidity', source: 'Z2M' },

  // Motion sensors mmWave
  { mfr: '_TZE204_sxm7l9xa', model: 'TS0601', type: 'presence_sensor_radar', name: 'Human Presence Radar', source: 'Z2M' },
  { mfr: '_TZE200_ztc6ggyl', model: 'TS0601', type: 'presence_sensor_radar', name: 'mmWave Radar Presence', source: 'Z2M' },

  // Plugs & Energy
  { mfr: '_TZ3000_g5xawfcq', model: 'TS011F', type: 'plug_energy_monitor', name: 'Smart Plug 16A Energy', source: 'Popular' },
  { mfr: '_TZ3000_cehuw1lw', model: 'TS011F', type: 'plug_energy_monitor', name: 'Smart Plug Energy', source: 'Popular' },
];

// Read all driver.compose.json files and extract manufacturerNames
function getExistingManufacturers() {
  const driversDir = path.join(__dirname, '..', 'drivers');
  const drivers = fs.readdirSync(driversDir).filter(d =>
    fs.statSync(path.join(driversDir, d)).isDirectory()
  );

  const allMfrs = new Map();

  drivers.forEach(driverName => {
    const composePath = path.join(driversDir, driverName, 'driver.compose.json');
    if (!fs.existsSync(composePath)) return;

    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const zigbee = compose.zigbee;
      if (!zigbee) return;

      // Extract manufacturerName from productId entries
      if (Array.isArray(zigbee.productId)) {
        zigbee.productId.forEach(pid => {
          if (Array.isArray(pid.manufacturerName)) {
            pid.manufacturerName.forEach(mfr => {
              if (!allMfrs.has(mfr)) {
                allMfrs.set(mfr, []);
              }
              allMfrs.get(mfr).push({ driver: driverName, model: pid.productId });
            });
          }
        });
      }
    } catch (e) {
      // Skip invalid files
    }
  });

  return allMfrs;
}

// Main analysis
console.log('═══════════════════════════════════════════════════════════════');
console.log('  ANALYSIS: REQUESTED DEVICES vs SUPPORTED DEVICES');
console.log('═══════════════════════════════════════════════════════════════\n');

const existingMfrs = getExistingManufacturers();
console.log(`Total unique manufacturers in app: ${existingMfrs.size}\n`);

const supported = [];
const missing = [];

REQUESTED_DEVICES.forEach(device => {
  if (existingMfrs.has(device.mfr)) {
    const drivers = existingMfrs.get(device.mfr);
    supported.push({ ...device, drivers });
  } else {
    missing.push(device);
  }
});

console.log('✅ ALREADY SUPPORTED:');
console.log('───────────────────────────────────────────────────────────────');
supported.forEach(d => {
  console.log(`  ${d.mfr} (${d.model})`);
  console.log(`    → ${d.name} [${d.source}]`);
  console.log(`    → Drivers: ${d.drivers.map(dr => dr.driver).join(', ')}`);
});

console.log('\n❌ MISSING - NEED TO ADD:');
console.log('───────────────────────────────────────────────────────────────');
missing.forEach(d => {
  console.log(`  ${d.mfr} (${d.model})`);
  console.log(`    → ${d.name} [${d.source}]`);
  console.log(`    → Suggested driver: ${d.type}`);
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`SUMMARY: ${supported.length} supported, ${missing.length} missing`);
console.log('═══════════════════════════════════════════════════════════════\n');

// Output missing manufacturers for easy copy-paste
if (missing.length > 0) {
  console.log('MANUFACTURERS TO ADD (copy-paste ready):');
  console.log('───────────────────────────────────────────────────────────────');
  const byDriver = {};
  missing.forEach(d => {
    if (!byDriver[d.type]) byDriver[d.type] = [];
    byDriver[d.type].push(d);
  });

  Object.entries(byDriver).forEach(([driver, devices]) => {
    console.log(`\n${driver}:`);
    devices.forEach(d => {
      console.log(`  "${d.mfr}", // ${d.name} (${d.model}) [${d.source}]`);
    });
  });
}
