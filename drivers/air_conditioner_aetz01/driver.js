'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// P3068 exact-pair driver (_TZE200_snfdqllf | TS0601, Tuya AETZ01_AC air conditioner), moved out of device_radiator_valve.
class AirConditionerAetz01Driver extends ZigBeeDriver {}

module.exports = AirConditionerAetz01Driver;
