'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '../..');
const driversPath = path.join(projectRoot, 'drivers');

const driversToFix = [
  'device_air_purifier_din_hybrid',
  'power_clamp_meter',
  'wifi_ewelink_pow',
  'wifi_power_strip',
  'wifi_sonoff_dualr3',
  'wifi_sonoff_pow_elite'
];

driversToFix.forEach(driverId => {
  const composePath = path.join(driversPath, driverId, 'driver.compose.json');
  if (fs.existsSync(composePath)) {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    if (!compose.energy) {
      compose.energy = { cumulative: true };
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
      console.log(` Fixed energy object in ${driverId}`);
    }
  }
});
