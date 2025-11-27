'use strict';

// MIGRATED TO HYBRID SYSTEM v2.0
const HybridDriverSystem = require('../../lib/HybridDriverSystem');
const BatteryManagerV4 = require('../../lib/BatteryManagerV4');

/**
 * button_wireless_6 - Hybrid-Enhanced Driver
 *
 * MIGRATION: Original driver enhanced with Hybrid System
 * - Auto-adaptive capabilities
 * - Energy-aware management
 * - Smart detection
 */

// Create hybrid base
const HybridDevice = HybridDriverSystem.createHybridDevice();

'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Button6GangDevice - Unified 6-button wireless controller
 * Auto-detects battery type (CR2032/CR2450/AAA)
 * Handles single/double/long press for each button
 */
class Button6GangDevice extends HybridDevice {

  async onNodeInit({ zclNode }) {
    // Hybrid system initialization
    await super.onNodeInit({ zclNode });

    // Original initialization below:
    this.log('Button6GangDevice initializing...');
    
    // Set button count for this device
    this.buttonCount = 6;
    
    // Initialize base (power detection + button detection)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('Button6GangDevice initialized - 6 buttons ready');
  }

  async onDeleted() {
    this.log('Button6GangDevice deleted');
    
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

module.exports = Button6GangDevice;


module.exports = Button6GangDevice;
