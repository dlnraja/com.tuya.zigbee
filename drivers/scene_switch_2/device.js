'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');

class SceneSwitch2Device extends BaseHybridDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Scene Switch 2-Gang initialized');
  }
}

module.exports = SceneSwitch2Device;
