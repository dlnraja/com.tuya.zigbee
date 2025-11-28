'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');
class Driver extends ZigBeeDriver { onInit() { this.log('formaldehyde_sensor driver init'); } }
module.exports = Driver;
