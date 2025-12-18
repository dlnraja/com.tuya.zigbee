'use strict';

const { HybridLightBase } = require('../../lib/devices/HybridLightBase');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      DIMMABLE BULB - v5.5.129 FIXED (extends HybridLightBase properly)      ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  HybridLightBase handles: onoff, dim listeners completely                   ║
 * ║  This class only defines dpMappings and lightCapabilities                   ║
 * ║  DPs: 1=switch, 2=brightness, 3=min brightness, 4=countdown, 21=power-on    ║
 * ║  ZCL: 0x0006 On/Off, 0x0008 Level Control                                   ║
 * ║  Models: TS0501B, TS0502B, _TZ3210_*, _TZ3000_*                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class DimmableBulbDevice extends HybridLightBase {

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
    this.log('[DIM-BULB] v5.5.129 - DPs: 1-4,21,101 | ZCL: 6,8,EF00');
    this.log('[DIM-BULB] ✅ Dimmable bulb ready');
  }
}

module.exports = DimmableBulbDevice;
