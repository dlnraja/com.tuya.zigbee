'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// P3039 exact-pair driver (_TZE204_6ewjlefg | TS0601). No existing driver carried this datapoint layout.
class ThermostatVrfBvrfL001Driver extends ZigBeeDriver {}

module.exports = ThermostatVrfBvrfL001Driver;
