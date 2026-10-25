'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// P3039 exact-pair driver (_TZE200_7bztmfm1, _TZE204_7bztmfm1 | TS0601). No existing driver carried this datapoint layout.
class CoSensorDcrCoDriver extends ZigBeeDriver {}

module.exports = CoSensorDcrCoDriver;
