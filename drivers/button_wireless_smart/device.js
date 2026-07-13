'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Button1GangDevice - v10.1.0 Multi-Endpoint Detection
 * P26.4: Dynamically detect buttonCount from zclNode endpoints.
 * Some _TZ3000_yj6k7vfo devices have 4 endpoints (one per physical button).
 * Previously hardcoded buttonCount=1 only worked for single-button devices.
 * Inherits all features from ButtonDevice base class.
 */
class Button1GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    // P26.4: Auto-detect button count from zclNode endpoints
    // Endpoints 1-4 are buttons for TS0041 variants
    let detected = 1;
    if (zclNode && zclNode.endpoints) {
      let epCount = 0;
      for (let i = 1; i <= 4; i++) {
        if (zclNode.endpoints[i] && zclNode.endpoints[i].clusters && zclNode.endpoints[i].clusters[6]) {
          epCount++;
        }
      }
      if (epCount > 0) detected = epCount;
    }
    this.buttonCount = detected;
    this.log(`[BUTTON_WIRELESS_SMART] Auto-detected ${this.buttonCount} endpoint(s) for ${this.getData()?.id || 'unknown'}`);

    await Promise.resolve().then(() => super.onNodeInit({ zclNode })).catch(err => this.error('[INIT] Error:', err.message));

    this.log('[BUTTON_WIRELESS_SMART] v10.1.0 initialized via ButtonDevice');
  }

}

module.exports = Button1GangDevice;
