'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// P3068 exact-pair driver (_TZE284_ikul00sx | TS0601, fan with 5 speeds + light with 5 levels), moved out of humidifier.
class FanLightTuya5LevelsDriver extends ZigBeeDriver {}

module.exports = FanLightTuya5LevelsDriver;
