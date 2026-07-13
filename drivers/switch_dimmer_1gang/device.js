'use strict';

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

const DP = {
  state: 1,
  brightness: 2,
  minBright: 3,
  lightType: 4,
  powerOn: 14
};

/**
 * SwitchDimmer1GangDevice - v5.13.6 Hardened Architecture
 */
class SwitchDimmer1GangDevice extends PhysicalButtonMixin(VirtualButtonMixin(TuyaZigbeeDevice)) {

  get mainsPowered() { return true; }
  get gangCount() { return 1; }

  async onNodeInit({ zclNode }) {
    // Auto-fix: Remove battery capabilities for mains-powered devices
    await this.removeCapability('measure_battery').catch(() => {});
    await this.removeCapability('alarm_battery').catch(() => {});
    this.log('[Dimmer1G] 🚀 Initializing hardened driver...');
    await super.onNodeInit({ zclNode });
    await this.initVirtualButtons();

    // 1. Capability Listeners
    this.registerCapabilityListener ('onoff', async (value) => { this.log(`[Dimmer1G] Setting state: ${value}`);
      return this.sendTuyaCommand(DP.state, value, 'bool');
    });

    this.registerCapabilityListener('dim', async (value) => {
      const brightness = Math.round(10 + value * 990);
      this.log(`[Dimmer1G] Setting brightness: ${brightness}`);
      return this.sendTuyaCommand(DP.brightness, brightness, 'value');
    });

    this.log('[Dimmer1G] ✅ Ready');
  }

  /**
   * handleTuyaDataReport - Hardened DP Processing
   */
  async handleTuyaDataReport(data) {
    if (!data || data.dp === null || data.dp === undefined) {return;}
    
    const value = data.data ?? data.value;
    const dpId = data.dp;

    switch (dpId) {
      case DP.state: {
        const state = Boolean(value);
        await this['safeSetCapabilityValue']('onoff', state);
        break; }

      case DP.brightness: {
        const raw = typeof value === 'number' ? value : parseInt(value);
        const dim = Math.max(0, Math.min(1, (raw - 10) / 990));
        await this['safeSetCapabilityValue']('dim', dim);
        break;
      }

      default:
        this.log(`[Dimmer1G] 📥 Unhandled DP ${dpId}:`, value);
    }
  }

  /**
   * v9.7.4: _setGangOnOff for switch_multi_gang flow card compatibility.
   * Single-gang dimmer: always writes DP 1 (state).
   */
  async _setGangOnOff(gang, value) {
    this.log(`[FLOW] _setGangOnOff: gang=${gang} value=${value}`);
    if (typeof this.markAppCommand === 'function') {
      this.markAppCommand(1, value);
    }
    return this.sendTuyaCommand(DP.state, value, 'bool');
  }

  async onSettings({ newSettings, changedKeys }) {
    for (const key of changedKeys) {
      switch (key) {
        case 'min_brightness':
          await this.sendTuyaCommand(DP.minBright, newSettings[key] * 10, 'value');
          break;
        case 'power_on_behavior':
          await this.sendTuyaCommand(DP.powerOn, parseInt(newSettings[key]), 'enum');
          break;
        case 'light_type':
          await this.sendTuyaCommand(DP.lightType, parseInt(newSettings[key]), 'enum');
          break;
      }
    }
  }

}

module.exports = SwitchDimmer1GangDevice;
