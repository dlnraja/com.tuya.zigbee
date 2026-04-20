'use strict';
const fs = require('fs');
const path = require('path');
const B = path.resolve(__dirname, '..', 'drivers');
const SRC = path.join(B, 'wifi_heater');
const ids = [
  'wifi_switch','wifi_switch_2gang','wifi_switch_3gang','wifi_switch_4gang',
  'wifi_plug','wifi_dimmer','wifi_light','wifi_cover',
  'wifi_thermostat','wifi_fan','wifi_humidifier','wifi_siren',
  'wifi_garage_door','wifi_sensor','wifi_water_valve',
  'wifi_air_purifier','wifi_ir_remote','wifi_pet_feeder','wifi_door_lock','wifi_robot_vacuum'
];
for (const id of ids) {
  const d = path.join(B, id);
  fs.mkdirSync(path.join(d, 'pair'), { recursive: true });
  fs.mkdirSync(path.join(d, 'assets', 'images'), { recursive: true });
  fs.copyFileSync(path.join(SRC, 'pair', 'configure.html'), path.join(d, 'pair', 'configure.html'));
  fs.copyFileSync(path.join(SRC, 'assets', 'images', 'small.png'), path.join(d, 'assets', 'images', 'small.png'));
  fs.copyFileSync(path.join(SRC, 'assets', 'images', 'large.png'), path.join(d, 'assets', 'images', 'large.png'));
  console.log('Created:', id);
}
console.log('Done:', ids.length, 'drivers');
