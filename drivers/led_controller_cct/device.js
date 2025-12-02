'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');

class LedControllerCctDevice extends BaseHybridDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('LED Controller CCT initialized');
  }
}

module.exports = LedControllerCctDevice;
