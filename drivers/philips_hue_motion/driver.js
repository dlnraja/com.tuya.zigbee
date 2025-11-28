'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');
class Driver extends ZigBeeDriver { onInit() { this.log('philips_hue_motion driver initialized'); } }
module.exports = Driver;
