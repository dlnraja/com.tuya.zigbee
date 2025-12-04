'use strict';

const { AutoAdaptiveDevice } = require('../../lib/dynamic');

class SceneSwitch2Device extends AutoAdaptiveDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Scene Switch 2-Gang initialized');
  }
}

module.exports = SceneSwitch2Device;
