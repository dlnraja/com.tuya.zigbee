'use strict';
const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');

class DoorControllerDevice extends UnifiedPlugBase {
  get plugCapabilities() { return ['onoff', 'garagedoor_closed']; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[DOOR-CTRL] ✅ Ready');
  }
}
module.exports = DoorControllerDevice;
