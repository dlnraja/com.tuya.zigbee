'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
const {
  detectCoverCommandSet, coverStateFromValue, coverValueFromState,
} = require('../../lib/tuya-local/TuyaDeviceTemplates');
const { CoverPositionSource } = require('../../lib/tuya-local/CoverPositionSource');

class WiFiCoverDevice extends TuyaLocalDevice {

  // v9.0.74: This device is mains-powered. Declare it so UnifiedBatteryHandler
  // does not add a false measure_battery capability (fixes false-battery reports).
  get mainsPowered() { return true; }

  get dpMappings() {
    return {
      '1': { capability: 'windowcoverings_state', writable: true,
        transform: async (v) => {
          // Learn the device's command vocabulary (open/close/stop, on/off/stop, fz/zz, 1/2/3, ...)
          this._learnCoverCommandSet(v);
          if (this._coverCommandSet) {return coverStateFromValue(v, this._coverCommandSet);}
          if (v === 'open' || v === '0' || v === 0) {return 'up';}
          if (v === 'close' || v === '2' || v === 2) {return 'down';}
          return 'idle';
        },
        reverseTransform: (v) => {
          if (this._coverCommandSet) {return coverValueFromState(v, this._coverCommandSet);}
          if (v === 'up') {return 'open';}
          if (v === 'down') {return 'close';}
          return 'stop';
        } },
      '2': { capability: 'windowcoverings_set', writable: true,
        // P2952 (forum 154077 #487/#489, Andi): DP2 is the target; once DP3 reports, it owns the tile.
        transform: (v) => this._positionSource().accept(2, v) ? v / 100 : undefined,
        reverseTransform: (v) => Math.round(v * 100) },
      '3': { capability: 'windowcoverings_set',
        transform: (v) => this._positionSource().accept(3, v) ? v / 100 : undefined },
      '5': { capability: null },
      '7': { capability: null },
      '12': { capability: null },
    };
  }

  _positionSource() {
    if (!this._coverPositionSource) {this._coverPositionSource = new CoverPositionSource();}
    return this._coverPositionSource;
  }

  /**
   * P2954 (forum 154077 #491, Andi): when a cloud DP table is stored (cloud_dp_range_1 = enum
   * range of DP1), pick the matching command set. Absent or unmatched -> unchanged behaviour.
   */
  _applyCloudCoverRange() {
    try {
      const range = this.getStoreValue('cloud_dp_range_1');
      if (!Array.isArray(range)) {return;}
      const { coverCommandSetFromRange } = require('../../lib/tuya-local/WifiDriverWiring');
      const { COVER_COMMAND_SETS } = require('../../lib/tuya-local/TuyaDeviceTemplates');
      const hit = coverCommandSetFromRange(range, COVER_COMMAND_SETS);
      if (hit && hit.status === 'confirmed') {this._coverCommandSet = hit.name;}
      this.log(`[WIFI-COVER] cloud range -> ${hit ? `${hit.name} (${hit.status})` : 'no match (lead)'}`);
    } catch (_e) { /* optional */ }
  }

  _learnCoverCommandSet(value) {
    const next = detectCoverCommandSet(value, this._coverCommandSet || null);
    if (next && next !== this._coverCommandSet) {
      this._coverCommandSet = next;
      this.log(`[WIFI-COVER] Command set detected: ${next}`);
      try { this.setStoreValue('cover_command_set', next).catch(() => {}); } catch (_e) { /* non-critical */ }
    }
  }

  async onInit() {
    try { this._coverCommandSet = this.getStoreValue('cover_command_set') || null; } catch (_e) { /* store not ready */ }
    this._applyCloudCoverRange();
    await super.onInit();
    this.log('[WIFI-COVER] Ready'); }


  async onDeleted() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.log('Device deleted, cleaning up');
    await super.onDeleted();
  }
}

module.exports = WiFiCoverDevice;
