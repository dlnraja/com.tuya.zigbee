'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');

class SmartHeaterDevice extends BaseHybridDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Smart Heater initialized');
  }
}

module.exports = SmartHeaterDevice;
