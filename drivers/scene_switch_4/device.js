'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');

class SceneSwitch4Device extends BaseHybridDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Scene Switch 4-Gang initialized');
  }
}

module.exports = SceneSwitch4Device;
