'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ValveDualIrrigationDriver extends ZigBeeDriver {

  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }

  async onInit() {
    await super.onInit();
    this.log('ValveDualIrrigationDriver initialized');
  }

}

module.exports = ValveDualIrrigationDriver;
