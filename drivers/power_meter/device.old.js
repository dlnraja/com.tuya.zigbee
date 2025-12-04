'use strict';

const { AutoAdaptiveDevice } = require('../../lib/dynamic');

class PowerMeterDevice extends AutoAdaptiveDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Power Meter initialized');
  }
}

module.exports = PowerMeterDevice;
