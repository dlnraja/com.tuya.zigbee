'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Button3GangDevice - v5.5.452
 *
 * FIX v5.2.92: Was incorrectly extending HybridDevice (detected as SWITCH)
 * FIX v5.5.452: Dynamic capabilities now in ButtonDevice base class
 *
 * Handles single/double/long press for 3 buttons
 */
class Button3GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.log('╔═══════════════════════════════════════════════════════════════════╗');
    this.log('║           BUTTON 3-GANG v5.5.452 - DYNAMIC CAPS                   ║');
    this.log('╚═══════════════════════════════════════════════════════════════════╝');

    // Set button count BEFORE calling super (base class uses this!)
    this.buttonCount = 3;

    // Base class handles dynamic capabilities via _ensureDynamicCapabilities()
    await super.onNodeInit({ zclNode }).catch(err => this.error('[INIT] Error:', err.message));
    this.log('[INIT] ✅ Button3GangDevice initialized - 3 buttons ready');
  }

  async onDeleted() {
    this.log('Button3GangDevice deleted');
    if (this._clickState) {
      if (this._clickState.clickTimer) clearTimeout(this._clickState.clickTimer);
      if (this._clickState.longPressTimer) clearTimeout(this._clickState.longPressTimer);
    }
    if (super.onDeleted) await super.onDeleted();
  }
}

module.exports = Button3GangDevice;
