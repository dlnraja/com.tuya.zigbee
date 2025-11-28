'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');
class Driver extends ZigBeeDriver { onInit() { this.log('lidl_bulb_color driver initialized'); } }
module.exports = Driver;
