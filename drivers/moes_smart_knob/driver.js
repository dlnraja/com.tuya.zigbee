'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');
class Driver extends ZigBeeDriver { onInit() { this.log('moes_smart_knob driver init'); } }
module.exports = Driver;
