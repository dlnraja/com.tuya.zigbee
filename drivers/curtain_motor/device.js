'use strict';
const { HybridCoverBase } = require('../../lib/devices');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      CURTAIN / COVER MOTOR - v5.5.129 FIXED (extends HybridCoverBase)       ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  HybridCoverBase handles: all cover listeners (state, set, tilt, dim)       ║
 * ║  This class ONLY: dpMappings                                                ║
 * ║  DPs: 1-10,12,13,101,102 | ZCL: 258,6,8,EF00                               ║
 * ║  Variants: GIRIER, Lonsonho, Zemismart, MOES                               ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class CurtainMotorDevice extends HybridCoverBase {

  get mainsPowered() { return true; }

  get dpMappings() {
    return {
      1: { capability: 'windowcoverings_state', transform: (v) => v === 0 || v === 'open' ? 'up' : v === 2 || v === 'close' ? 'down' : 'idle' },
      2: { capability: 'windowcoverings_set', transform: (v) => v / 100 },
      3: { capability: 'dim', transform: (v) => v / 100 },
      4: { capability: null, internal: 'mode', writable: true },
      5: { capability: null, internal: 'reverse', writable: true },
      6: { capability: null, internal: 'border' },
      7: { capability: null, internal: 'position_reached' },
      8: { capability: 'moving', transform: (v) => v === 1 || v === 2 || v === 'opening' || v === 'closing' },
      9: { capability: 'windowcoverings_tilt_set', transform: (v) => v / 100 },
      10: { capability: null, internal: 'speed', writable: true },
      12: { capability: null, internal: 'backlight', writable: true },
      13: { capability: 'measure_battery', divisor: 1 },
      101: { capability: null, internal: 'open_time', writable: true },
      102: { capability: null, internal: 'close_time', writable: true }
    };
  }

  async onNodeInit({ zclNode }) {
    // Parent handles ALL: cover listeners, Tuya DP, ZCL
    await super.onNodeInit({ zclNode });
    this.log('[CURTAIN] v5.5.129 - DPs: 1-10,12,13,101,102 | ZCL: 258,6,8,EF00');
    this.log('[CURTAIN] ✅ Ready');
  }
}

module.exports = CurtainMotorDevice;
