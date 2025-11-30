'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Button4GangDevice - Unified 4-button wireless controller
 * Supports: TS0044, TS0043 with _TZ3000_u3nv1jwk and similar
 * Handles single/double/long press for each of 4 buttons
 */
class Button4GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.log('Button4GangDevice initializing...');

    // Set button count BEFORE calling super (ButtonDevice uses this)
    this.buttonCount = 4;

    // Initialize base (power detection + button detection)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));

    this.log('Button4GangDevice initialized - 4 buttons ready');
  }

  async onDeleted() {
    this.log('Button4GangDevice deleted');

    // Cleanup timers
    if (this._clickState) {
      if (this._clickState.clickTimer) {
        clearTimeout(this._clickState.clickTimer);
      }
      if (this._clickState.longPressTimer) {
        clearTimeout(this._clickState.longPressTimer);
      }
    }
  }
}

module.exports = Button4GangDevice;
