'use strict';
const HybridSwitchBase = require('../../lib/devices/HybridSwitchBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      1-GANG SWITCH - v5.5.896 UNIFIED + Advanced Physical Button            ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Uses HybridSwitchBase which provides:                                       ║
 * ║  - dpMappings for DP 1-8 (gang switches) + DP 14-15 (settings)              ║
 * ║  - _setupTuyaDPMode() + _setupZCLMode()                                      ║
 * ║  - _registerCapabilityListeners() for all gangs                              ║
 * ║  - ProtocolAutoOptimizer for automatic detection                             ║
 * ║  v5.5.412: Virtual toggle/identify buttons                                   ║
 * ║  v5.5.895: Merged BSEED - basic physical button detection                    ║
 * ║  v5.5.896: PhysicalButtonMixin - single/double/long/triple press detection  ║
 * ║            BSEED devices: 2000ms window | Others: 500ms (faster response)   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class Switch1GangDevice extends PhysicalButtonMixin(VirtualButtonMixin(HybridSwitchBase)) {

  get gangCount() { return 1; }

  /**
   * EXTEND parent dpMappings with energy monitoring DPs
   */
  get dpMappings() {
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
    // Let parent handle Tuya DP + ZCL hybrid mode
    await super.onNodeInit({ zclNode });

    // v5.5.896: Initialize advanced physical button detection (single/double/long/triple)
    await this.initPhysicalButtonDetection(zclNode);

    // v5.5.412: Initialize virtual buttons
    await this.initVirtualButtons();

    this.log('[SWITCH-1G] v5.5.896 - Physical button detection: single/double/long/triple');
  }

  /**
   * Override capability listener to mark app commands
   */
  async _registerCapabilityListeners() {
    await super._registerCapabilityListeners?.();
    
    // Wrap onoff listener to track app commands for physical detection
    const originalOnOff = this.getCapabilityValue('onoff');
    this.registerCapabilityListener('onoff', async (value) => {
      this.markAppCommand(1); // Mark as app command before sending
      return this._setGangState?.(1, value) || this._setOnOff?.(value);
    });
  }
}

module.exports = Switch1GangDevice;
