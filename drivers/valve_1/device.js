'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');

class Valve1Device extends BaseHybridDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Smart Valve 1-Way initialized');
  }
}

module.exports = Valve1Device;
