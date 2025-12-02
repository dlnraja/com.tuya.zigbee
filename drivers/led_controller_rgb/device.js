'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');

class LedControllerRgbDevice extends BaseHybridDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('LED Controller RGB initialized');
  }
}

module.exports = LedControllerRgbDevice;
