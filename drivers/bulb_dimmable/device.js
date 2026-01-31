'use strict';

const { HybridLightBase } = require('../../lib/devices/HybridLightBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      DIMMABLE BULB - v5.5.992 + Virtual Buttons                             ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  HybridLightBase handles: onoff, dim listeners completely                   ║
 * ║  v5.5.992: Added virtual toggle/dim up/down buttons                         ║
 * ║  DPs: 1=switch, 2=brightness, 3=min brightness, 4=countdown, 21=power-on    ║
 * ║  ZCL: 0x0006 On/Off, 0x0008 Level Control                                   ║
 * ║  Models: TS0501B, TS0502B, _TZ3210_*, _TZ3000_*                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class DimmableBulbDevice extends VirtualButtonMixin(HybridLightBase) {

  get lightCapabilities() { return ['onoff', 'dim']; }

  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      2: { capability: 'dim', transform: (v) => Math.max(0.01, v / 1000) },
      3: { capability: null, internal: 'min_brightness', writable: true },
      4: { capability: null, internal: 'countdown', writable: true },
      21: { capability: null, internal: 'power_on_behavior', writable: true },
      101: { capability: 'dim', divisor: 100 }
    };
  }

  async onNodeInit({ zclNode }) {
    // Parent handles EVERYTHING: ZCL setup, capability listeners
    await super.onNodeInit({ zclNode });
    // v5.5.992: Initialize virtual buttons
    await this.initVirtualButtons();
    this.log('[DIM-BULB] v5.5.992 ✅ Ready + virtual buttons');
  }
}

module.exports = DimmableBulbDevice;
