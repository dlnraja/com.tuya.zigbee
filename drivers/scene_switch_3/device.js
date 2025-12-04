'use strict';

const { AutoAdaptiveDevice } = require('../../lib/dynamic');

class SceneSwitch3Device extends AutoAdaptiveDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Scene Switch 3-Gang initialized');
  }
}

module.exports = SceneSwitch3Device;
