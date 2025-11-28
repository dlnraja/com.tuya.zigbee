'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');
class Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('noise_sensor initializing...');
    try {
      const TuyaEF00Manager = require('../../lib/tuya/TuyaEF00Manager');
      this.tuyaEF00Manager = new TuyaEF00Manager(this);
      await this.tuyaEF00Manager.initialize(zclNode);
    } catch (e) { this.log('Tuya DP not available'); }
    this.log('noise_sensor initialized');
  }
}
module.exports = Device;
