'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');

class SceneSwitch3Device extends BaseHybridDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Scene Switch 3-Gang initialized');
  }
}

module.exports = SceneSwitch3Device;
