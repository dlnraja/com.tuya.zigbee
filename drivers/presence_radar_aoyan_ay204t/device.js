'use strict';

// P2958: same runtime as presence_sensor_radar; dedicated so the exact padded manufacturerName couple(s)
// "AOYAN  "|AY204T live on exactly one driver (no cross-driver duplicate).
// Source: Z2M src/devices/hobeian.ts ZG-204ZV whiteLabel AY204T {modelID:"AY204T", manufacturerName:"AOYAN  "}. Credit: Koenkk/zigbee-herdsman-converters.
module.exports = require('../presence_sensor_radar/device');
