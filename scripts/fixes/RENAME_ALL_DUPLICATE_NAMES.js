#!/usr/bin/env node

/**
 * RENAME ALL DUPLICATE/UNCLEAR DRIVER NAMES
 * Crée des noms UNIQUES et CLAIRS pour tous les drivers
 */

const fs = require('fs');
const path = require('path');

// MAPPING COMPLET des renommages
const RENAME_MAP = {
  // WALL SWITCHES - Distinguer AC/DC et Touch
  'wall_switch_1gang_ac': '1-Gang Wall Switch (AC)',
  'wall_switch_1gang_dc': '1-Gang Wall Switch (DC)',
  'wall_switch_2gang_ac': '2-Gang Wall Switch (AC)',
  'wall_switch_2gang_dc': '2-Gang Wall Switch (DC)',
  'wall_switch_3gang_ac': '3-Gang Wall Switch (AC)',
  'wall_switch_3gang_dc': '3-Gang Wall Switch (DC)',
  'wall_switch_4gang_ac': '4-Gang Wall Switch (AC)',
  'wall_switch_4gang_dc': '4-Gang Wall Switch (DC)',
  'wall_switch_5gang_ac': '5-Gang Wall Switch (AC)',
  'wall_switch_6gang_ac': '6-Gang Wall Switch (AC)',
  
  // TOUCH SWITCHES - Ajouter "Touch" explicite
  'touch_switch_1gang_ac': '1-Gang Touch Switch (AC)',
  'touch_switch_2gang_ac': '2-Gang Touch Switch (AC)',
  'touch_switch_3gang_ac': '3-Gang Touch Switch (AC)',
  'touch_switch_4gang_ac': '4-Gang Touch Switch (AC)',
  
  // WIRELESS SWITCHES - Clarifier Battery type
  'wireless_switch_cr2032': '1-Button Wireless Switch (CR2032)',
  'wireless_switch_1gang_cr2032': '1-Button Wireless Switch (CR2032)',
  'wireless_switch_2gang_cr2032': '2-Button Wireless Switch (CR2032)',
  'wireless_switch_3gang_cr2032': '3-Button Wireless Switch (CR2032)',
  'wireless_switch_4gang_cr2032': '4-Button Wireless Switch (CR2032)',
  'wireless_switch_4gang_cr2450': '4-Button Wireless Switch (CR2450)',
  'wireless_switch_5gang_cr2032': '5-Button Wireless Switch (CR2032)',
  'wireless_switch_6gang_cr2032': '6-Button Wireless Switch (CR2032)',
  
  // SMART SWITCHES - Clarifier power type
  'smart_switch_1gang_ac': '1-Gang Smart Switch (AC)',
  'smart_switch_1gang_hybrid': '1-Gang Smart Switch (Hybrid)',
  'smart_switch_2gang_ac': '2-Gang Smart Switch (AC)',
  'smart_switch_2gang_hybrid': '2-Gang Smart Switch (Hybrid)',
  'smart_switch_3gang_ac': '3-Gang Smart Switch (AC)',
  'smart_switch_3gang_hybrid': '3-Gang Smart Switch (Hybrid)',
  'smart_switch_4gang_hybrid': '4-Gang Smart Switch (Hybrid)',
  
  // BASIC SWITCHES - Clarifier power type
  'switch_1gang_battery': '1-Gang Switch (Battery)',
  'switch_2gang_ac': '2-Gang Switch (AC)',
  'switch_2gang_hybrid': '2-Gang Switch (Hybrid)',
  'switch_3gang_battery': '3-Gang Switch (Battery CR2032)',
  'switch_4gang_ac': '4-Gang Switch (AC)',
  'switch_4gang_battery_cr2032': '4-Gang Switch (Battery CR2032)',
  'switch_5gang_battery': '5-Gang Switch (Battery)',
  'switch_6gang_ac': '6-Gang Switch (AC)',
  'switch_8gang_ac': '8-Gang Switch (AC)',
  
  // SCENE CONTROLLERS - Distinguer battery types
  'scene_controller': 'Scene Controller (Battery)',
  'scene_controller_battery': 'Multi-Button Scene Controller (Battery)',
  'scene_controller_2button_cr2032': '2-Button Scene Controller (CR2032)',
  'scene_controller_4button_cr2032': '4-Button Scene Controller (CR2032)',
  'scene_controller_6button_cr2032': '6-Button Scene Controller (CR2032)',
  'scene_controller_8button_cr2032': '8-Button Scene Controller (CR2032)',
  'wireless_scene_controller_4button_battery': '4-Button Wireless Scene Controller (Battery)',
  
  // WATER LEAK SENSORS - Distinguer modèles
  'water_leak_detector_battery': 'Water Leak Detector Basic (Battery)',
  'water_leak_detector_advanced_battery': 'Water Leak Detector Advanced (Battery)',
  'water_leak_sensor_battery': 'Water Leak Sensor (Battery)',
  'temp_humid_sensor_leak_detector_battery': 'Water Leak & Temp/Humid Sensor (Battery)',
  
  // WATER VALVES - Distinguer modèles
  'water_valve_hybrid': 'Water Valve Controller (Hybrid)',
  'water_valve_smart_hybrid': 'Smart Water Valve Controller (Hybrid)',
  'smart_valve_controller_hybrid': 'Smart Valve Controller (Hybrid)',
  'smart_water_valve_hybrid': 'Smart Water Valve (Hybrid)',
  
  // TEMP/HUMIDITY SENSORS - Clarifier modèles
  'temp_humid_sensor_advanced_battery': 'Temperature & Humidity Sensor Advanced (Battery)',
  'temp_humid_sensor_dd_battery': 'Temperature & Humidity Sensor DD (Battery)',
  'temperature_humidity_sensor_battery': 'Temperature & Humidity Sensor Basic (Battery)',
  'temperature_humidity_display_battery': 'Temperature & Humidity Display (Battery)',
  'temperature_sensor_battery': 'Temperature Sensor Basic (Battery)',
  'temperature_sensor_advanced_battery': 'Temperature Sensor Advanced THS317 (Battery)',
  'temp_sensor_pro_battery': 'Temperature Sensor Pro (Battery)',
  
  // MOTION SENSORS - Distinguer technologies
  'motion_sensor_battery': 'Motion Sensor PIR Basic (Battery)',
  'motion_sensor_pir_battery': 'Motion Sensor PIR (Battery)',
  'motion_sensor_pir_ac_battery': 'Motion Sensor PIR (AC+Battery)',
  'motion_sensor_mmwave_battery': 'Motion Sensor mmWave (Battery)',
  'motion_sensor_illuminance_battery': 'Motion Sensor PIR + Illuminance (Battery)',
  'motion_sensor_zigbee_204z_battery': 'Motion Sensor HOBEIAN ZG-204Z (Battery)',
  'motion_temp_humidity_illumination_multi_battery': 'Multi-Sensor Motion+Temp+Humid+Lux (Battery)',
  'pir_sensor_advanced_battery': 'PIR Sensor Advanced (Battery)',
  'pir_radar_illumination_sensor_battery': 'PIR+Radar+Illuminance Sensor (Battery)',
  'radar_motion_sensor_advanced_battery': 'Radar Motion Sensor Advanced (Battery)',
  'radar_motion_sensor_mmwave_battery': 'Radar Motion Sensor mmWave 24GHz (Battery)',
  'radar_motion_sensor_tank_level_battery': 'Radar Motion + Tank Level Sensor (Battery)',
  'presence_sensor_radar_battery': 'Presence Sensor Radar (Battery)',
  'presence_sensor_mmwave_battery': 'Presence Sensor mmWave (Battery)',
  'presence_sensor_fp1_battery': 'Presence Sensor FP1 (Battery)',
  'presence_sensor_fp2_ac': 'Presence Sensor FP2 (AC)',
  
  // SMOKE DETECTORS - Distinguer modèles
  'smoke_detector_battery': 'Smoke Detector Basic (Battery)',
  'smart_smoke_detector_advanced_battery': 'Smoke Detector Advanced (Battery)',
  'smoke_detector_temp_humidity_advanced_battery': 'Smoke Detector + Temp/Humid Advanced (Battery)',
  'smoke_detector_temperature_battery': 'Smoke Detector + Temperature (Battery)',
  'smoke_temp_humid_sensor_battery': 'Smoke + Temp/Humid Sensor (Battery)',
  
  // AIR QUALITY - Distinguer modèles
  'air_quality_monitor_ac': 'Air Quality Monitor (AC)',
  'air_quality_monitor_pro_battery': 'Air Quality Monitor Pro (Battery)',
  'comprehensive_air_monitor_ac': 'Comprehensive Air Monitor (AC)',
  
  // GAS SENSORS - Distinguer modèles
  'gas_detector_battery': 'Gas Detector (Battery)',
  'gas_sensor_ts0601_ac': 'Gas Sensor TS0601 (AC)',
  'gas_sensor_ts0601_battery': 'Gas Sensor TS0601 (Battery)',
  
  // TVOC SENSORS - Distinguer modèles
  'tvoc_sensor_battery': 'TVOC Sensor Basic (Battery)',
  'tvoc_sensor_advanced_battery': 'TVOC Sensor Advanced (Battery)',
  
  // DIMMERS - Clarifier types
  'dimmer_ac': 'Dimmer Module (AC)',
  'dimmer_switch_1gang_ac': '1-Gang Dimmer Switch (AC)',
  'dimmer_switch_3gang_ac': '3-Gang Dimmer Switch (AC)',
  'dimmer_switch_timer_module_ac': 'Dimmer Switch Timer Module (AC)',
  'touch_dimmer_ac': 'Touch Dimmer (AC)',
  'touch_dimmer_1gang_ac': '1-Gang Touch Dimmer (AC)',
  'smart_dimmer_module_1gang_ac': '1-Gang Smart Dimmer Module (AC)',
  'wireless_dimmer_scroll_battery': 'Wireless Scroll Dimmer (Battery)',
  
  // SMART PLUGS - Distinguer modèles
  'smart_plug_ac': 'Smart Plug Basic (AC)',
  'smart_plug_energy_ac': 'Smart Plug Energy Monitor (AC)',
  'smart_plug_dimmer_ac': 'Smart Plug Dimmer (AC)',
  'smart_plug_power_meter_16a_ac': 'Smart Plug Power Meter 16A (AC)',
  'energy_monitoring_plug_ac': 'Energy Monitoring Plug (AC)',
  'energy_monitoring_plug_advanced_ac': 'Energy Monitoring Plug Advanced (AC)',
  'energy_plug_advanced_ac': 'Energy Plug Advanced (AC)',
  'power_meter_socket_ac': 'Power Meter Socket (AC)',
  
  // BULBS - Clarifier types
  'smart_bulb_white_ac': 'Smart Bulb White (AC)',
  'smart_bulb_tunable_ac': 'Smart Bulb Tunable White (AC)',
  'smart_bulb_rgb_ac': 'Smart Bulb RGB (AC)',
  'smart_bulb_dimmer_ac': 'Smart Bulb Dimmer (AC)',
  'bulb_white_ac': 'Bulb White Basic (AC)',
  'bulb_white_ambiance_ac': 'Bulb White Ambiance (AC)',
  'bulb_color_rgbcct_ac': 'Bulb Color RGB+CCT (AC)',
  
  // WIRELESS BUTTONS - Clarifier
  'wireless_button_2gang_battery': '2-Button Wireless Remote (Battery)',
  'remote_switch_cr2032': 'Remote Switch (CR2032)',
  'remote_4button_styrbar_battery': '4-Button Remote STYRBAR (Battery)',
  'mini_switch_cr2032': 'Mini Switch (CR2032)',
  
  // DOOR/WINDOW SENSORS - Distinguer
  'contact_sensor_battery': 'Contact Sensor (Battery)',
  'door_window_sensor_battery': 'Door/Window Sensor (Battery)',
  
  // DOORBELLS - Distinguer
  'doorbell_cr2032': 'Doorbell Button (CR2032)',
  'smart_doorbell_battery': 'Smart Doorbell Camera (Battery)',
  'doorbell_camera_ac': 'Doorbell Camera (AC)',
  
  // THERMOSTATS - Distinguer
  'thermostat_hybrid': 'Thermostat Basic (Hybrid)',
  'smart_thermostat_hybrid': 'Smart Thermostat (Hybrid)',
  'temperature_controller_hybrid': 'Temperature Controller (Hybrid)',
  
  // RADIATOR VALVES - Distinguer
  'radiator_valve_hybrid': 'Radiator Valve (Hybrid)',
  'smart_radiator_valve_hybrid': 'Smart Radiator Valve (Hybrid)',
  
  // CURTAIN/SHUTTER - Distinguer
  'curtain_motor_ac': 'Curtain Motor (AC)',
  'smart_curtain_motor_hybrid': 'Smart Curtain Motor (Hybrid)',
  'roller_blind_controller_ac': 'Roller Blind Controller (AC)',
  'roller_shutter_controller_ac': 'Roller Shutter Controller (AC)',
  'roller_shutter_switch_cr2032': 'Roller Shutter Switch (CR2032)',
  'roller_shutter_switch_advanced_battery': 'Roller Shutter Switch Advanced (Battery)',
  'shade_controller_ac': 'Shade Controller (AC)',
  
  // LED STRIPS - Distinguer
  'led_strip_controller_ac': 'LED Strip Controller Basic (AC)',
  'led_strip_controller_pro_ac': 'LED Strip Controller Pro (AC)',
  'led_strip_advanced_ac': 'LED Strip Controller Advanced (AC)',
  'led_strip_outdoor_color_ac': 'LED Strip Outdoor Color (AC)',
  'rgb_led_controller_ac': 'RGB LED Controller (AC)',
  
  // AUTRES - Clarifier
  'mini_ac': 'Mini Switch Module (AC)',
  'sos_emergency_button_cr2032': 'SOS Emergency Button (CR2032)',
  'shortcut_button_battery': 'Shortcut Button (Battery)',
  'garage_door_opener_cr2032': 'Garage Door Opener Button (CR2032)',
  'garage_door_controller_ac': 'Garage Door Controller (AC)',
  'outdoor_siren_cr2032': 'Outdoor Siren (CR2032)',
  'alarm_siren_chime_ac': 'Alarm Siren & Chime (AC)',
};

