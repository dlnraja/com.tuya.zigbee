'use strict';

// P2958: same runtime as water_leak_sensor; dedicated so the exact padded manufacturerName couple(s)
// "AOYAN"|AY222Z, "AOYAN  "|AY222Z live on exactly one driver (no cross-driver duplicate).
// Source: Z2M src/devices/tuya.ts TS0207_water_leak_detector whiteLabel AY222Z (PR #12488). Credit: Koenkk/zigbee-herdsman-converters.
module.exports = require('../water_leak_sensor/device');
