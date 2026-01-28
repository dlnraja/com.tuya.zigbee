'use strict';
const HybridSwitchBase = require('../../lib/devices/HybridSwitchBase');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║   WALL SWITCH 1-GANG 1-WAY - HybridSwitchBase + Physical Button Detection   ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Uses HybridSwitchBase which provides:                                       ║
 * ║  - Auto-detection of Tuya DP vs ZCL mode                                     ║
 * ║  - ZCL onOff cluster support for BSEED devices                               ║
 * ║  - Tuya DP support for settings (backlight, etc.)                            ║
 * ║  - ProtocolAutoOptimizer for automatic protocol detection                    ║
 * ║                                                                               ║
 * ║  PhysicalButtonMixin provides:                                               ║
 * ║  - Physical button press detection (single, double, triple, long)            ║
 * ║  - Configurable detection windows                                            ║
 * ║                                                                               ║
 * ║  Compatible with BSEED devices: _TZ3000_blhvsaqf, _TZ3000_ysdv91bk          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class WallSwitch1Gang1WayDevice extends PhysicalButtonMixin(HybridSwitchBase) {

  get gangCount() { return 1; }

  /**
   * EXTEND parent dpMappings - Keep it simple for 1-gang switches
   */
  get dpMappings() {
    const parentMappings = Object.getPrototypeOf(Object.getPrototypeOf(this)).dpMappings || {};
    return {
      ...parentMappings,
      // No additional DPs needed for basic 1-gang switch
    };
  }

  async onNodeInit({ zclNode }) {
    this.log('════════════════════════════════════════');
    this.log('Wall Switch 1-Gang 1-Way initializing...');
    this.log('════════════════════════════════════════');

    // Let parent HybridSwitchBase handle protocol auto-detection
    await super.onNodeInit({ zclNode });

    // Initialize physical button detection
    await this.initPhysicalButtonDetection(zclNode);

    this.log('════════════════════════════════════════');
    this.log('Wall Switch 1-Gang 1-Way ready');
    this.log('════════════════════════════════════════');
  }

}

module.exports = WallSwitch1Gang1WayDevice;
