'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// P3039 exact-pair driver (_TZE284_1oft6qso | TS0601). No existing driver carried this datapoint layout.
class UfhControllerCh8zDriver extends ZigBeeDriver {}

module.exports = UfhControllerCh8zDriver;
