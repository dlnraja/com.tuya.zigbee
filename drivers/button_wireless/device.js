'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * v5.5.796: UNIVERSAL WIRELESS BUTTON DRIVER (Forum fix Cam)
 *
 * Uses ButtonDevice base class for full support of:
 * - Single press, double press, long press
 * - Scenes cluster (Tuya TS0041/42/43/44)
 * - OnOff cluster with Tuya 0xFD command
 * - Battery reporting
 *
 * v5.5.796: FORUM FIX - Ensure minimum 1 button capability even if detection fails
 *
 * Devices: _TZ3000_bczr4e10, _TZ3000_bgtzm4ny, etc.
 */
class UniversalWirelessButtonDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.log('[BUTTON-WIRELESS] 🔘 v5.5.796 Initializing (Cam forum fix)...');

    // Detect button count for this device
    this.buttonCount = await this._detectButtonCount(zclNode);
    
    // v5.5.796: FORUM FIX - Ensure at least 1 button (Cam: no GUI issue)
    if (!this.buttonCount || this.buttonCount < 1) {
      this.log('[BUTTON-WIRELESS] ⚠️ Detection returned 0, defaulting to 1 button');
      this.buttonCount = 1;
    }
    this.log(`[BUTTON-WIRELESS] Detected ${this.buttonCount} button(s)`);

    // Initialize ButtonDevice base (handles all press detection!)
    await super.onNodeInit({ zclNode });

    // v5.5.796: Force battery read on init (Cam: no battery issue)
    await this._forceInitialBatteryRead(zclNode);

    this.log('[BUTTON-WIRELESS] ✅ Ready - supports single/double/long press');
  }

  /**
   * v5.5.796: FORUM FIX - Force initial battery read (Cam)
   * Some buttons show no battery because they sleep before first read
   */
  async _forceInitialBatteryRead(zclNode) {
    try {
      const ep = zclNode?.endpoints?.[1];
      const powerCluster = ep?.clusters?.powerConfiguration || ep?.clusters?.genPowerCfg || ep?.clusters?.[1];
      
      if (powerCluster?.readAttributes) {
        this.log('[BUTTON-WIRELESS] 🔋 Forcing initial battery read...');
        const attrs = await Promise.race([
          powerCluster.readAttributes(['batteryPercentageRemaining', 'batteryVoltage']),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2000))
        ]).catch(() => null);
        
        if (attrs?.batteryPercentageRemaining !== undefined && attrs.batteryPercentageRemaining !== 255) {
          const battery = Math.round(attrs.batteryPercentageRemaining / 2);
          this.log(`[BUTTON-WIRELESS] 🔋 Battery: ${battery}%`);
          if (this.hasCapability('measure_battery')) {
            await this.setCapabilityValue('measure_battery', battery).catch(() => {});
          }
        }
      }
    } catch (e) {
      this.log(`[BUTTON-WIRELESS] ⚠️ Initial battery read failed: ${e.message}`);
    }
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
