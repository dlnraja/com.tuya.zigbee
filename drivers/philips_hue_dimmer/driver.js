'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');
class Driver extends ZigBeeDriver { onInit() { this.log('philips_hue_dimmer driver init'); } }
module.exports = Driver;
