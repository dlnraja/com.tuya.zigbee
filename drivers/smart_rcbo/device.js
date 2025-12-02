'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');

class SmartRcboDevice extends BaseHybridDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Smart RCBO initialized');
  }
}

module.exports = SmartRcboDevice;
