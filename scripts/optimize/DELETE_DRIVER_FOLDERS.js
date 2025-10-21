#!/usr/bin/env node
'use strict';

/**
 * DELETE DRIVER FOLDERS
 * Supprime physiquement les dossiers drivers pour .homeycompose
 */

const fs = require('fs');
const path = require('path');

console.log('\n🗑️  DELETE DRIVER FOLDERS\n');

const driversDir = path.join(__dirname, '../../drivers');

// Liste des drivers à supprimer (les 101 identifiés + Xiaomi/Aqara)
const toDelete = [
  // Xiaomi (ont app dédiée)
  'xiaomi_button_wireless_cr2032',
  'xiaomi_contact_sensor_cr1632',
  'xiaomi_cube_controller_cr2450',
  'xiaomi_motion_sensor_cr2450',
  'xiaomi_smart_plug_ac',
  'xiaomi_temperature_humidity_cr2032',
  'xiaomi_vibration_sensor_cr2450',
  'xiaomi_water_leak_cr2032',
  
  // Aqara (ont app dédiée)
  'aqara_motion_sensor_pir_basic_ac',
  'aqara_motion_sensor_pir_basic_cr2450',
  'aqara_motion_sensor_pir_basic_other',
  'aqara_smoke_detector_basic_cr123a',
  'aqara_temperature_humidity_display_battery',
  'aqara_temperature_humidity_sensor_battery',
  
  // Redundant
  'moes_ceiling_light_rgb_ac',
  'tuya_pet_feeder',
  'tuya_tank_level_monitor',
  'zemismart_ceiling_light_controller_ac',
  'zemismart_co_detector_pro',
  'zemismart_fan_controller_ac',
  'zemismart_hvac_controller_ac',
  'zemismart_milight_controller_ac',
  'zemismart_motion_sensor_zigbee_204z_battery',
  'zemismart_pool_pump_controller_ac',
  'zemismart_projector_screen_controller_ac',
  'zemismart_radar_motion_sensor_tank_level_battery',
  'zemismart_relay_switch_1gang_ac',
  'zemismart_rgb_led_controller_ac',
  'zemismart_shade_controller_ac',
  'zemismart_smart_garden_sprinkler_internal',
  'zemismart_smart_irrigation_controller_internal',
  'zemismart_solar_panel_controller',
  'zemismart_solar_panel_controller_hybrid',
  'zemismart_temp_humid_sensor_dd_battery',
  'zemismart_temp_sensor_pro',
];

let deleted = 0;
let errors = 0;

toDelete.forEach(driverName => {
  const driverPath = path.join(driversDir, driverName);
  
  if (fs.existsSync(driverPath)) {
    try {
      fs.rmSync(driverPath, { recursive: true, force: true });
      console.log(`✅ Deleted: ${driverName}`);
      deleted++;
    } catch (err) {
      console.error(`❌ Error deleting ${driverName}:`, err.message);
      errors++;
    }
  } else {
    console.log(`⚠️  Not found: ${driverName}`);
  }
});

console.log(`\n📊 RESULTS:\n`);
console.log(`Deleted: ${deleted}`);
console.log(`Errors: ${errors}`);
console.log(`Not found: ${toDelete.length - deleted - errors}`);

if (deleted > 0) {
  console.log(`\n✅ Folders deleted! Now run:\n`);
  console.log(`homey app build`);
  console.log(`# This will regenerate app.json with fewer drivers\n`);
}
