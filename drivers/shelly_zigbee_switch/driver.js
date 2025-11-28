'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');
class Driver extends ZigBeeDriver { onInit() { this.log('shelly_zigbee_switch driver init'); } }
module.exports = Driver;
