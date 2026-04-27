'use strict';

const BaseUnifiedDevice = require('../../lib/devices/BaseUnifiedDevice');

/**
 * 
 *       DUAL IRRIGATION VALVE - Unified Engine Protocol                         
 * 
 *   Supports: _TZE284_fhvpaltk, _TZE284_eaet5qt5 (Insoma Two-Way)                
 *   DPs: 1=V1 ON/OFF, 2=V2 ON/OFF, 13=Countdown1, 14=Countdown2,                 
 *        25=Duration1, 26=Duration2, 59=Battery, 104=Status1, 105=Status2        
 * 
 */
class ValveDualIrrigationDevice extends BaseUnifiedDevice {

  get dpMappings() {
    return {
      // Valve 1
      1: { capability: 'onoff.valve_1', transform: (v) => v === 1 || v === true },
      104: { capability: 'onoff.valve_1', transform: (v) => v === 1 || v === 0 }, // Status reporting
      13: { internal: 'countdown_1' },
      25: { internal: 'duration_1' },

      // Valve 2
      2: { capability: 'onoff.valve_2', transform: (v) => v === 1 || v === true },
      105: { capability: 'onoff.valve_2', transform: (v) => v === 1 || v === 0 }, // Status reporting
      14: { internal: 'countdown_2' },
      26: { internal: 'duration_2' },

      // Battery (Research research shows DP 59 for these dual valves, DP 101/15 as fallback)
      59: { capability: 'measure_battery', divisor: 1, transform: (v) => Math.min(100, Math.max(0, v)) },
      101: { capability: 'measure_battery', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 }
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    // Register capability listeners for BOTH valves
    this.registerCapabilityListener('onoff.valve_1', async (value) => {
      this.log(`[VALVE-2] Setting Valve 1 = ${value}`);
      // Insoma valves often require explicit 1/0 as bool
      await this.sendDP(1, value ? true : false, 'bool');
      });

    this.registerCapabilityListener('onoff.valve_2', async (value) => {
      this.log(`[VALVE-2] Setting Valve 2 = ${value}`);
      await this.sendDP(2, value ? true : false, 'bool');
      });

    this.log('[VALVE-2]  Ready (Dual Engine v7.4.4)');
  }

  // Override sendDP to ensure tuyaEF00Manager is used
  async sendDP(dp, value, type = 'bool') {
    if (this.tuyaEF00Manager) {
      return this.tuyaEF00Manager.sendDP(dp, value, type);
    }
    this.error('[VALVE-2]  Error: tuyaEF00Manager not initialized');
    throw new Error('tuya_manager_not_found');
  }

  /**
   * v7.4.6: Refresh state when device announces itself (rejoin/wakeup)
   */
  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself, refreshing state...');
    if (typeof this._updateLastSeen === 'function') this._updateLastSeen();
    // Proactive data recovery if supported
    if (this._dataRecoveryManager) {
       this._dataRecoveryManager.triggerRecovery();
    }
  }
}

module.exports = ValveDualIrrigationDevice;
