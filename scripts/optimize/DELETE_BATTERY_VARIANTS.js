#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('\n🗑️  DELETE BATTERY/ADVANCED VARIANT FOLDERS\n');

const driversDir = path.join(__dirname, '../../drivers');

// List all battery/advanced variants to keep only base
const toDelete = [
  // From analysis - keep base, delete variants
  'zemismart_tvoc_sensor_aaa',
  'zemismart_tvoc_sensor_advanced_aaa',
  'zemismart_tvoc_sensor_advanced_battery',
  'zemismart_tvoc_sensor_advanced_cr2032',
  'zemismart_tvoc_sensor_battery',
  'zemismart_tvoc_sensor_cr2032',
  
  'zemismart_water_leak_detector_advanced_aaa',
  'zemismart_water_leak_detector_advanced_battery',
  'zemismart_water_leak_detector_advanced_cr2032',
  'zemismart_water_leak_detector_basic_aaa',
  'zemismart_water_leak_detector_basic_cr2032',
  'zemismart_water_leak_detector_battery',
  
  'zemismart_motion_sensor_mmwave_advanced_aaa',
  'zemismart_motion_sensor_mmwave_advanced_cr2032',
  'zemismart_motion_sensor_mmwave_basic_aaa',
  'zemismart_motion_sensor_mmwave_basic_cr2032',
  'zemismart_motion_sensor_mmwave_battery',
  
  'zemismart_motion_sensor_pir_advanced_aaa',
  'zemismart_motion_sensor_pir_advanced_cr2032',
  'zemismart_motion_sensor_pir_basic_aaa',
  'zemismart_motion_sensor_pir_basic_cr2032',
  'zemismart_motion_sensor_pir_battery',
  
  'tuya_smoke_detector_basic_aaa',
  'tuya_smoke_detector_basic_cr2032',
  'tuya_smoke_detector_battery',
  
  'tuya_soil_moisture_sensor_aaa',
  'tuya_soil_moisture_sensor_battery',
  'tuya_soil_moisture_sensor_cr2032',
  
  'zemismart_co2_sensor_basic_aaa',
  'zemismart_co2_sensor_basic_cr2032',
  'zemismart_co2_sensor_battery',
  
  'zemismart_co_detector_pro_aaa',
  'zemismart_co_detector_pro_battery',
  'zemismart_co_detector_pro_cr2032',
  
  'zemismart_door_window_sensor_basic_aaa',
  'zemismart_door_window_sensor_basic_cr2032',
  'zemismart_door_window_sensor_battery',
  
  'zemismart_formaldehyde_sensor_aaa',
  'zemismart_formaldehyde_sensor_battery',
  'zemismart_formaldehyde_sensor_cr2032',
  
  'zemismart_gas_sensor_ts0601_aa',
  'zemismart_gas_sensor_ts0601_aaa',
  'zemismart_gas_sensor_ts0601_battery',
  
  'zemismart_lux_sensor_aaa',
  'zemismart_lux_sensor_battery',
  'zemismart_lux_sensor_cr2032',
  
  'zemismart_multisensor_aaa',
  'zemismart_multisensor_battery',
  'zemismart_multisensor_cr2032',
  
  'zemismart_noise_level_sensor_aaa',
  'zemismart_noise_level_sensor_battery',
  'zemismart_noise_level_sensor_cr2032',
  
  'zemismart_pm25_sensor_aaa',
  'zemismart_pm25_sensor_battery',
  'zemismart_pm25_sensor_cr2032',
  
  'zemismart_pressure_sensor_aaa',
  'zemismart_pressure_sensor_battery',
  'zemismart_pressure_sensor_cr2032',
  
  'zemismart_soil_moisture_temperature_sensor_aaa',
  'zemismart_soil_moisture_temperature_sensor_battery',
  'zemismart_soil_moisture_temperature_sensor_cr2032',
  
  'zemismart_temp_sensor_pro_aaa',
  'zemismart_temp_sensor_pro_battery',
  'zemismart_temp_sensor_pro_cr2032',
  
  'zemismart_vibration_sensor_aaa',
  'zemismart_vibration_sensor_battery',
  'zemismart_vibration_sensor_cr2032',
  
  'avatto_thermostat_aaa',
  'avatto_thermostat_cr2032',
  
  'moes_bulb_white_aaa',
  'moes_bulb_white_cr2032',
  
  'moes_climate_monitor_aaa',
  'moes_climate_monitor_cr2032',
  
  'moes_smart_switch_1gang_aaa',
  'moes_smart_switch_1gang_cr2032',
  
  'moes_temp_humidity_sensor_basic_aaa',
  'moes_temp_humidity_sensor_basic_cr2032',
  
  'tuya_door_controller_aaa',
  'tuya_door_controller_cr2032',
  
  'tuya_doorbell_button_aaa',
  'tuya_doorbell_button_cr2032',
  
  'tuya_garage_door_controller_aaa',
  'tuya_garage_door_controller_cr2032',
  
  'tuya_garage_door_opener_aaa',
  'tuya_garage_door_opener_cr2032',
  
  'tuya_humidity_controller_aaa',
  'tuya_humidity_controller_cr2032',
  
  'tuya_pet_feeder_aaa',
  'tuya_pet_feeder_cr2032',
  
  'tuya_siren_outdoor_aaa',
  'tuya_siren_outdoor_cr2032',
  
  'tuya_tank_level_monitor_aaa',
  'tuya_tank_level_monitor_cr2032',
  
  'tuya_temperature_controller_aaa',
  'tuya_temperature_controller_cr2032',
  
  'zemismart_curtain_motor_aaa',
  'zemismart_curtain_motor_cr2032',
  
  'zemismart_roller_blind_aaa',
  'zemismart_roller_blind_cr2032',
  
  'zemismart_roller_shutter_aaa',
  'zemismart_roller_shutter_cr2032',
  
  'zemismart_scene_controller_battery',
  
  'zemismart_smart_switch_5gang_aaa',
  'zemismart_smart_switch_5gang_cr2032',
  
  'zemismart_smoke_detector_advanced_aaa',
  'zemismart_smoke_detector_advanced_cr2032',
];

let deleted = 0;

toDelete.forEach(driverName => {
  const driverPath = path.join(driversDir, driverName);
  
  if (fs.existsSync(driverPath)) {
    try {
      fs.rmSync(driverPath, { recursive: true, force: true });
      console.log(`✅ Deleted: ${driverName}`);
      deleted++;
    } catch (err) {
      console.error(`❌ Error: ${driverName}`);
    }
  }
});

console.log(`\n📊 Deleted: ${deleted} driver folders\n`);
console.log(`Expected result: 289 - ${deleted} = ${289 - deleted} drivers\n`);
