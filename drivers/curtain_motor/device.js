'use strict';

// v5.5.295: Fix "Class extends value undefined" stderr error
// Use try-catch to handle potential circular dependency issues
let HybridCoverBase;
try {
  HybridCoverBase = require('../../lib/devices/HybridCoverBase');
} catch (error) {
  // Fallback to direct ZigBeeDevice if HybridCoverBase fails
  console.error('[CURTAIN_MOTOR] Failed to load HybridCoverBase, using ZigBeeDevice fallback:', error.message);
  const { ZigBeeDevice } = require('homey-zigbeedriver');
  HybridCoverBase = ZigBeeDevice;
}

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
    this.log('[CURTAIN] v5.5.321 - DPs: 1-10,12,13,101,102 | ZCL: 258,6,8,EF00');

    // v5.5.321: Apply calibration settings on init
    await this._applyCalibrationSettings();

    this.log('[CURTAIN] ✅ Ready');
  }

  /**
   * v5.5.321: Apply calibration settings via Tuya DP
   * DP101 = open_time (seconds)
   * DP102 = close_time (seconds)
   * DP5 = reverse direction (0/1)
   */
  async _applyCalibrationSettings() {
    try {
      const openTime = this.getSetting('open_time') || 0;
      const closeTime = this.getSetting('close_time') || 0;
      const reverse = this.getSetting('reverse_direction') || false;

      if (openTime > 0) {
        this.log(`[CURTAIN] Setting open_time: ${openTime}s`);
        await this._sendTuyaDP(101, openTime, 'value');
      }
      if (closeTime > 0) {
        this.log(`[CURTAIN] Setting close_time: ${closeTime}s`);
        await this._sendTuyaDP(102, closeTime, 'value');
      }
      if (reverse) {
        this.log('[CURTAIN] Setting reverse direction');
        await this._sendTuyaDP(5, 1, 'bool');
      }
    } catch (err) {
      this.log('[CURTAIN] ⚠️ Could not apply calibration:', err.message);
    }
  }

  /**
   * v5.5.321: Handle settings changes
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    await super.onSettings?.({ oldSettings, newSettings, changedKeys });

    if (changedKeys.includes('open_time') || changedKeys.includes('close_time') || changedKeys.includes('reverse_direction')) {
      this.log('[CURTAIN] Calibration settings changed, applying...');
      await this._applyCalibrationSettings();
    }
  }

  /**
   * v5.5.321: Send Tuya DP command
   */
  async _sendTuyaDP(dp, value, type = 'value') {
    try {
      const tuyaCluster = this.zclNode?.endpoints?.[1]?.clusters?.tuya
        || this.zclNode?.endpoints?.[1]?.clusters?.[61184];

      if (tuyaCluster?.datapoint) {
        await tuyaCluster.datapoint({ dp, value, datatype: type === 'bool' ? 1 : 2 });
        this.log(`[CURTAIN] ✅ Sent DP${dp}=${value}`);
      }
    } catch (err) {
      this.log(`[CURTAIN] ⚠️ DP${dp} send failed:`, err.message);
    }
  }
}

module.exports = CurtainMotorDevice;
