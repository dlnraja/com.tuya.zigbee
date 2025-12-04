'use strict';

const { AutoAdaptiveDevice } = require('../../lib/dynamic');

class SmartRcboDevice extends AutoAdaptiveDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Smart RCBO initialized');
  }
}

module.exports = SmartRcboDevice;
