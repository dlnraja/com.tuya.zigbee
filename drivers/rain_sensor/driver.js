'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');
class Driver extends ZigBeeDriver { onInit() { this.log('rain_sensor driver init'); } }
module.exports = Driver;
