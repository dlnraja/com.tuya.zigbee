'use strict';

/**
 * CONSOLIDATE DRIVERS - Merge duplicate/similar drivers into unified categories
 *
 * This script:
 * 1. Identifies duplicate drivers
 * 2. Merges manufacturer/product IDs into primary drivers
 * 3. Removes redundant driver folders
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

// Define merge mappings: source -> target
// Source drivers will be merged into target driver, then deleted
const MERGE_MAPPINGS = {
  // ============================================================
  // AIR QUALITY - Consolidate into 2 drivers
  // ============================================================
  'air_quality_monitor': 'air_quality_comprehensive',
  'air_quality_monitor_advanced': 'air_quality_comprehensive',
  'air_quality_pm25': 'air_quality_comprehensive',
  'sensor_air_quality_full': 'air_quality_comprehensive',

  // ============================================================
  // BUTTONS - Consolidate into categories by button count
  // ============================================================
  'button_ts0041': 'button_wireless_1',
  'button_wireless_1_v2': 'button_wireless_1',
  'button_shortcut': 'button_wireless_1',

  'button_ts0043': 'button_wireless_3',
  'button_remote_3': 'button_wireless_3',

  'button_ts0044': 'button_wireless_4',
  'button_remote_4': 'button_wireless_4',

  'button_remote_1': 'button_wireless_1',
  'button_remote_2': 'button_wireless_2',
  'button_remote_6': 'button_wireless_6',
  'button_remote_8': 'button_wireless_8',

  'button_emergency_advanced': 'button_emergency_sos',
  'wireless_button': 'button_wireless_1',

  // ============================================================
  // CLIMATE SENSORS - Consolidate
  // ============================================================
  'climate_monitor': 'climate_sensor',
  'climate_monitor_temp_humidity': 'climate_sensor',
  'temp_humidity_ts0201': 'climate_sensor',
  'temperature_sensor': 'climate_sensor',
  'temperature_sensor_advanced': 'climate_sensor',
  'climate_sensor_temp_humidity_advanced': 'climate_sensor',

  'climate_sensor_soil': 'soil_sensor',
  'soil_moisture_sensor': 'soil_sensor',
  'sensor_soil_moisture': 'soil_sensor',

  'climate_monitor_co2': 'air_quality_co2',

  // ============================================================
  // CONTACT SENSORS - Consolidate
  // ============================================================
  'contact_sensor_basic': 'contact_sensor',
  'contact_sensor_multipurpose': 'contact_sensor',
  'contact_sensor_vibration': 'contact_sensor',

  // ============================================================
  // CURTAIN MOTORS - Consolidate
  // ============================================================
  'curtain_motor_advanced': 'curtain_motor',
  'curtain_motor_ts0601': 'curtain_motor',

  // ============================================================
  // DIMMERS - Consolidate
  // ============================================================
  'dimmer_touch': 'dimmer_wall_1gang',
  'dimmer_touch_1gang': 'dimmer_wall_1gang',
  'dimmer_wall': 'dimmer_wall_1gang',
  'dimmer_wireless': 'dimmer_wall_1gang',
  'module_dimmer_timer': 'dimmer_wall_1gang',

  // ============================================================
  // DOORBELLS - Consolidate
  // ============================================================
  'doorbell_button': 'doorbell',
  'doorbell_camera': 'doorbell',

  // ============================================================
  // GATEWAYS - Consolidate
  // ============================================================
  'gateway_zigbee_hub': 'gateway_zigbee_bridge',

  // ============================================================
  // LED STRIPS - Consolidate
  // ============================================================
  'led_strip_basic': 'led_strip',
  'led_strip_pro': 'led_strip_advanced',
  'led_strip_outdoor_rgb': 'led_strip_rgbw',
  'led_strip_ts0503b': 'led_strip_rgbw',
  'rgb_led_controller': 'led_strip_rgbw',

  // ============================================================
  // LOCKS - Consolidate
  // ============================================================
  'lock_smart_basic': 'lock_smart',
  'lock_smart_advanced': 'lock_smart',
  'lock_smart_fingerprint': 'lock_smart',

  // ============================================================
  // MOTION SENSORS - Consolidate
  // ============================================================
  'motion_sensor_pir': 'motion_sensor',
  'motion_sensor_pir_advanced': 'motion_sensor',
  'motion_sensor_outdoor': 'motion_sensor',
  'motion_sensor_multi': 'motion_sensor',
  'pir_sensor_3in1': 'motion_sensor',
  'zg_204zv_multi_sensor': 'motion_sensor',

  'motion_sensor_mmwave': 'motion_sensor_radar_mmwave',
  'motion_sensor_radar_advanced': 'motion_sensor_radar_mmwave',
  'motion_sensor_pir_radar': 'motion_sensor_radar_mmwave',
  'mmwave_radar_10g': 'motion_sensor_radar_mmwave',
  'sensor_mmwave_presence_advanced': 'presence_sensor_radar',

  // ============================================================
  // PLUGS/SOCKETS - Consolidate into main categories
  // ============================================================
  'plug_smart_basic': 'plug_smart',
  'plug_smart_advanced': 'plug_smart',
  'plug_outlet': 'plug_smart',
  'plug_outdoor': 'plug_smart',
  'plug_dimmer': 'plug_smart',
  'socket_ts011f': 'plug_smart',

  'plug_energy_smart': 'plug_energy_monitor',
  'plug_energy_advanced': 'plug_energy_monitor',
  'plug_energy_monitor_advanced': 'plug_energy_monitor',
  'plug_power_meter': 'plug_energy_monitor',
  'plug_power_meter_16a': 'plug_energy_monitor',

  // ============================================================
  // PRESENCE SENSORS - Consolidate
  // ============================================================
  'presence_sensor': 'presence_sensor_radar',

  // ============================================================
  // RADIATOR VALVES - Consolidate
  // ============================================================
  'radiator_valve_smart': 'radiator_valve',
  'heating_controller_trv': 'radiator_valve',

  // ============================================================
  // SHUTTERS/BLINDS - Consolidate
  // ============================================================
  'shutter_roller_switch': 'shutter_roller_controller',
  'blind_roller_controller': 'shutter_roller_controller',

  // ============================================================
  // SIRENS - Consolidate
  // ============================================================
  'siren_alarm_advanced': 'siren',
  'siren_outdoor': 'siren',

  // ============================================================
  // SMOKE DETECTORS - Consolidate
  // ============================================================
  'smoke_detector_climate': 'smoke_detector_advanced',
  'smoke_detector_temp_humidity': 'smoke_detector_advanced',

  // ============================================================
  // SWITCHES - Major consolidation needed
  // ============================================================
  // 1-Gang switches
  'switch_basic_1gang': 'switch_1gang',
  'switch_generic_1gang': 'switch_1gang',
  'switch_smart_1gang': 'switch_1gang',
  'switch_touch_1gang': 'switch_1gang',
  'switch_touch_1gang_basic': 'switch_1gang',
  'switch_wall_1gang': 'switch_1gang',
  'switch_wall_1gang_basic': 'switch_1gang',
  'switch_internal_1gang': 'switch_1gang',
  'wall_touch_1gang': 'switch_1gang',
  'switch_wireless_1gang': 'switch_1gang',

  // 2-Gang switches
  'switch_2_gang_tuya': 'switch_2gang',
  'switch_2gang_alt': 'switch_2gang',
  'switch_basic_2gang': 'switch_2gang',
  'switch_basic_2gang_usb': 'switch_2gang',
  'switch_touch_2gang': 'switch_2gang',
  'switch_wall_2gang': 'switch_2gang',
  'switch_wall_2gang_basic': 'switch_2gang',
  'switch_wall_2gang_bseed': 'switch_2gang',
  'switch_wall_2gang_smart': 'switch_2gang',
  'switch_wireless_2gang': 'switch_2gang',
  'wall_touch_2gang': 'switch_2gang',

  // 3-Gang switches
  'switch_generic_3gang': 'switch_3gang',
  'switch_smart_3gang': 'switch_3gang',
  'switch_touch_3gang': 'switch_3gang',
  'switch_touch_3gang_basic': 'switch_3gang',
  'switch_wall_3gang': 'switch_3gang',
  'switch_wall_3gang_basic': 'switch_3gang',
  'wall_touch_3gang': 'switch_3gang',

  // 4-Gang switches
  'switch_smart_4gang': 'switch_4gang',
  'switch_touch_4gang': 'switch_4gang',
  'switch_wall_4gang': 'switch_4gang',
  'switch_wall_4gang_basic': 'switch_4gang',
  'switch_wall_4gang_smart': 'switch_4gang',
  'switch_wireless_4gang': 'switch_4gang',
  'switch_wireless_4button_alt': 'switch_4gang',
  'wall_touch_4gang': 'switch_4gang',
  'scene_controller_4button': 'switch_4gang',

  // 5-Gang switches
  'switch_basic_5gang': 'switch_wall_5gang',
  'switch_wireless_5button': 'switch_wall_5gang',
  'wall_touch_5gang': 'switch_wall_5gang',

  // 6-Gang switches
  'switch_wall_6gang_basic': 'switch_wall_6gang',
  'switch_wall_6gang_smart': 'switch_wall_6gang',
  'switch_wireless_6gang': 'switch_wall_6gang',
  'wall_touch_6gang': 'switch_wall_6gang',

  // 7-Gang switches
  'wall_touch_7gang': 'switch_wall_7gang',

  // 8-Gang switches
  'switch_wall_8gang_smart': 'switch_wall_8gang',
  'wall_touch_8gang': 'switch_wall_8gang',

  // Other switches
  'switch_remote': 'switch_wireless',
  'scene_controller_wireless': 'switch_wireless',

  // ============================================================
  // THERMOSTATS - Consolidate
  // ============================================================
  'thermostat_smart': 'thermostat_ts0601',
  'thermostat_advanced': 'thermostat_ts0601',
  'thermostat_temperature_control': 'thermostat_ts0601',
  'thermostat_trv_advanced': 'thermostat_ts0601',
  'thermostat_trv_tuya': 'thermostat_ts0601',

  // ============================================================
  // USB OUTLETS - Consolidate
  // ============================================================
  'usb_outlet_basic': 'usb_outlet_advanced',
  'usb_outlet_bseed': 'usb_outlet_advanced',
  'usb_outlet_1gang': 'usb_outlet_advanced',
  'usb_outlet_2port': 'usb_outlet_advanced',
  'usb_outlet_3gang': 'usb_outlet_advanced',
  'usb_c_pd_socket': 'usb_outlet_advanced',

  // ============================================================
  // WATER VALVES - Consolidate
  // ============================================================
  'water_valve': 'water_valve_smart',
  'water_valve_controller': 'water_valve_smart',
  'valve_smart': 'water_valve_smart',

  // ============================================================
  // WATER LEAK SENSORS - Consolidate
  // ============================================================
  'water_leak_sensor_temp_humidity': 'water_leak_sensor',

  // ============================================================
  // MODULE/MINI - Consolidate
  // ============================================================
  'module_mini': 'module_mini_switch',

  // ============================================================
  // DOOR CONTROLLER
  // ============================================================
  'garage_door_controller': 'door_controller',

  // ============================================================
  // OTHERS
  // ============================================================
  'smart_knob_ts004f': 'button_wireless_1',
  'light_controller_outdoor': 'led_strip_rgbw',
  'spot_light_smart': 'bulb_dimmable',
  'humidity_controller': 'climate_sensor',
  'noise_sensor': 'air_quality_comprehensive',
  'sound_controller': 'siren',
  'solar_panel_controller': 'plug_energy_monitor',
};

function readDriverConfig(driverPath) {
  const configPath = path.join(driverPath, 'driver.compose.json');
  if (!fs.existsSync(configPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function writeDriverConfig(driverPath, config) {
  const configPath = path.join(driverPath, 'driver.compose.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
}

function mergeArrays(target = [], source = []) {
  const set = new Set(target);
  source.forEach(item => {
    if (item && typeof item === 'string') set.add(item);
  });
  return Array.from(set);
}

function deleteDriverFolder(driverName) {
  const driverPath = path.join(DRIVERS_DIR, driverName);
  if (!fs.existsSync(driverPath)) return false;

  try {
    fs.rmSync(driverPath, { recursive: true, force: true });
    return true;
  } catch (e) {
    console.error(`Failed to delete ${driverName}:`, e.message);
    return false;
  }
}

function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║    🔄 CONSOLIDATE DRIVERS - Merge & Clean Duplicates            ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  let merged = 0;
  let deleted = 0;
  let errors = [];
  let skipped = [];

  for (const [source, target] of Object.entries(MERGE_MAPPINGS)) {
    const sourcePath = path.join(DRIVERS_DIR, source);
    const targetPath = path.join(DRIVERS_DIR, target);

    // Check if source exists
    if (!fs.existsSync(sourcePath)) {
      skipped.push(source);
      continue;
    }

    // Check if target exists
    if (!fs.existsSync(targetPath)) {
      console.log(`⚠️  Target ${target} doesn't exist, skipping ${source}`);
      skipped.push(source);
      continue;
    }

    // Read configs
    const sourceConfig = readDriverConfig(sourcePath);
    const targetConfig = readDriverConfig(targetPath);

    if (!sourceConfig || !targetConfig) {
      errors.push(`${source} -> ${target}: Config read failed`);
      continue;
    }

    // Merge zigbee IDs
    if (sourceConfig.zigbee && targetConfig.zigbee) {
      targetConfig.zigbee.manufacturerName = mergeArrays(
        targetConfig.zigbee.manufacturerName,
        sourceConfig.zigbee.manufacturerName
      );
      targetConfig.zigbee.productId = mergeArrays(
        targetConfig.zigbee.productId,
        sourceConfig.zigbee.productId
      );
    }

    // Write updated target config
    writeDriverConfig(targetPath, targetConfig);

    // Delete source folder
    if (deleteDriverFolder(source)) {
      console.log(`✅ ${source.padEnd(40)} → ${target}`);
      merged++;
      deleted++;
    } else {
      errors.push(`${source}: Delete failed`);
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log(`\n📊 CONSOLIDATION SUMMARY:`);
  console.log(`   ✅ Drivers merged: ${merged}`);
  console.log(`   🗑️  Folders deleted: ${deleted}`);
  console.log(`   ⏭️  Skipped (not found): ${skipped.length}`);

  if (errors.length > 0) {
    console.log(`   ❌ Errors: ${errors.length}`);
    errors.forEach(e => console.log(`      - ${e}`));
  }

  // List remaining drivers
  const remaining = fs.readdirSync(DRIVERS_DIR).filter(f =>
    fs.statSync(path.join(DRIVERS_DIR, f)).isDirectory()
  );
  console.log(`\n📁 Remaining drivers: ${remaining.length}`);
}

main();
