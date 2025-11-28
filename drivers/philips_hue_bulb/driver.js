'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');
class Driver extends ZigBeeDriver { onInit() { this.log('philips_hue_bulb driver initialized'); } }
module.exports = Driver;
