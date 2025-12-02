'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');

class SceneSwitch1Device extends BaseHybridDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Scene Switch 1-Gang initialized');
  }
}

module.exports = SceneSwitch1Device;
