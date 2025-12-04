'use strict';
const { HybridPlugBase } = require('../../lib/devices');

class DoorControllerDevice extends HybridPlugBase {
  get plugCapabilities() { return ['onoff', 'garagedoor_closed']; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[DOOR-CTRL] ✅ Ready');
  }
}
module.exports = DoorControllerDevice;
