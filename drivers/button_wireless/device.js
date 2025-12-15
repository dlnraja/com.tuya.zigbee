'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * v5.5.172: UNIVERSAL WIRELESS BUTTON DRIVER
 *
 * Uses ButtonDevice base class for full support of:
 * - Single press, double press, long press
 * - Scenes cluster (Tuya TS0041/42/43/44)
 * - OnOff cluster with Tuya 0xFD command
 * - Battery reporting
 *
 * Devices: _TZ3000_bczr4e10, _TZ3000_bgtzm4ny, etc.
 */
class UniversalWirelessButtonDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.log('[BUTTON-WIRELESS] 🔘 v5.5.172 Initializing...');

    // Detect button count for this device
    this.buttonCount = await this._detectButtonCount(zclNode);
    this.log(`[BUTTON-WIRELESS] Detected ${this.buttonCount} button(s)`);

    // Initialize ButtonDevice base (handles all press detection!)
    await super.onNodeInit({ zclNode });

    this.log('[BUTTON-WIRELESS] ✅ Ready - supports single/double/long press');
  }

  /**
   * Detect number of buttons from endpoints
   */
  async _detectButtonCount(zclNode) {
    // Check user setting first
    const settings = this.getSettings() || {};
    if (settings.button_count && settings.button_count !== 'auto') {
      return parseInt(settings.button_count);
    }

    // Auto-detect: count endpoints with onOff or scenes cluster
    let count = 0;
    for (let i = 1; i <= 8; i++) {
      const ep = zclNode.endpoints[i];
      if (ep?.clusters?.onOff || ep?.clusters?.scenes) {
        count++;
      }
    }

    return count || 1; // Default to 1
  }

  /**
   * Handle settings changes
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('[BUTTON-WIRELESS] Settings changed:', changedKeys);

    if (changedKeys.includes('button_count')) {
      this.buttonCount = newSettings.button_count === 'auto'
        ? await this._detectButtonCount(this.zclNode)
        : parseInt(newSettings.button_count);
      this.log(`[BUTTON-WIRELESS] Button count updated to: ${this.buttonCount}`);
    }
  }

}

module.exports = UniversalWirelessButtonDevice;
