'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// P3039 exact-pair driver (_TZE20C1000000_p3g8xiug | TS0601). No existing driver carried this datapoint layout.
class EnergyMeter3chBidirectionalDriver extends ZigBeeDriver {}

module.exports = EnergyMeter3chBidirectionalDriver;
