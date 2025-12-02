'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');

class SwitchPlug1Device extends BaseHybridDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Smart Plug 1-Gang initialized');
  }
}

module.exports = SwitchPlug1Device;
