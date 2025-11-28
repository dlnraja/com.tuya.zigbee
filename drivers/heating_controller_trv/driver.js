'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');
class Driver extends ZigBeeDriver { onInit() { this.log('heating_controller_trv driver initialized'); } }
module.exports = Driver;
