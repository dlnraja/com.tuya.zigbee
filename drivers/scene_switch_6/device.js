'use strict';

const { AutoAdaptiveDevice } = require('../../lib/dynamic');

class SceneSwitch6Device extends AutoAdaptiveDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Scene Switch 6-Gang initialized');
  }
}

module.exports = SceneSwitch6Device;
