'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * WallRemote4Gang3Device - v10.0.0 Universal Standard
 * Automatically adapts and registers physical & virtual button events
 * Inherits all features from ButtonDevice base class
 */
class WallRemote4Gang3Device extends ButtonDevice {

  /**
   * v9.7.4: _setGangOnOff for switch_multi_gang flow card compatibility.
   * Button devices have no onoff capability — triggers button press flow instead.
   */
  async _setGangOnOff(gang, value) {
    this.log(`[FLOW] _setGangOnOff: gang=${gang} value=${value} (button device, triggering press)`);
    await this.triggerButtonPress(gang || 1, 'single', 1, { source: 'virtual' });
  }

  async onNodeInit({ zclNode }) {
    this.buttonCount = 4;

    await Promise.resolve().then(() => super.onNodeInit({ zclNode })).catch(err => this.error('[INIT] Error:', err.message));

    this.log('[WALL_REMOTE_4_GANG_3] 🔘 v10.0.0 initialized via ButtonDevice');
  }

}

module.exports = WallRemote4Gang3Device;
