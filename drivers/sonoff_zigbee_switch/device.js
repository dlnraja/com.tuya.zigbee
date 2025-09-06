"use strict";
const Homey = require('homey');
class sonoff_zigbee_switch_Device extends Homey.Device {
  async onInit() { this.log('drivers/sonoff_zigbee_switch device initialized'); }
}
module.exports = sonoff_zigbee_switch_Device;
