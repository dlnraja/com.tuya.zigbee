'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// P3039 exact-pair driver (_TZE200_yp5tsi3y | TS0601). No existing driver carried this datapoint layout.
class WallSwitchRfEws1154zDriver extends ZigBeeDriver {}

module.exports = WallSwitchRfEws1154zDriver;
