'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Button1GangDevice - v10.0.0 Universal Standard
 * Automatically adapts and registers physical & virtual button events
 * Inherits all features from ButtonDevice base class
 */
class Button1GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    // Fix #333: Auto-detect button count from endpoints instead of hardcoding 1
    // TS0041 has 4 endpoints (EP1-EP4) with OnOff clusters = 4 buttons
    let detectedCount = 0;
    if (zclNode?.endpoints) {
      for (let i = 1; i <= 8; i++) {
        const ep = zclNode.endpoints[i];
        if (ep?.clusters?.onOff || ep?.clusters?.scenes) {
          detectedCount++;
        }
      }
    }
    this.buttonCount = Math.max(detectedCount, 1);
    this.log(`[BUTTON_WIRELESS_SMART] Detected ${this.buttonCount} button(s) from endpoints`);

    await super.onNodeInit({ zclNode }).catch(err => this.error('[INIT] Error:', err.message));

    this.log(`[BUTTON_WIRELESS_SMART] v10.0.0 initialized with ${this.buttonCount} button(s)`);
  }

}

module.exports = Button1GangDevice;
