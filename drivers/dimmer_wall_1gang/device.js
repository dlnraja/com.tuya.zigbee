'use strict';
const { HybridLightBase } = require('../../lib/devices');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      1-GANG DIMMER - v5.5.129 FIXED (extends HybridLightBase properly)      ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  HybridLightBase handles: onoff, dim listeners and ZCL setup                ║
 * ║  This class ONLY: dpMappings                                                ║
 * ║  DPs: 1-5,7,9,14,101,102 | ZCL: 6,8,EF00                                   ║
 * ║  Models: TS0601, TS110F, _TZE200_*, _TZ3210_*                               ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class DimmerWall1GangDevice extends HybridLightBase {

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
    this.log('[DIMMER-1G] v5.5.129 - DPs: 1-5,7,9,14,101,102 | ZCL: 6,8,EF00');
    this.log('[DIMMER-1G] ✅ Ready');
  }
}

module.exports = DimmerWall1GangDevice;
