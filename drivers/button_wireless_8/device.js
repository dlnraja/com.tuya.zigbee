'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Button8GangDevice - Unified 8-button wireless controller
 * Auto-detects battery type (CR2032/CR2450/AAA)
 * Handles single/double/long press for each button
 */
class Button8GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.log('Button8GangDevice initializing...');
    
    // Set button count for this device
    this.buttonCount = 8;
    
    // Initialize base (power detection + button detection)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    
    this.log('Button8GangDevice initialized - 8 buttons ready');
  }

  async onDeleted() {
    this.log('Button8GangDevice deleted');
    
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

module.exports = Button8GangDevice;
