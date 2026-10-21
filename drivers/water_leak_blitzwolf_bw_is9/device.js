'use strict';

// P2958: same runtime as water_leak_sensor; dedicated so the exact padded manufacturerName couple(s)
// "_TZ3000_eit7p838 "|TS0207 live on exactly one driver (no cross-driver duplicate).
// Source: Z2M src/devices/blitzwolf.ts BW-IS9 tuya.fingerprint("TS0207", ["_TZ3000_eit7p838 "]). Credit: Koenkk/zigbee-herdsman-converters.
module.exports = require('../water_leak_sensor/device');
