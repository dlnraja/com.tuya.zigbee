'use strict';
const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const { resolve: resolvePressType } = require('../../lib/utils/TuyaPressTypeMap');

class SwitchWirelessDevice extends UnifiedSwitchBase {
  get mainsPowered() { return false; }
  get gangCount() { return 1; }
  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    await super.onNodeInit({ zclNode });
    this._registerCapabilityListeners(); // rule-12a injected
    this._lastWirelessPress = 0;
    this.log('[WIRELESS-SWITCH]  Ready (v5.12.12)');
  }

  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true }
    };
  }

  _handleDP(dp, value) {
    if (dp === 1) {
      const boolVal = value === 1 || value === true;
      this._safeSetCapability('onoff', boolVal).catch(() => {});
      try {
        const id = boolVal ? 'switch_wireless_onoff_true' : 'switch_wireless_onoff_false';
      this.homey.flow.getTriggerCard(id) .trigger(this, { timestamp: new Date().toISOString() }, {}).catch(() => {});
      } catch (e) { /* card missing */ }
      return;
    }
    if (dp === 2) {
      const now = Date.now();
      if (now - this._lastWirelessPress < 300) return;
      this._lastWirelessPress = now;
      const pressType = resolvePressType(value);
      this.log(`[WIRELESS-SWITCH] DP2 press=${pressType}`);
      const c = { single: 'switch_wireless_single_press', double: 'switch_wireless_double_press', long: 'switch_wireless_long_press' }[pressType];
      if (c) {
        try {
      this.homey.flow.getTriggerCard(c)?.trigger(this, {}, {}).catch(this.error || console.error)
      this.homey.flow.getTriggerCard('switch_wireless_button_pressed')?.trigger(this, {}, {}).catch(this.error || console.error)
        } catch (e) { /* card missing */ }
      }
      return;
    }
    if (typeof super._handleDP === 'function') super._handleDP(dp, value );
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports = SwitchWirelessDevice;


