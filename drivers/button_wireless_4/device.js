'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Button4GangDevice - v10.1.0 Universal Standard
 * Automatically adapts and registers physical & virtual button events
 * Inherits all features from ButtonDevice base class
 *
 * v10.1.0: Removed redundant scene/onOff listeners that duplicated ButtonDevice.setupButtonDetection().
 *          Removed broken _triggerButtonFlow and _onSceneCommand calls.
 *          ButtonDevice base class already handles all cluster bindings, scene recall,
 *          onOff commands, Tuya DP, E000 cluster, and multi-press detection.
 */
class Button4GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 4;

    await super.onNodeInit({ zclNode }).catch(err => this.error('[INIT] Error:', err.message));

    this.log('[BUTTON_WIRELESS_4] v10.1.0 initialized via ButtonDevice');
  }

}

module.exports = Button4GangDevice;
