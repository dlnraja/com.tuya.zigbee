'use strict';

const BaseUnifiedDevice = require('../../lib/devices/BaseUnifiedDevice');

/**
 * GarageDoorDevice - v5.13.6 Hardened Architecture
 * Supports DP1 (Command), DP2 (State), DP12 (Status)
 */
class GarageDoorDevice extends BaseUnifiedDevice {

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
    if (!data || data.dp === null || data.dp === undefined) {return;}
    
    const value = data.data ?? data.value;
    const dpId = data.dp;

    this.log(`[Garage] 📥 DP ${dpId}: ${value}`);

    switch (dpId) {
      case 2: {
        const closed = value === 0 || value === false;
        await this.safeSetCapabilityValue('garagedoor_closed', closed).catch(() => {});
        if (this.hasCapability('alarm_contact')) {
          await this.safeSetCapabilityValue('alarm_contact', !closed).catch(() => {}); }
        break;
      }

      case 12: {
        const open = value === 1 || value === true;
        await this.safeSetCapabilityValue('garagedoor_closed', !open).catch(() => {});
        if (this.hasCapability('alarm_contact')) {
          await this.safeSetCapabilityValue('alarm_contact', open).catch(() => {});
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
