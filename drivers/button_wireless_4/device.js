'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Button4GangDevice - v10.1.0 Universal Standard
 * Automatically adapts and registers physical & virtual button events
 * Inherits all features from ButtonDevice base class
 *
 * v10.1.0: Removed duplicate scene/onOff listeners that caused double flow triggers.
 * ButtonDevice already handles all ZCL OnOff cluster commands and scene recall events.
 */
class Button4GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 4;

    await super.onNodeInit({ zclNode }).catch(err => this.error('[INIT] Error:', err.message));

    // v10.1.0: REMOVED duplicate scene/onOff listeners
    // ButtonDevice already registers:
    // - 4 scene patterns per endpoint (recall, recallScene, sceneId)
    // - 9 OnOff patterns per endpoint (commandOn, commandOff, commandToggle, etc.)
    // - Tuya DP listeners for 0xFD proprietary commands
    // Adding duplicate listeners caused DOUBLE flow triggers for every button press.

    this.log('[BUTTON_WIRELESS_4] 🔘 v10.1.0 initialized via ButtonDevice');
  }

}

module.exports = Button4GangDevice;
