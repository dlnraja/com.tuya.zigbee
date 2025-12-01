'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Button2GangDevice - v5.2.92 Fixed
 *
 * FIX: Was incorrectly extending HybridDevice (detected as SWITCH)
 * NOW: Properly extends ButtonDevice for button functionality
 *
 * Handles single/double/long press for 2 buttons
 */
class Button2GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.log('╔═══════════════════════════════════════════════════════════════════╗');
    this.log('║           BUTTON 2-GANG v5.2.92 - FIXED                           ║');
    this.log('╚═══════════════════════════════════════════════════════════════════╝');

    this.buttonCount = 2;
    await super.onNodeInit({ zclNode }).catch(err => this.error('[INIT] Error:', err.message));
    this.log('[INIT] ✅ Button2GangDevice initialized - 2 buttons ready');
  }

  async onDeleted() {
    this.log('Button2GangDevice deleted');
    if (this._clickState) {
      if (this._clickState.clickTimer) clearTimeout(this._clickState.clickTimer);
      if (this._clickState.longPressTimer) clearTimeout(this._clickState.longPressTimer);
    }
    if (super.onDeleted) await super.onDeleted();
  }
}

module.exports = Button2GangDevice;
