'use strict';

const { AutoAdaptiveDevice } = require('../../lib/dynamic');

class SwitchPlug1Device extends AutoAdaptiveDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Smart Plug 1-Gang initialized');
  }
}

module.exports = SwitchPlug1Device;
