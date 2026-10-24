'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// P3013: dedicated master-only driver; runtime lives in device.js (base driver subclass).
class Driver extends ZigBeeDriver {}

module.exports = Driver;
