'use strict';

const BaseUnifiedDevice = require('../../lib/devices/BaseUnifiedDevice');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      DUAL IRRIGATION VALVE - Unified Engine Protocol                         ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Supports: _TZE284_fhvpaltk (Insoma Two-Way)                                 ║
 * ║  DPs: 1=V1, 2=V2, 13=T1, 14=T2, 101=Batt, 104=V1State, 105=V2State             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class ValveDualIrrigationDevice extends BaseUnifiedDevice {

  get dpMappings() {
    return {
      1: { capability: 'onoff.valve_1', transform: (v) => v === 1 || v === true },
      2: { capability: 'onoff.valve_2', transform: (v) => v === 1 || v === true },
      13: { capability: null, internal: 'countdown_1', writable: true },
      14: { capability: null, internal: 'countdown_2', writable: true },
      101: { capability: 'measure_battery', divisor: 1 },
      104: { capability: 'onoff.valve_1', transform: (v) => v === 1 || v === 0 }, // Reporting
      105: { capability: 'onoff.valve_2', transform: (v) => v === 1 || v === 0 }  // Reporting
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    // Register capability listeners for BOTH valves
    this.registerCapabilityListener('onoff.valve_1', async (value) => {
      this.log(`[VALVE-2] Setting Valve 1 = ${value}`);
      await this.sendDP(1, value ? 1 : 0, 'bool');
    });

    this.registerCapabilityListener('onoff.valve_2', async (value) => {
      this.log(`[VALVE-2] Setting Valve 2 = ${value}`);
      await this.sendDP(2, value ? 1 : 0, 'bool');
    });

    this.log('[VALVE-2] ✅ Ready (Dual Engine)');
  }

  // Override sendDP to ensure type is provided
  async sendDP(dp, value, type = 'bool') {
    if (this.tuyaEF00Manager) {
      return this.tuyaEF00Manager.sendDP(dp, value, type);
    }
  }
}

module.exports = ValveDualIrrigationDevice;
