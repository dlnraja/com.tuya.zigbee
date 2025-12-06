#!/usr/bin/env node
/**
 * FIX MISSING MANUFACTURERS
 *
 * Adds missing manufacturers from JohanBendz to our drivers
 */

const fs = require('fs');
const path = require('path');

const LOCAL_DIR = path.join(__dirname, '../drivers');
const JOHAN_DIR = path.join(__dirname, '../../johanbendz_compare/drivers');

// Map JohanBendz driver names to our driver names
const DRIVER_MAPPING = {
  // Climate/Sensors
  'doorwindowsensor': 'contact_sensor',
  'doorwindowsensor_2': 'contact_sensor',
  'doorwindowsensor_3': 'contact_sensor',
  'doorwindowsensor_4': 'contact_sensor',
  'smart_door_window_sensor': 'contact_sensor',
  'temphumidsensor2': 'temphumidsensor',
  'temphumidsensor3': 'temphumidsensor',
  'temphumidsensor4': 'temphumidsensor',
  'temphumidsensor5': 'temphumidsensor',
  'lcdtemphumidsensor_2': 'lcdtemphumidsensor',
  'lcdtemphumidsensor_3': 'lcdtemphumidsensor',
  'soilsensor': 'soil_sensor',
  'soilsensor_2': 'soil_sensor',

  // Motion
  'pirsensor': 'motion_sensor',
  'pir_sensor_2': 'motion_sensor',
  'smart_motion_sensor': 'motion_sensor',
  'motion_sensor_2': 'motion_sensor',
  'slim_motion_sensor': 'motion_sensor',
  'radar_sensor': 'motion_sensor_radar_mmwave',
  'radar_sensor_2': 'motion_sensor_radar_mmwave',
  'radar_sensor_ceiling': 'motion_sensor_radar_mmwave',

  // Switches
  'switch_1_gang': 'switch_1gang',
  'switch_2_gang': 'switch_2gang',
  'switch_3_gang': 'switch_3gang',
  'switch_1_gang_metering': 'switch_1gang',
  'switch_2_gang_metering': 'switch_2gang',
  'switch_4_gang_metering': 'switch_4gang',
  'wall_switch_1_gang': 'switch_wall_1gang',
  'wall_switch_2_gang': 'switch_wall_2gang',
  'wall_switch_3_gang': 'switch_wall_3gang',
  'wall_switch_4_gang': 'switch_wall_4gang',
  'wall_switch_1_gang_tuya': 'switch_wall_1gang',
  'wall_switch_4_gang_tuya': 'switch_wall_4gang',
  'wall_switch_5_gang_tuya': 'switch_wall_5gang',
  'wall_switch_6_gang_tuya': 'switch_wall_6gang',
  'smart_switch': 'switch_1gang',

  // Sockets
  'plug': 'socket',
  'smartplug': 'socket',
  'smartplug_2_socket': 'socket_double',
  'outdoor_plug': 'socket',
  'outdoor_2_socket': 'socket_double',
  'wall_socket': 'socket_wall',
  'double_power_point': 'socket_double',
  'double_power_point_2': 'socket_double',
  'smartPlug_DinRail': 'plug_energy_monitor',
  'socket_power_strip': 'power_strip',
  'socket_power_strip_four': 'power_strip',
  'socket_power_strip_four_two': 'power_strip',
  'socket_power_strip_four_three': 'power_strip',

  // Dimmers
  'dimmer_1_gang': 'dimmer',
  'dimmer_1_gang_2': 'dimmer',
  'dimmer_1_gang_tuya': 'dimmer',
  'dimmer_2_gang': 'dimmer_dual_channel',
  'dimmer_2_gang_tuya': 'dimmer_dual_channel',
  'wall_dimmer_tuya': 'dimmer',

  // LED/Bulbs
  'rgb_bulb_E14': 'led_controller_rgbw',
  'rgb_bulb_E27': 'led_controller_rgbw',
  'rgb_spot_GU10': 'led_controller_rgbw',
  'rgb_led_strip': 'led_controller_rgbw',
  'rgb_led_strip_controller': 'led_controller_rgbw',
  'rgb_ceiling_led_light': 'led_controller_rgbw',
  'rgb_floor_led_light': 'led_controller_rgbw',
  'rgb_wall_led_light': 'led_controller_rgbw',
  'rgb_led_light_bar': 'led_controller_rgbw',
  'rgb_mood_light': 'led_controller_rgbw',
  'rgb_spot_GardenLight': 'led_controller_rgbw',
  'dimmable_led_strip': 'led_controller_dimmable',
  'dimmable_recessed_led': 'led_controller_dimmable',
  'tunable_bulb_E14': 'led_controller_cct',
  'tunable_bulb_E27': 'led_controller_cct',
  'tunable_spot_GU10': 'led_controller_cct',
  'christmas_lights': 'led_controller_rgbw',

  // Covers
  'curtain_module': 'curtain_motor',
  'curtain_module_2_gang': 'curtain_motor',
  'wall_curtain_switch': 'curtain_motor',

  // Buttons/Remotes
  'smart_button_switch': 'button_wireless_1',
  'smart_remote_1_button': 'button_wireless_1',
  'smart_remote_1_button_2': 'button_wireless_1',
  'smart_remote_4_buttons': 'button_wireless_4',
  'handheld_remote_4_buttons': 'button_wireless_4',
  'smart_knob_switch': 'button_wireless_1',
  'wall_remote_1_gang': 'button_wireless_1',
  'wall_remote_2_gang': 'button_wireless_2',
  'wall_remote_3_gang': 'button_wireless_3',
  'wall_remote_4_gang': 'button_wireless_4',
  'wall_remote_4_gang_2': 'button_wireless_4',
  'wall_remote_4_gang_3': 'button_wireless_4',
  'wall_remote_6_gang': 'button_wireless_4',

  // Sensors
  'flood_sensor': 'water_leak_sensor',
  'water_detector': 'water_leak_sensor',
  'water_leak_sensor_tuya': 'water_leak_sensor',
  'smoke_sensor': 'smoke_detector',
  'smoke_sensor2': 'smoke_detector',
  'smoke_sensor3': 'smoke_detector',

  // Thermostats
  'thermostatic_radiator_valve': 'thermostat_tuya_dp',
  'wall_thermostat': 'thermostat_tuya_dp',

  // Valves
  'valvecontroller': 'valve_irrigation',
  'smart_garden_irrigation_control': 'valve_irrigation',

  // Relays
  'relay_board_1_channel': 'module_relay_1ch',
  'relay_board_2_channel': 'module_relay_2ch',
  'relay_board_4_channel': 'module_relay_4ch',

  // Other
  'sirentemphumidsensor': 'siren',
  'lcdtemphumidluxsensor': 'lcdtemphumidsensor',
  'zigbee_repeater': 'zigbee_universal',
};

