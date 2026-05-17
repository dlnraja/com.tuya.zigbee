'use strict';

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');

/**
 * GarageDoorDevice - v5.13.6 Hardened Architecture
 * Supports DP1 (Command), DP2 (State), DP12 (Status)
 */
class GarageDoorDevice extends TuyaZigbeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('[Garage] 🚀 Initializing hardened driver...');
    await super.onNodeInit({ zclNode });

    // 1. Capability Listeners
    if (this.hasCapability('garagedoor_closed')) {
      this.registerCapabilityListener ('garagedoor_closed', async (value) => { this.log(`[Garage] Door command: ${value ? 'CLOSE' : 'OPEN'}`);
        // Typically DP1 is a toggle or command pulse
        return this.sendTuyaCommand(1, true, 'bool');
      });
    }

    this.log('[Garage] ✅ Ready');
  }

  /**
   * handleTuyaDataReport - Hardened DP Processing
   */
  async handleTuyaDataReport(data) {
    if (!data || data.dp == null) return;
    
    const value = data.data ?? data.value;
    const dpId = data.dp;

    this.log(`[Garage] 📥 DP ${dpId}: ${value}`);

    switch (dpId) {
      case 2: {
        const closed = value === 0 || value === false;
        await this.setCapabilityValue('garagedoor_closed', closed);
        if (this.hasCapability('alarm_contact')) {
          await this.setCapabilityValue('alarm_contact', !closed); }
        break;
      }

      case 12: {
        const open = value === 1 || value === true;
        await this.setCapabilityValue('garagedoor_closed', !open);
        if (this.hasCapability('alarm_contact')) {
          await this.setCapabilityValue('alarm_contact', open);
        }
        break;
      }

      case 3:
        this.log(`[Garage] Countdown: ${value}s`);
        break;

      default:
        this.log(`[Garage] 📥 Unhandled DP ${dpId}:`, value);
    }
  }

}

module.exports = GarageDoorDevice;
