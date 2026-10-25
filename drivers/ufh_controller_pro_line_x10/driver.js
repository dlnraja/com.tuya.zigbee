'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// P3039 exact-pair driver (_TZE204_rfpyqax9, _TZE284_rfpyqax9 | TS0601). No existing driver carried this datapoint layout.
class UfhControllerProLineX10Driver extends ZigBeeDriver {}

module.exports = UfhControllerProLineX10Driver;
