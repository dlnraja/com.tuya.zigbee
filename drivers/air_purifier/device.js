'use strict';

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');

const DP = {
  state: 1,
  pm25: 2,
  mode: 3,
  speed: 4,
  filter: 5,
  childLock: 7,
  brightness: 8,
};

/**
 * AirPurifierDevice - v5.13.6 Hardened Architecture
 */
class AirPurifierDevice extends TuyaZigbeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('[AirPurifier] 🚀 Initializing hardened driver...');
    await super.onNodeInit({ zclNode });

    // 1. Capability Listeners
    this.registerCapabilityListener('onoff', async (value) => {
      this.log(`[AirPurifier] Setting state to: ${value}`);
      return this.sendTuyaCommand(DP.state, value, 'bool');
    });

    this.registerCapabilityListener('dim', async (value) => {
      const speed = Math.round(value * 100);
      this.log(`[AirPurifier] Setting speed to: ${speed}`);
      return this.sendTuyaCommand(DP.speed, speed, 'value');
    });

    this.log('[AirPurifier] ✅ Ready');
  }

  /**
   * handleTuyaDataReport - Hardened DP Processing
   */
  async handleTuyaDataReport(data) {
    if (!data || data.dp == null) return;
    
    const value = data.data ?? data.value;
    const dpId = data.dp;

    switch (dpId) {
      case DP.state: {
        const state = Boolean(value);
        this.log(`[AirPurifier] 📥 State: ${state}`);
        await this.setCapabilityValue('onoff', state);
        break;
      }

      case DP.pm25: {
        const pm25 = typeof value === 'number' ? value : parseInt(value);
        this.log(`[AirPurifier] 📥 PM2.5: ${pm25}`);
        await this.setCapabilityValue('measure_pm25', pm25);
        break;
      }

      case DP.speed: {
        const speed = typeof value === 'number' ? value : parseInt(value);
        this.log(`[AirPurifier] 📥 Speed: ${speed}`);
        await this.setCapabilityValue('dim', Math.min(1, Math.max(0, speed / 100)));
        break;
      }

      default:
        this.log(`[AirPurifier] 📥 Unhandled DP ${dpId}:`, value);
    }
  }

}

module.exports = AirPurifierDevice;
