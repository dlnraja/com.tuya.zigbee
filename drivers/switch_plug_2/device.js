'use strict';

const { AutoAdaptiveDevice } = require('../../lib/dynamic');

class SwitchPlug2Device extends AutoAdaptiveDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Smart Plug 2-Gang initialized');
  }
}

module.exports = SwitchPlug2Device;
