#!/usr/bin/env node
'use strict';

/**
 * UNBRANDED REORGANIZATION SCRIPT
 * 
 * Reorganizes ALL drivers from brand-centric to function-centric naming
 * Preserves manufacturer names and product IDs inside driver files
 * 
 * Example transformations:
 * - avatto_switch_2gang → switch_wall_2gang
 * - zemismart_motion_sensor → motion_sensor_pir
 * - moes_climate_monitor → climate_monitor_temp_humidity
 */

const fs = require('fs');
const path = require('path');

// Color codes for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Mapping rules: OLD_PATTERN → NEW_NAME
const DRIVER_MAPPING = {
  // BUTTONS & SCENE CONTROLLERS
  'button_1gang': 'button_wireless_1',
  'button_2gang': 'button_wireless_2',
  'button_3gang': 'button_wireless_3',
  'button_4gang': 'button_wireless_4',
  'button_6gang': 'button_wireless_6',
  'button_8gang': 'button_wireless_8',
  'lonsonho_samsung_button': 'button_wireless_samsung',
  'lonsonho_sonoff_button_wireless': 'button_wireless_sonoff',
  'lonsonho_wireless_button_2gang': 'button_wireless_2',
  'zemismart_scene_controller': 'scene_controller_wireless',
  'zemismart_wireless_scene_controller_4button': 'scene_controller_4button',
  'zemismart_wireless_switch_1button': 'button_wireless_1',
  'zemismart_wireless_switch_2button': 'button_wireless_2',
  'zemismart_wireless_switch_3button': 'button_wireless_3',
  'zemismart_wireless_switch_4button': 'button_wireless_4',
  'zemismart_wireless_switch_6button': 'button_wireless_6',
  'zemismart_wireless_switch_8button': 'button_wireless_8',
  
  // WALL SWITCHES
  'avatto_switch_2gang': 'switch_wall_2gang',
  'avatto_smart_switch_2gang': 'switch_wall_2gang_smart',
  'avatto_smart_switch_4gang': 'switch_wall_4gang_smart',
  'avatto_smart_switch_6gang': 'switch_wall_6gang_smart',
  'avatto_smart_switch_8gang': 'switch_wall_8gang_smart',
  'avatto_wall_switch_2gang': 'switch_wall_2gang',
  'avatto_wall_switch_4gang': 'switch_wall_4gang',
  'avatto_wall_switch_5gang': 'switch_wall_5gang',
  'avatto_wall_switch_6gang': 'switch_wall_6gang',
  'tuya_smart_switch_1gang': 'switch_wall_1gang',
  'tuya_smart_switch_3gang': 'switch_wall_3gang',
  'zemismart_smart_switch_1gang': 'switch_wall_1gang',
  'zemismart_smart_switch_3gang': 'switch_wall_3gang',
  'zemismart_smart_switch_4gang': 'switch_wall_4gang',
  'zemismart_switch_1gang': 'switch_wall_1gang',
  'zemismart_switch_5gang': 'switch_wall_5gang',
  'zemismart_wall_switch_1gang': 'switch_wall_1gang',
  'zemismart_wall_switch_3gang': 'switch_wall_3gang',
  
  // TOUCH SWITCHES
  'avatto_touch_switch_2gang': 'switch_touch_2gang',
  'avatto_touch_switch_4gang': 'switch_touch_4gang',
  'zemismart_touch_switch_1gang': 'switch_touch_1gang',
  'zemismart_touch_switch_3gang': 'switch_touch_3gang',
  
  // DIMMERS
  'avatto_dimmer': 'dimmer_wall',
  'avatto_dimmer_1gang': 'dimmer_wall_1gang',
  'avatto_dimmer_1gang_touch': 'dimmer_touch_1gang',
  'avatto_dimmer_touch': 'dimmer_touch',
  'lsc_dimmer_wireless': 'dimmer_wireless',
  'lsc_philips_dimmer_switch': 'dimmer_wireless_philips',
  
  // SMART PLUGS
  'avatto_plug_basic': 'plug_smart_basic',
  'avatto_plug_smart': 'plug_smart',
  'avatto_smart_plug': 'plug_smart',
  'avatto_innr_smart_plug': 'plug_smart_innr',
  'avatto_osram_smart_plug': 'plug_smart_osram',
  'avatto_philips_smart_plug': 'plug_smart_philips',
  'avatto_samsung_smart_plug': 'plug_smart_samsung',
  'avatto_sonoff_smart_plug': 'plug_smart_sonoff',
  'avatto_samsung_outlet': 'plug_outlet_samsung',
  
  // ENERGY MONITORING PLUGS
  'avatto_plug_energy_monitor': 'plug_energy_monitor',
  'avatto_smart_plug_energy': 'plug_energy_monitor',
  'avatto_energy_plug_advanced': 'plug_energy_advanced',
  'avatto_energy_monitoring_plug_advanced': 'plug_energy_monitor_advanced',
  'avatto_power_meter_socket': 'plug_power_meter',
  'avatto_smart_plug_power_meter_16a': 'plug_power_meter_16a',
  
  // MOTION SENSORS
  'philips_motion_sensor': 'motion_sensor_philips',
  'philips_outdoor_sensor': 'motion_sensor_outdoor_philips',
  'samsung_motion_sensor': 'motion_sensor_samsung',
  'samsung_motion_sensor_outdoor_cr123a': 'motion_sensor_outdoor_samsung',
  'sonoff_motion_sensor': 'motion_sensor_sonoff',
  'zemismart_motion_sensor': 'motion_sensor_pir',
  'zemismart_pir_sensor_advanced': 'motion_sensor_pir_advanced',
  'zemismart_pir_radar_illumination_sensor': 'motion_sensor_pir_radar',
  'zemismart_radar_motion_sensor_advanced': 'motion_sensor_radar_advanced',
  'zemismart_radar_motion_sensor_mmwave': 'motion_sensor_radar_mmwave',
  'zemismart_presence_sensor_radar': 'presence_sensor_radar',
  'avatto_motion_sensor_mmwave_basic': 'motion_sensor_mmwave',
  'zemismart_motion_temp_humidity_illumination_multi': 'motion_sensor_multi',
  
  // CONTACT SENSORS
  'lonsonho_contact_sensor_basic': 'contact_sensor_basic',
  'lonsonho_samsung_contact_sensor': 'contact_sensor_samsung',
  'lonsonho_sonoff_contact_sensor': 'contact_sensor_sonoff',
  'generic_samsung_multipurpose_sensor': 'contact_sensor_multipurpose',
  
  // TEMPERATURE & HUMIDITY
  'avatto_co2_temp_humidity': 'climate_monitor_co2',
  'moes_climate_monitor': 'climate_monitor_temp_humidity',
  'moes_sonoff_temperature_humidity': 'climate_monitor_sonoff',
  'tuya_soil_tester_temp_humid': 'climate_sensor_soil',
  'zemismart_temp_humid_sensor_advanced': 'climate_sensor_temp_humidity_advanced',
  'zemismart_temperature_sensor': 'temperature_sensor',
  'zemismart_temperature_sensor_advanced': 'temperature_sensor_advanced',
  
  // WATER SENSORS
  'samsung_water_leak_sensor': 'water_leak_sensor_samsung',
  'zemismart_water_leak_sensor': 'water_leak_sensor',
  'zemismart_temp_humid_sensor_leak_detector': 'water_leak_sensor_temp_humidity',
  
  // SMOKE & GAS DETECTORS
  'zemismart_smart_smoke_detector_advanced': 'smoke_detector_advanced',
  'zemismart_smoke_detector_temp_humidity_advanced': 'smoke_detector_temp_humidity',
  'zemismart_smoke_temp_humid_sensor': 'smoke_detector_temp_humidity',
  'zemismart_gas_detector': 'gas_detector',
  'tuya_gas_sensor_ts0601': 'gas_sensor',
  
  // AIR QUALITY
  'nous_air_quality_monitor': 'air_quality_monitor',
  'zemismart_pm25_detector': 'air_quality_pm25',
  'tuya_comprehensive_air_monitor': 'air_quality_comprehensive',
  
  // BULBS - WHITE
  'avatto_smart_bulb_white': 'bulb_white',
  'lsc_bulb_white': 'bulb_white_lsc',
  'lsc_innr_bulb_white': 'bulb_white_innr',
  'lsc_osram_bulb_white': 'bulb_white_osram',
  'lsc_philips_bulb_white': 'bulb_white_philips',
  
  // BULBS - TUNABLE WHITE
  'avatto_bulb_tunable': 'bulb_tunable_white',
  'lsc_bulb_white_ambiance': 'bulb_tunable_white_lsc',
  'lsc_innr_bulb_tunable_white': 'bulb_tunable_white_innr',
  'lsc_osram_bulb_tunable_white': 'bulb_tunable_white_osram',
  'lsc_philips_bulb_white_ambiance': 'bulb_tunable_white_philips',
  
  // BULBS - RGB/RGBW
  'avatto_smart_bulb_rgb': 'bulb_rgb',
  'avatto_smart_bulb_dimmer': 'bulb_dimmable',
  'lsc_bulb_rgb': 'bulb_rgb_lsc',
  'lsc_innr_bulb_color': 'bulb_rgb_innr',
  'lsc_osram_bulb_rgbw': 'bulb_rgbw_osram',
  'lsc_philips_bulb_color': 'bulb_rgb_philips',
  
  // LED STRIPS
  'avatto_led_strip_basic': 'led_strip_basic',
  'avatto_led_strip_advanced': 'led_strip_advanced',
  'avatto_led_strip_pro': 'led_strip_pro',
  'lsc_led_strip_outdoor_color': 'led_strip_outdoor_rgb',
  'lsc_osram_led_strip_rgbw': 'led_strip_rgbw_osram',
  'lsc_philips_led_strip': 'led_strip_philips',
  'lsc_sonoff_led_strip': 'led_strip_sonoff',
  
  // SPOTS
  'avatto_smart_spot': 'spot_light_smart',
  
  // THERMOSTATS & RADIATOR VALVES
  'avatto_radiator_valve': 'radiator_valve',
  'avatto_radiator_valve_smart_hybrid': 'radiator_valve_smart',
  
  // WATER VALVES
  'avatto_water_valve': 'water_valve',
  'avatto_water_valve_smart': 'water_valve_smart',
  'avatto_water_valve_smart_hybrid': 'water_valve_smart_hybrid',
  'zemismart_valve_smart': 'water_valve_smart',
  
  // CURTAINS & BLINDS
  'zemismart_curtain_motor': 'curtain_motor',
  'zemismart_roller_blind_controller': 'blind_roller_controller',
  'zemismart_roller_shutter_controller': 'shutter_roller_controller',
  'zemismart_roller_shutter_switch': 'shutter_roller_switch',
  
  // DOOR & GARAGE CONTROLLERS
  'zemismart_door_controller': 'door_controller',
  'zemismart_garage_door_controller': 'garage_door_controller',
  
  // LOCKS
  'zemismart_lock_basic': 'lock_smart_basic',
  'zemismart_lock_fingerprint': 'lock_smart_fingerprint',
  'zemismart_lock_smart': 'lock_smart',
  
  // DOORBELLS
  'tuya_doorbell': 'doorbell',
  'tuya_doorbell_camera': 'doorbell_camera',
  
  // SIRENS
  'tuya_siren': 'siren',
  'tuya_outdoor_siren': 'siren_outdoor',
  
  // EMERGENCY BUTTONS
  'avatto_sos_emergency_button': 'button_emergency_sos',
  'moes_sos_emergency_button': 'button_emergency_sos',
  
  // CEILING FAN
  'avatto_ceiling_fan': 'ceiling_fan',
  
  // HUBS & GATEWAYS
  'nous_zbbridge': 'gateway_zigbee_bridge',
  'nous_zigbee_gateway_hub': 'gateway_zigbee_hub',
  
  // OTHER CONTROLLERS
  'zemismart_humidity_controller': 'humidity_controller',
  'zemismart_outdoor_light_controller': 'light_controller_outdoor',
  'zemismart_solar_panel_controller': 'solar_panel_controller',
  'zemismart_sound_controller_other': 'sound_controller',
  
  // SPECIAL MODULES
  'avatto_dimmer_switch_timer_module': 'module_dimmer_timer',
  'avatto_mini': 'module_mini',
  'avatto_mini_switch': 'module_mini_switch',
  'avatto_remote_switch': 'switch_remote',
  'avatto_wireless_switch': 'switch_wireless',
  'avatto_wireless_switch_2gang': 'switch_wireless_2gang',
  'avatto_wireless_switch_4button': 'switch_wireless_4button',
  'avatto_wireless_switch_4gang': 'switch_wireless_4gang',
  'avatto_wireless_switch_5button': 'switch_wireless_5button',
  'avatto_wireless_switch_6gang': 'switch_wireless_6gang',
  'wireless_button': 'button_wireless',
  'zemismart_wireless_switch_1gang': 'switch_wireless_1gang',
  
  // OUTLETS (Non-USB already done)
  'nous_osram_outdoor_plug': 'plug_outdoor_osram',
  'nous_smart_plug_dimmer': 'plug_dimmer',
  
  // HVAC
  'tuya_air_conditioner_hybrid': 'hvac_air_conditioner',
  'tuya_dehumidifier_hybrid': 'hvac_dehumidifier',
  
  // SHORTCUT BUTTONS
  'lonsonho_shortcut_button_other': 'button_shortcut',
  'lsc_wireless_switch_4button_other': 'switch_wireless_4button'
};