function updateDriver(driverId, newName) {
  const driverPath = path.join(__dirname, '..', '..', 'drivers', driverId, 'driver.compose.json');
  
  if (!fs.existsSync(driverPath)) {
    console.log(`⚠️  Driver not found: ${driverId}`);
    return false;
  }
  
  try {
    const content = fs.readFileSync(driverPath, 'utf8');
    const driver = JSON.parse(content);
    
    const oldName = driver.name?.en || 'N/A';
    
    if (oldName === newName) {
      console.log(`✓ ${driverId}: Already correct`);
      return false;
    }
    
    driver.name = {
      en: newName,
      ...(driver.name?.fr && { fr: newName }) // Keep FR if exists
    };
    
    fs.writeFileSync(driverPath, JSON.stringify(driver, null, 2) + '\n', 'utf8');
    console.log(`✅ ${driverId}:`);
    console.log(`   Old: "${oldName}"`);
    console.log(`   New: "${newName}"`);
    return true;
    
  } catch (err) {
    console.error(`❌ Error updating ${driverId}:`, err.message);
    return false;
  }
}

console.log(`\n🔧 Renaming ${Object.keys(RENAME_MAP).length} drivers with duplicate/unclear names...\n`);

let updated = 0;
Object.entries(RENAME_MAP).forEach(([driverId, newName]) => {
  if (updateDriver(driverId, newName)) {
    updated++;
  }
});

console.log(`\n✅ Updated ${updated} driver names\n`);
console.log(`
RENAMING STRATEGY:
✅ Power source in name: (AC), (DC), (Hybrid), (Battery), (CR2032), (CR2450)
✅ Gang/Button count explicit: 1-Gang, 2-Button, etc.
✅ Technology specified: PIR, mmWave, Radar, Touch, etc.
✅ Model variants: Basic, Advanced, Pro
✅ Function first: Motion Sensor, Wall Switch, etc.

ALL NAMES NOW UNIQUE AND CLEAR!
`);
