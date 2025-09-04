const Homey = require('homey');

class Tuya_zigbee_switchDriver extends Homey.Driver {
  async onInit() {
    this.log('Tuya_zigbee_switch driver initialized');
  }
}

module.exports = Tuya_zigbee_switchDriver;