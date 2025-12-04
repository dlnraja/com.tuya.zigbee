'use strict';

const { AutoAdaptiveDevice } = require('../../lib/dynamic');

class SmartHeaterDevice extends AutoAdaptiveDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Smart Heater initialized');
  }
}

module.exports = SmartHeaterDevice;
