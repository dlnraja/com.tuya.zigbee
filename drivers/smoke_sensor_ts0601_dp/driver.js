'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// P3039 exact-pair driver (_TZE200_yh7aoahi | TS0601). No existing driver carried this datapoint layout.
class SmokeSensorTs0601DpDriver extends ZigBeeDriver {}

module.exports = SmokeSensorTs0601DpDriver;