function getLocalDriverConfig(driverName) {
  const configPath = path.join(LOCAL_DIR, driverName, 'driver.compose.json');
  if (!fs.existsSync(configPath)) return null;
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function saveLocalDriverConfig(driverName, config) {
  const configPath = path.join(LOCAL_DIR, driverName, 'driver.compose.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function getJohanDriverConfig(driverName) {
  const configPath = path.join(JOHAN_DIR, driverName, 'driver.compose.json');
  if (!fs.existsSync(configPath)) return null;
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🔧 FIX MISSING MANUFACTURERS');
  console.log('════════════════════════════════════════════════════════════════\n');

  const johanDrivers = fs.readdirSync(JOHAN_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  let totalAdded = 0;
  const changes = [];

  for (const johanDriver of johanDrivers) {
    // Get mapped local driver name
    const localDriverName = DRIVER_MAPPING[johanDriver] || johanDriver;

    const johanConfig = getJohanDriverConfig(johanDriver);
    const localConfig = getLocalDriverConfig(localDriverName);

    if (!johanConfig || !localConfig) continue;

    const johanMfrs = johanConfig.zigbee?.manufacturerName || [];
    const localMfrs = new Set(localConfig.zigbee?.manufacturerName || []);

    const missingMfrs = johanMfrs.filter(m => !localMfrs.has(m));

    if (missingMfrs.length > 0) {
      // Add missing manufacturers
      if (!localConfig.zigbee) localConfig.zigbee = {};
      if (!localConfig.zigbee.manufacturerName) localConfig.zigbee.manufacturerName = [];

      localConfig.zigbee.manufacturerName.push(...missingMfrs);

      // Sort and deduplicate
      localConfig.zigbee.manufacturerName = [...new Set(localConfig.zigbee.manufacturerName)].sort();

      saveLocalDriverConfig(localDriverName, localConfig);

      console.log(`✅ ${localDriverName}: +${missingMfrs.length} manufacturers from ${johanDriver}`);
      missingMfrs.slice(0, 3).forEach(m => console.log(`    ${m}`));
      if (missingMfrs.length > 3) console.log(`    ... and ${missingMfrs.length - 3} more`);

      totalAdded += missingMfrs.length;
      changes.push({
        localDriver: localDriverName,
        johanDriver,
        added: missingMfrs,
      });
    }
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log(`📊 SUMMARY: Added ${totalAdded} manufacturers to ${changes.length} drivers`);
  console.log('════════════════════════════════════════════════════════════════\n');

  // Save changes log
  fs.writeFileSync(
    path.join(__dirname, '../data/MANUFACTURER_ADDITIONS.json'),
    JSON.stringify({ timestamp: new Date().toISOString(), totalAdded, changes }, null, 2)
  );
}

if (require.main === module) {
  main().catch(console.error);
}
