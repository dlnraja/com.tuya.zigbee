'use strict';

const { AutoAdaptiveDevice } = require('../../lib/dynamic');

class Valve4Device extends AutoAdaptiveDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Smart Valve 4-Way initialized');
  }
}

module.exports = Valve4Device;
