'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');

class PowerMeterDevice extends BaseHybridDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Power Meter initialized');
  }
}

module.exports = PowerMeterDevice;
