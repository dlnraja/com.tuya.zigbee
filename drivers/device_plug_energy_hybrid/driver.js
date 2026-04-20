'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');
class PlugEnergyDriver extends ZigBeeDriver {
  onInit() { super.onInit(); }
}
module.exports = PlugEnergyDriver;