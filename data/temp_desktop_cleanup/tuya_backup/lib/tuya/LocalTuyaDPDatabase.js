'use strict';
// LocalTuya DP Database v5.5.682
const PLUG = { 1: 'onoff', 17: 'measure_current', 18: 'measure_power', 19: 'measure_voltage', 20: 'meter_power' };
const LIGHT = { 20: 'onoff', 21: 'work_mode', 22: 'dim', 23: 'light_temperature', 24: 'light_hue' };
const COVER = { 1: 'windowcoverings_state', 2: 'windowcoverings_set', 7: 'control' };
const CLIMATE = { 1: 'onoff', 2: 'target_temperature', 3: 'measure_temperature', 4: 'thermostat_mode', 13: 'measure_battery' };
const FAN = { 1: 'onoff', 3: 'dim', 8: 'oscillating', 9: 'direction' };
const SENSOR = { 1: 'alarm_motion', 2: 'measure_humidity', 3: 'measure_temperature', 4: 'measure_battery', 15: 'measure_battery' };
module.exports = { PLUG, LIGHT, COVER, CLIMATE, FAN, SENSOR };
