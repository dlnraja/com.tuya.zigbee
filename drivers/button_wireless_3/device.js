'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Button3GangDevice - v5.5.451 Fixed
 *
 * FIX v5.2.92: Was incorrectly extending HybridDevice (detected as SWITCH)
 * FIX v5.5.451: Ensure capabilities exist (devices paired before fix had none!)
 *
 * Handles single/double/long press for 3 buttons
 */
class Button3GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.log('╔═══════════════════════════════════════════════════════════════════╗');
    this.log('║           BUTTON 3-GANG v5.5.451 - CAPABILITY FIX                 ║');
    this.log('╚═══════════════════════════════════════════════════════════════════╝');

    this.buttonCount = 3;

    // v5.5.451: CRITICAL - Ensure capabilities exist for devices paired before fix
    await this._ensureCapabilities();

    await super.onNodeInit({ zclNode }).catch(err => this.error('[INIT] Error:', err.message));
    this.log('[INIT] ✅ Button3GangDevice initialized - 3 buttons ready');
  }

  /**
   * v5.5.451: Ensure button and battery capabilities exist
   * Devices paired before driver fix have NO capabilities!
   */
  async _ensureCapabilities() {
    const requiredCapabilities = ['button.1', 'button.2', 'button.3', 'measure_battery'];

    for (const cap of requiredCapabilities) {
      if (!this.hasCapability(cap)) {
        this.log(`[INIT] ⚠️ Adding missing capability: ${cap}`);
        try {
          await this.addCapability(cap);
          this.log(`[INIT] ✅ Added capability: ${cap}`);
        } catch (err) {
          this.error(`[INIT] ❌ Failed to add ${cap}:`, err.message);
        }
      }
    }

    // Remove onoff if incorrectly present (button, not switch!)
    if (this.hasCapability('onoff')) {
      this.log('[INIT] ⚠️ Removing incorrect onoff capability');
      await this.removeCapability('onoff').catch(() => { });
    }
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
