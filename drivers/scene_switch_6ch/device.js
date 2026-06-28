'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * SceneSwitch6chDevice - 6-Channel Scene Switch
 * DPs: 1-6=button_press(ENUM for each channel: 0=single, 1=double, 2=hold)
 * Inherits all features from ButtonDevice base class
 */
class SceneSwitch6chDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 6;

    await Promise.resolve().then(() => super.onNodeInit({ zclNode })).catch(err => this.error('[INIT] Error:', err.message));

    this.log('[SCENE_SWITCH_6CH] Initialized via ButtonDevice');
  }

  onDeleted() {
    this._destroyed = true;
    if (super.onDeleted) super.onDeleted();
  }
}

module.exports = SceneSwitch6chDevice;
