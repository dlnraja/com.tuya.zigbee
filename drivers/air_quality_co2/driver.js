'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');
class Driver extends ZigBeeDriver { onInit() { this.log('air_quality_co2 driver init'); } }
module.exports = Driver;
