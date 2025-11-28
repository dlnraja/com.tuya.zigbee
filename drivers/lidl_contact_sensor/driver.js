'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');
class Driver extends ZigBeeDriver { onInit() { this.log('lidl_contact_sensor driver initialized'); } }
module.exports = Driver;