// Categories for organization
const CATEGORIES = {
  button_wireless: 'Automation Controls - Wireless Buttons',
  scene_controller: 'Automation Controls - Scene Controllers',
  switch_wall: 'Switches - Wall Mounted',
  switch_touch: 'Switches - Touch',
  switch_wireless: 'Switches - Wireless',
  switch_remote: 'Switches - Remote',
  dimmer_wall: 'Dimmers - Wall Mounted',
  dimmer_touch: 'Dimmers - Touch',
  dimmer_wireless: 'Dimmers - Wireless',
  plug_smart: 'Power - Smart Plugs',
  plug_energy: 'Power - Energy Monitoring',
  plug_power: 'Power - Power Meter',
  plug_outdoor: 'Power - Outdoor',
  plug_dimmer: 'Power - Dimmable Plugs',
  motion_sensor: 'Sensors - Motion & Presence',
  presence_sensor: 'Sensors - Presence',
  contact_sensor: 'Sensors - Contact',
  climate_monitor: 'Sensors - Climate',
  climate_sensor: 'Sensors - Climate',
  temperature_sensor: 'Sensors - Temperature',
  water_leak_sensor: 'Sensors - Water Leak',
  smoke_detector: 'Sensors - Smoke',
  gas_detector: 'Sensors - Gas',
  gas_sensor: 'Sensors - Gas',
  air_quality: 'Sensors - Air Quality',
  bulb_white: 'Lighting - White Bulbs',
  bulb_tunable: 'Lighting - Tunable White',
  bulb_rgb: 'Lighting - RGB Bulbs',
  bulb_rgbw: 'Lighting - RGBW Bulbs',
  bulb_dimmable: 'Lighting - Dimmable',
  led_strip: 'Lighting - LED Strips',
  spot_light: 'Lighting - Spot Lights',
  radiator_valve: 'Climate - Radiator Valves',
  water_valve: 'Climate - Water Valves',
  curtain_motor: 'Window Coverings - Curtains',
  blind_roller: 'Window Coverings - Blinds',
  shutter_roller: 'Window Coverings - Shutters',
  door_controller: 'Access - Door Controllers',
  garage_door: 'Access - Garage Doors',
  lock_smart: 'Access - Smart Locks',
  doorbell: 'Security - Doorbells',
  siren: 'Security - Sirens',
  button_emergency: 'Security - Emergency Buttons',
  ceiling_fan: 'Climate - Ceiling Fans',
  gateway_zigbee: 'Hubs - Zigbee Gateways',
  humidity_controller: 'Climate - Humidity Controllers',
  light_controller: 'Lighting - Controllers',
  solar_panel: 'Energy - Solar',
  sound_controller: 'Audio - Controllers',
  module: 'Modules - Special',
  hvac: 'Climate - HVAC',
  usb_outlet: 'Power - USB Outlets'
};

