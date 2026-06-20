'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * v5.11.218 FIX CRITICAL : super.on() → super.onNodeInit({ zclNode }), extends ButtonDevice
 */
class SceneSwitch1Device extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 1;

    await super.onNodeInit({ zclNode }).catch(err => this.error('[INIT] Error:', err.message));

    this.log('[scene_switch_1] v10.0.0 initialized via ButtonDevice');
  }

}

module.exports = SceneSwitch1Device;
