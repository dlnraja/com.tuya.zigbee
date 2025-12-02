'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');

class Valve4Device extends BaseHybridDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Smart Valve 4-Way initialized');
  }
}

module.exports = Valve4Device;
