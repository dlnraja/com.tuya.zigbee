'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// P3039 exact-pair driver (PIRIV01 | TS0601). No existing driver carried this datapoint layout.
class MotionSensorExcelluxZg104plvDriver extends ZigBeeDriver {}

module.exports = MotionSensorExcelluxZg104plvDriver;
