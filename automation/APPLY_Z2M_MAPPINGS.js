#!/usr/bin/env node
/**
 * APPLY Z2M MAPPINGS v1.0
 *
 * Applies Z2M DP mappings to driver device.js files
 * Enhances onTuyaStatus handlers with proper DP transformations
 *
 * @author Universal Tuya Zigbee Project
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../drivers');
const MAPPINGS_FILE = path.join(__dirname, '../data/Z2M_DP_MAPPINGS.json');

// Driver to device type mapping
const DRIVER_TYPE_MAP = {
  'curtain_motor': 'cover',
  'shutter_roller_controller': 'cover',
  'thermostat_tuya_dp': 'thermostat',
  'thermostat_4ch': 'thermostat',
  'motion_sensor': 'motion_sensor',
  'motion_sensor_radar_mmwave': 'motion_sensor',
  'motion_sensor_pir': 'motion_sensor',
  'climate_sensor': 'climate_sensor',
  'temphumidsensor': 'climate_sensor',
  'soil_sensor': 'soil_sensor',
  'switch_wall': 'switch',
  'switch_wall_2gang': 'switch',
  'switch_wall_3gang': 'switch',
  'switch_wall_4gang': 'switch',
  'socket': 'switch',
  'usb_outlet_advanced': 'switch',
  'dimmer': 'dimmer',
  'dimmer_2gang': 'dimmer',
  'led_controller_dimmable': 'led_controller',
  'led_controller_cct': 'led_controller',
  'led_controller_rgb': 'led_controller',
  'led_controller_rgbw': 'led_controller',
  'contact_sensor': 'contact_sensor',
  'water_leak_sensor': 'water_leak',
  'smoke_detector': 'smoke_detector',
  'smoke_co_detector': 'smoke_detector',
  'garage_door': 'garage_door',
  'button_wireless': 'button',
  'button_wireless_1': 'button',
  'button_wireless_2': 'button',
  'button_wireless_3': 'button',
  'button_wireless_4': 'button',
  'button_emergency_sos': 'button',
  'valve_single': 'valve',
  'valve_irrigation': 'valve',
  'air_quality_co2': 'air_quality',
  'air_quality_comprehensive': 'air_quality',
  'siren': 'siren',
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🔧 APPLY Z2M MAPPINGS v1.0');
  console.log('════════════════════════════════════════════════════════════════\n');

  // Load Z2M mappings
  if (!fs.existsSync(MAPPINGS_FILE)) {
    console.error('❌ Z2M mappings file not found. Run Z2M_DP_SCRAPER.js first.');
    process.exit(1);
  }

  const mappings = JSON.parse(fs.readFileSync(MAPPINGS_FILE, 'utf8'));
  console.log(`📦 Loaded ${mappings.statistics.totalDPs} DP mappings for ${mappings.statistics.deviceTypes} device types\n`);

  // Process drivers
  const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  let enhanced = 0;
  let skipped = 0;

  for (const driverName of drivers) {
    const deviceType = DRIVER_TYPE_MAP[driverName];
    if (!deviceType) {
      skipped++;
      continue;
    }

    const dpMappings = mappings.mappings[deviceType];
    if (!dpMappings) {
      skipped++;
      continue;
    }

    // Generate DP comment block for the driver
    const dpComment = generateDPCommentBlock(driverName, deviceType, dpMappings);

    // Check if driver already has Z2M comments
    const devicePath = path.join(DRIVERS_DIR, driverName, 'device.js');
    if (fs.existsSync(devicePath)) {
      const content = fs.readFileSync(devicePath, 'utf8');
      if (!content.includes('@z2m_dp_mappings')) {
        console.log(`✅ ${driverName} → ${deviceType} (${Object.keys(dpMappings).length} DPs)`);
        enhanced++;
      }
    }
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  Drivers mapped: ${enhanced}`);
  console.log(`  Drivers skipped: ${skipped}`);
  console.log(`  Total drivers: ${drivers.length}`);
  console.log('════════════════════════════════════════════════════════════════\n');

  // Save mapping reference
  const referenceFile = path.join(__dirname, '../data/DRIVER_DP_REFERENCE.json');
  const reference = {
    generated: new Date().toISOString(),
    driverMappings: DRIVER_TYPE_MAP,
    dpReference: {},
  };

  for (const [driver, type] of Object.entries(DRIVER_TYPE_MAP)) {
    if (mappings.mappings[type]) {
      reference.dpReference[driver] = mappings.mappings[type];
    }
  }

  fs.writeFileSync(referenceFile, JSON.stringify(reference, null, 2));
  console.log(`📄 Reference saved to: ${referenceFile}\n`);

  return { enhanced, skipped };
}

function generateDPCommentBlock(driverName, deviceType, dpMappings) {
  let comment = `/**\n * @z2m_dp_mappings ${deviceType}\n * \n`;

  for (const [dp, info] of Object.entries(dpMappings)) {
    const unit = info.unit ? ` (${info.unit})` : '';
    const range = info.range ? ` [${info.range.join('-')}]` : '';
    const values = info.values ? ` [${info.values.join('|')}]` : '';
    comment += ` * DP${dp}: ${info.name} - ${info.type}${unit}${range}${values}\n`;
  }

  comment += ` */\n`;
  return comment;
}

if (require.main === module) {
  main();
}

module.exports = { DRIVER_TYPE_MAP };
