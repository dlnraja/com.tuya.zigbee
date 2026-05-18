'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * SmartKnobDevice - v10.0.0 Universal Standard
 * Automatically adapts and registers physical & virtual button events
 * Inherits all features from ButtonDevice base class
 */
class SmartKnobDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 1;
    
    await super.onNodeInit({ zclNode }).catch(err => this.error('[INIT] Error:', err.message));
    
    this.log('[SMART_KNOB] 🔘 v10.0.0 initialized via ButtonDevice');
  }

}

module.exports = SmartKnobDevice;
