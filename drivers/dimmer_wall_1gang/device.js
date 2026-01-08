'use strict';
const { HybridLightBase } = require('../../lib/devices/HybridLightBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      1-GANG DIMMER - v5.5.412 + Virtual Buttons                             ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  HybridLightBase handles: onoff, dim listeners and ZCL setup                ║
 * ║  v5.5.412: Added virtual toggle/dim up/dim down buttons                     ║
 * ║  DPs: 1-5,7,9,14,101,102 | ZCL: 6,8,EF00                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class DimmerWall1GangDevice extends VirtualButtonMixin(HybridLightBase) {

  get lightCapabilities() { return ['onoff', 'dim']; }

  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      2: { capability: 'dim', transform: (v) => Math.max(0.01, Math.min(1, v / 1000)) },
      3: { capability: null, internal: 'min_brightness', writable: true },
      4: { capability: null, internal: 'max_brightness', writable: true },
      5: { capability: null, internal: 'dimmer_mode', writable: true },
      7: { capability: null, internal: 'countdown', writable: true },
      9: { capability: null, internal: 'power_on_state', writable: true },
      14: { capability: null, internal: 'indicator_mode', writable: true },
      101: { capability: 'dim', divisor: 100 },
      102: { capability: null, internal: 'fade_time', writable: true }
    };
  }

  async onNodeInit({ zclNode }) {
    // Parent handles ALL: onoff/dim listeners, ZCL setup
    await super.onNodeInit({ zclNode });
    // v5.5.412: Initialize virtual buttons
    await this.initVirtualButtons();
    this.log('[DIMMER-1G] v5.5.412 ✅ Ready + virtual buttons');
  }
}

module.exports = DimmerWall1GangDevice;
