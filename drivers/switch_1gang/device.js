'use strict';
const HybridSwitchBase = require('../../lib/devices/HybridSwitchBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      1-GANG SWITCH - v5.5.412 + Virtual Buttons                             ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Uses HybridSwitchBase which provides:                                       ║
 * ║  - dpMappings for DP 1-8 (gang switches) + DP 14-15 (settings)              ║
 * ║  - _setupTuyaDPMode() + _setupZCLMode()                                      ║
 * ║  - _registerCapabilityListeners() for all gangs                              ║
 * ║  - ProtocolAutoOptimizer for automatic detection                             ║
 * ║  v5.5.412: Added virtual toggle/identify buttons for remote control        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class Switch1GangDevice extends VirtualButtonMixin(HybridSwitchBase) {

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
    // v5.5.412: Initialize virtual buttons
    await this.initVirtualButtons();
    this.log('[SWITCH-1G] v5.5.412 - 1-gang switch ready');
  }
}

module.exports = Switch1GangDevice;
