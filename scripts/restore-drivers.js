'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// List of 60 broken drivers
const broken = [
  'air_purifier','air_purifier_curtain','air_purifier_din','air_purifier_lcdtemphumidsensor',
  'air_purifier_motion','air_purifier_quality','air_purifier_sensor','button_wireless_usb',
  'curtain_motor_tilt','device_air_purifier_climate','device_air_purifier_humidifier',
  'device_air_purifier_radiator','device_air_purifier_thermostat','device_din_rail_meter',
  'device_generic_tuya_universal','device_plug_smart','device_radiator_valve_smart',
  'device_radiator_valve_thermostat','dimmer_3gang','din_rail_switch','diy_custom_zigbee',
  'fingerprint_lock','formaldehyde_sensor','generic_tuya','humidifier','hvac_air_conditioner',
  'hvac_dehumidifier','lcdtemphumidsensor_plug_energy','led_controller_cct',
  'led_controller_dimmable','led_controller_rgb','motion_sensor_radar_mmwave','pet_feeder',
  'pool_pump','presence_sensor_ceiling','remote_button_wireless_plug','remote_button_wireless_usb',
  'sensor_climate_smart','sensor_contact_plug','sensor_lcdtemphumidsensor_soil',
  'sensor_motion_radar','sensor_presence_radar','smart_breaker','smart_heater',
  'smart_heater_controller','smart_rcbo','soil_sensor','switch_dimmer_1gang','switch_plug_1',
  'switch_plug_2','thermostat_4ch','thermostat_tuya_dp','usb_dongle_dual_repeater',
  'usb_dongle_triple','valve_single','wall_switch_1gang_1way','wall_switch_2gang_1way',
  'water_leak_sensor','wifi_cover','wifi_siren'
];

// Try to restore from the clean commit
const cleanCommit = '60ccf5f83';
let restored = 0;
let failed = 0;

broken.forEach(dir => {
  const fp = `drivers/${dir}/driver.js`;
  try {
    // Get clean version
    const clean = execSync(`git show ${cleanCommit}:${fp}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    // Verify it's valid
    const tmpFile = path.join(__dirname, '..', 'tmp_check.js');
    fs.writeFileSync(tmpFile, clean, 'utf8');
    execSync(`node -c "${tmpFile}"`, { stdio: 'pipe' });
    fs.unlinkSync(tmpFile);
    // Write clean version
    fs.writeFileSync(path.join(__dirname, '..', fp), clean, 'utf8');
    restored++;
    console.log('✅ Restored:', dir);
  } catch (e) {
    failed++;
    console.log('❌ Cannot restore:', dir, '-', (e.stderr || e.message || '').toString().substring(0, 60));
  }
});

console.log(`\nRestored: ${restored} | Failed: ${failed}`);