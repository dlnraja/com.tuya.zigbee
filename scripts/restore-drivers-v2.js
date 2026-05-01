'use strict';
const { execSync } = require('child_process');

const remaining = [
  'air_purifier_curtain','air_purifier_din','air_purifier_lcdtemphumidsensor',
  'air_purifier_motion','air_purifier_quality','air_purifier_sensor','button_wireless_usb',
  'device_air_purifier_climate','device_air_purifier_humidifier',
  'device_air_purifier_radiator','device_air_purifier_thermostat','device_din_rail_meter',
  'device_generic_tuya_universal','device_plug_smart','device_radiator_valve_smart',
  'device_radiator_valve_thermostat','lcdtemphumidsensor_plug_energy',
  'remote_button_wireless_plug','remote_button_wireless_usb',
  'sensor_climate_smart','sensor_contact_plug','sensor_lcdtemphumidsensor_soil',
  'sensor_motion_radar','sensor_presence_radar','thermostat_4ch'
];

// Try multiple commits
const commits = ['c261b6f48', '2d2205b43', '550a0607a', '05b0a2745'];
let fixed = 0;

remaining.forEach(dir => {
  const fp = `drivers/${dir}/driver.js`;
  let restored = false;
  
  for (const commit of commits) {
    try {
      execSync(`git checkout ${commit} -- "${fp}"`, { stdio: 'pipe' });
      execSync(`node -c "${fp}"`, { stdio: 'pipe' });
      console.log('✅ Restored from', commit.substring(0,7), ':', dir);
      fixed++;
      restored = true;
      break;
    } catch (e) {
      // Try next commit
      try { execSync(`git checkout HEAD -- "${fp}"`, { stdio: 'pipe' }); } catch(e2) {}
    }
  }
  
  if (!restored) {
    console.log('❌ Cannot restore:', dir);
  }
});

console.log('\nFixed:', fixed, '/', remaining.length);