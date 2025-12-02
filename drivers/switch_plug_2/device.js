'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');

class SwitchPlug2Device extends BaseHybridDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Smart Plug 2-Gang initialized');
  }
}

module.exports = SwitchPlug2Device;
