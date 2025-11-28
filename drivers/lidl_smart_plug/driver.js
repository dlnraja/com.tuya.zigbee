'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');
class Driver extends ZigBeeDriver { onInit() { this.log('lidl_smart_plug driver initialized'); } }
module.exports = Driver;
