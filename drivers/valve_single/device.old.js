'use strict';

const { AutoAdaptiveDevice } = require('../../lib/dynamic');

class Valve1Device extends AutoAdaptiveDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Smart Valve 1-Way initialized');
  }
}

module.exports = Valve1Device;
