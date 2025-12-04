'use strict';

const { AutoAdaptiveDevice } = require('../../lib/dynamic');

class SceneSwitch1Device extends AutoAdaptiveDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Scene Switch 1-Gang initialized');
  }
}

module.exports = SceneSwitch1Device;
