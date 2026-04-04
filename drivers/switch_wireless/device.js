'use strict';
const HybridSwitchBase = require('../../lib/devices/HybridSwitchBase');
const { resolve: resolvePressType } = require('../../lib/utils/TuyaPressTypeMap');

class SwitchWirelessDevice extends HybridSwitchBase {
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
      });
      // Initial check
      const bat = this.getCapabilityValue('measure_battery');
      if (bat !== null && this.hasCapability('alarm_battery')) {
        this.setCapabilityValue('alarm_battery', bat < 15).catch(() => {});
      }
    }
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    await super.onNodeInit({ zclNode });
    this._lastWirelessPress = 0;
    this.log('[WIRELESS-SWITCH] ✅ Ready (v5.12.12)');
  }

  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true }
    };
  }

  _handleDP(dp, value) {
    if (dp === 1) {
      const boolVal = value === 1 || value === true;
      this.setCapabilityValue('onoff', boolVal).catch(() => {});
      const cardId = boolVal ? 'switch_wireless_onoff_true' : 'switch_wireless_onoff_false';
      try { this.homey.flow.getDeviceTriggerCard(cardId).trigger(this, {}, {}).catch(() => {}); } catch (e) { /* */ }
      return;
    }
    if (dp === 2) {
      const now = Date.now();
      if (now - this._lastWirelessPress < 300) return;
      this._lastWirelessPress = now;
      const pt = resolvePressType(value);
      this.log(`[WIRELESS-SWITCH] DP2 press=${pt}`);
      try { (() => { try { return this.homey.flow.getDeviceTriggerCard('switch_wireless_button_pressed'); } catch(e) { return null; } })()?.trigger(this, { press_type: pt }, {}).catch(() => {}); } catch (e) { /* */ }
      const c = { single: 'switch_wireless_single_press', double: 'switch_wireless_double_press', long: 'switch_wireless_long_press' }[pt];
      if (c) { try { this.homey.flow.getDeviceTriggerCard(c).trigger(this, {}, {}).catch(() => {}); } catch (e) { /* */ } }
      return;
    }
    if (typeof super._handleDP === 'function') super._handleDP(dp, value);
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports = SwitchWirelessDevice;