function analyzeDrivers() {
  log('\n📊 ANALYZING CURRENT DRIVERS...', 'cyan');
  
  const driversPath = path.join(__dirname, '..', 'drivers');
  const drivers = fs.readdirSync(driversPath).filter(d => {
    const stats = fs.statSync(path.join(driversPath, d));
    return stats.isDirectory();
  });
  
  log(`\nFound ${drivers.length} drivers`, 'bright');
  
  const analysis = {
    needsRename: [],
    alreadyUnbranded: [],
    unknown: []
  };
  
  drivers.forEach(driver => {
    if (DRIVER_MAPPING[driver]) {
      analysis.needsRename.push({
        old: driver,
        new: DRIVER_MAPPING[driver],
        category: getCategoryFromNewName(DRIVER_MAPPING[driver])
      });
    } else if (driver.startsWith('usb_outlet_') || 
               driver.startsWith('switch_wall_') ||
               driver.startsWith('switch_touch_')) {
      analysis.alreadyUnbranded.push(driver);
    } else if (driver.includes('avatto_') || 
               driver.includes('zemismart_') || 
               driver.includes('moes_') ||
               driver.includes('lonsonho_') ||
               driver.includes('lsc_') ||
               driver.includes('nous_') ||
               driver.includes('philips_') ||
               driver.includes('samsung_') ||
               driver.includes('sonoff_') ||
               driver.includes('tuya_')) {
      analysis.unknown.push(driver);
    } else {
      analysis.alreadyUnbranded.push(driver);
    }
  });
  
  return analysis;
}

