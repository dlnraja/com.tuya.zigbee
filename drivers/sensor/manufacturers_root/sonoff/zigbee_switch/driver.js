'use strict';
const Homey = require('homey');
class sonoff_zigbee_switch_Driver extends Homey.Driver {
  async onInit() { this.log('sonoff/zigbee_switch driver initialized'); }
  async onPairListDevices() { return []; }
}
module.exports = sonoff_zigbee_switch_Driver;
