'use strict';
const { HybridSwitchBase } = require('../../lib/devices/HybridSwitchBase');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      1-GANG SWITCH - v5.5.129 FIXED (extends HybridSwitchBase)              ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Uses HybridSwitchBase which provides:                                       ║
 * ║  - dpMappings for DP 1-8 (gang switches) + DP 14-15 (settings)              ║
 * ║  - _setupTuyaDPMode() + _setupZCLMode()                                      ║
 * ║  - _registerCapabilityListeners() for all gangs                              ║
 * ║  - ProtocolAutoOptimizer for automatic detection                             ║
 * ║                                                                              ║
 * ║  Additional DPs for energy monitoring (some models):                         ║
 * ║  - DP 17: Current (mA), DP 18: Power (W), DP 19: Voltage (V)                ║
 * ║  - DP 20: Energy (kWh)                                                       ║
 * ║  Models: TS0001, TS0011, _TZ3000_*, _TYZB01_*                               ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class Switch1GangDevice extends HybridSwitchBase {

  get gangCount() { return 1; }

  /**
   * EXTEND parent dpMappings with energy monitoring DPs
   */
  get dpMappings() {
    // Get parent mappings first
    const parentMappings = Object.getPrototypeOf(Object.getPrototypeOf(this)).dpMappings || {};

    return {
      ...parentMappings,
      // Energy monitoring (if device supports)
      17: { capability: 'measure_current', divisor: 1000, unit: 'A' },
      18: { capability: 'measure_power', divisor: 10, unit: 'W' },
      19: { capability: 'measure_voltage', divisor: 10, unit: 'V' },
      20: { capability: 'meter_power', divisor: 100, unit: 'kWh' }
    };
  }

  async onNodeInit({ zclNode }) {
    // Let parent handle everything
    await super.onNodeInit({ zclNode });
    this.log('[SWITCH-1G] v5.5.129 - 1-gang switch ready');
  }
}

module.exports = Switch1GangDevice;
