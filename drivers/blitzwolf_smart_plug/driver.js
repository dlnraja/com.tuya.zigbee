'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');
class Driver extends ZigBeeDriver { onInit() { this.log('blitzwolf_smart_plug driver init'); } }
module.exports = Driver;
