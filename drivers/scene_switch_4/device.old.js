'use strict';

const { AutoAdaptiveDevice } = require('../../lib/dynamic');

class SceneSwitch4Device extends AutoAdaptiveDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Scene Switch 4-Gang initialized');
  }
}

module.exports = SceneSwitch4Device;