function getCategoryFromNewName(newName) {
  const prefix = newName.split('_').slice(0, 2).join('_');
  return CATEGORIES[prefix] || 'Uncategorized';
}

function displayAnalysis(analysis) {
  log('\n' + '='.repeat(80), 'yellow');
  log('📋 REORGANIZATION ANALYSIS', 'yellow');
  log('='.repeat(80), 'yellow');
  
  log(`\n✅ Already Unbranded: ${analysis.alreadyUnbranded.length}`, 'green');
  analysis.alreadyUnbranded.forEach(d => {
    log(`   - ${d}`, 'green');
  });
  
  log(`\n🔄 Needs Rename: ${analysis.needsRename.length}`, 'yellow');
  const byCategory = {};
  analysis.needsRename.forEach(item => {
    if (!byCategory[item.category]) {
      byCategory[item.category] = [];
    }
    byCategory[item.category].push(item);
  });
  
  Object.keys(byCategory).sort().forEach(category => {
    log(`\n  📁 ${category}:`, 'magenta');
    byCategory[category].forEach(item => {
      log(`     ${item.old} → ${item.new}`, 'cyan');
    });
  });
  
  if (analysis.unknown.length > 0) {
    log(`\n⚠️  Unknown/Need Manual Review: ${analysis.unknown.length}`, 'red');
    analysis.unknown.forEach(d => {
      log(`   - ${d}`, 'red');
    });
  }
  
  log('\n' + '='.repeat(80), 'yellow');
  log(`\n📊 TOTAL STATISTICS:`, 'bright');
  log(`   Already Unbranded: ${analysis.alreadyUnbranded.length}`, 'green');
  log(`   Needs Rename: ${analysis.needsRename.length}`, 'yellow');
  log(`   Unknown: ${analysis.unknown.length}`, 'red');
  log(`   TOTAL: ${analysis.alreadyUnbranded.length + analysis.needsRename.length + analysis.unknown.length}`, 'bright');
  log('\n' + '='.repeat(80), 'yellow');
}

// Main execution
if (require.main === module) {
  log('\n🚀 UNBRANDED REORGANIZATION SCRIPT', 'bright');
  log('═'.repeat(80), 'blue');
  
  const analysis = analyzeDrivers();
  displayAnalysis(analysis);
  
  log('\n💡 Next steps:', 'cyan');
  log('   1. Review the analysis above', 'cyan');
  log('   2. Run with --execute flag to perform renaming', 'cyan');
  log('   3. Update app.json references', 'cyan');
  log('   4. Test all drivers', 'cyan');
  log('\n');
}

module.exports = {
  analyzeDrivers,
  DRIVER_MAPPING,
  CATEGORIES
};
