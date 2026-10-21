'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// P2958: dedicated driver for the exact Z2M fingerprint (padding kept byte-exact). Native clusters for pairing.
class WaterLeakAoyanAy222zDriver extends ZigBeeDriver {}

module.exports = WaterLeakAoyanAy222zDriver;
