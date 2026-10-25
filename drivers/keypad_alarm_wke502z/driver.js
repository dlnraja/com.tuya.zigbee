'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// P3039 exact-pair driver (_TZE200_rt5dklro | TS0601). No existing driver carried this datapoint layout.
class KeypadAlarmWke502zDriver extends ZigBeeDriver {}

module.exports = KeypadAlarmWke502zDriver;
