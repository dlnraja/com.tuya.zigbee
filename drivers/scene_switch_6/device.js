'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');

class SceneSwitch6Device extends BaseHybridDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Scene Switch 6-Gang initialized');
  }
}

module.exports = SceneSwitch6Device;
