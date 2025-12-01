'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Button1GangDevice - v5.2.92 Fixed
 *
 * FIX: Was incorrectly extending HybridDevice (detected as SWITCH)
 * NOW: Properly extends ButtonDevice for button functionality
 *
 * Handles single/double/long press for 1 button
 * Auto-detects battery type (CR2032/CR2450/AAA)
 */
class Button1GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.log('');
    this.log('╔═══════════════════════════════════════════════════════════════════╗');
    this.log('║           BUTTON 1-GANG v5.2.92 - FIXED                           ║');
    this.log('╚═══════════════════════════════════════════════════════════════════╝');

    // Set button count BEFORE calling super
    this.buttonCount = 1;

    // Initialize ButtonDevice (handles button detection + battery)
    await super.onNodeInit({ zclNode }).catch(err => this.error('[INIT] Error:', err.message));

    this.log('[INIT] ✅ Button1GangDevice initialized - 1 button ready');
  }

  async onDeleted() {
    this.log('Button1GangDevice deleted');

    // Cleanup timers
    if (this._clickState) {
      if (this._clickState.clickTimer) {
        clearTimeout(this._clickState.clickTimer);
      }
      if (this._clickState.longPressTimer) {
        clearTimeout(this._clickState.longPressTimer);
      }
    }

    // Call parent cleanup
    if (super.onDeleted) {
      await super.onDeleted();
    }
  }
}

module.exports = Button1GangDevice;
