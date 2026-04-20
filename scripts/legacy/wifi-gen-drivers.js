'use strict';
const fs = require('fs');
const path = require('path');
const B = path.resolve(__dirname, '..', 'drivers');

const ids = [
  'wifi_switch','wifi_switch_2gang','wifi_switch_3gang','wifi_switch_4gang',
  'wifi_plug','wifi_dimmer','wifi_light','wifi_cover',
  'wifi_thermostat','wifi_fan','wifi_humidifier','wifi_siren',
  'wifi_garage_door','wifi_sensor','wifi_water_valve',
  'wifi_air_purifier','wifi_ir_remote','wifi_pet_feeder','wifi_door_lock','wifi_robot_vacuum'
];

for (const id of ids) {
  const cls = id.replace(/^wifi_/, '').replace(/_(\w)/g, (_, c) => c.toUpperCase());
  const className = 'WiFi' + cls.charAt(0).toUpperCase() + cls.slice(1) + 'Driver';
  const tag = id.toUpperCase().replace(/_/g, '-');
  const code = `'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class ${className} extends TuyaLocalDriver {
  async onInit() {
    await super.onInit();
    this.log('[${tag}-DRV] Driver initialized');
  }
}

module.exports = ${className};
`;
  fs.writeFileSync(path.join(B, id, 'driver.js'), code);
  console.log('driver.js:', id);
}
console.log('Done');
