'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');
class Driver extends ZigBeeDriver { onInit() { this.log('ikea_tradfri_bulb driver initialized'); } }
module.exports = Driver;
