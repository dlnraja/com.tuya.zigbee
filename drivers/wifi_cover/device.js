'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
const {
  detectCoverCommandSet, coverStateFromValue, coverValueFromState,
} = require('../../lib/tuya-local/TuyaDeviceTemplates');
const { CoverPositionSource } = require('../../lib/tuya-local/CoverPositionSource');

let _Estimator = null; // lazy: only covers with travel_time_s > 0 load it
function Estimator() { return _Estimator || (_Estimator = require('../../lib/tuya-local/CoverTravelEstimator')); }

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
          let state;
          if (this._coverCommandSet) {state = coverStateFromValue(v, this._coverCommandSet);}
          else if (v === 'open' || v === '0' || v === 0) {state = 'up';}
          else if (v === 'close' || v === '2' || v === 2) {state = 'down';}
          else {state = 'idle';}
          this._travelOnState(state);
          this._npcOnState(state); // P3371
          return state;
        },
        reverseTransform: (v) => {
          if (this._coverCommandSet) {return coverValueFromState(v, this._coverCommandSet);}
          if (v === 'up') {return 'open';}
          if (v === 'down') {return 'close';}
          return 'stop';
        } },
      '2': { capability: 'windowcoverings_set', writable: true,
        // P2952 (forum 154077 #487/#489, Andi): DP2 is the target; once DP3 reports, it owns the tile.
        // P3062: any position DP also disables the opt-in travel-time estimator for good.
        transform: (v) => { this._notePositionDp(); return this._positionSource().accept(2, v) ? v / 100 : undefined; },
        reverseTransform: (v) => Math.round(v * 100) },
      '3': { capability: 'windowcoverings_set',
        transform: (v) => { this._notePositionDp(); return this._positionSource().accept(3, v) ? v / 100 : undefined; } },
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

  // ---- opt-in time-based positioning (setting travel_time_s > 0, only while no position DP was ever seen) ----
  // WHY(2026-10-10): open/close/stop-only Wi-Fi motors left windowcoverings_set meaningless. Fallback only:
  // a real DP2/DP3 report disables the estimator for good (store cover_has_position_dp).
  _travel() {
    if (this._hasPositionDp) {return null;}
    const sec = Number(this.getSetting?.('travel_time_s'));
    if (!Number.isFinite(sec) || sec <= 0) {return null;}
    const ms = Math.round(sec * 1000);
    if (!this._travelEst || this._travelEst.travelMs !== ms) {
      let pos = null;
      try { const v = this.getStoreValue?.('cover_estimated_position'); pos = typeof v === 'number' ? v : null; } catch (_e) { /* ignore */ }
      this._travelEst = new (Estimator())({ travelMs: ms, position: pos });
    }
    return this._travelEst;
  }

  _notePositionDp() {
    if (this._hasPositionDp) {return;}
    this._hasPositionDp = true;
    this._clearTravelTimer();
    this._travelEst = null;
    try { this.setStoreValue('cover_has_position_dp', true).catch(() => {}); } catch (_e) { /* non-critical */ }
  }

  _travelOnState(state) {
    const est = this._travel();
    if (!est) {return;}
    const pos = est.onState(state);
    if (state === 'idle') {this._clearTravelTimer();}
    if (pos === null) {return;}
    try { this.setStoreValue('cover_estimated_position', pos).catch(() => {}); } catch (_e) { /* ignore */ }
    if (state === 'idle' && typeof this.safeSetCapabilityValue === 'function') {
      this.safeSetCapabilityValue('windowcoverings_set', Math.round(pos * 100) / 100).catch(() => {});
    }
  }

  _clearTravelTimer() {
    if (this._travelTimer) {
      try { (this.homey && this.homey.clearTimeout ? this.homey.clearTimeout.bind(this.homey) : clearTimeout)(this._travelTimer); } catch (_e) { /* ignore */ }
      this._travelTimer = null;
    }
  }

  // ---- P3371: open/stop/close-only motors (forum 146735 #499/#503, CAWV EMTECO) ----
  // Apple Home / Matter send position targets only; a DP2 write does nothing on these motors.
  // Without the opt-in estimator, translate the target to open/close. Capabilities are kept.
  _isNoPositionCover() {
    if (this._hasPositionDp) {return false;}
    let cloud = null; let moves = 0;
    try { const c = this.getStoreValue?.('cloud_has_position_dp'); cloud = typeof c === 'boolean' ? c : null; } catch (_e) { /* ignore */ }
    try { moves = Number(this.getStoreValue?.('cover_nopos_moves')) || 0; } catch (_e) { /* ignore */ }
    return require('../../lib/covers/NoPositionCover').isNoPosition({
      positionSeen: false,
      cloudHasPosition: cloud, moves, minMoves: 3,
    });
  }

  _npcOnState(state) {
    try {
      if (this._hasPositionDp) {return;}
      if (state === 'up' || state === 'down') {
        this._npcLastDir = state;
        const n = (Number(this.getStoreValue?.('cover_nopos_moves')) || 0) + 1;
        if (n <= 1000) {this.setStoreValue?.('cover_nopos_moves', n)?.catch?.(() => {});}
        return;
      }
      // Bidirectional HomeKit consistency: once a run ends, report 100 % / 0 % on the position tile.
      if (state !== 'idle' || !this._npcLastDir || this._travel() || !this._isNoPositionCover()) {return;}
      const pos = require('../../lib/covers/NoPositionCover').stateToPosition(this._npcLastDir);
      this._npcLastDir = null;
      if (pos !== null && typeof this.safeSetCapabilityValue === 'function' && this.hasCapability?.('windowcoverings_set')) {
        this.safeSetCapabilityValue('windowcoverings_set', pos).catch(() => {});
      }
    } catch (_e) { /* soft */ }
  }

  async _setDP(dp, value) {
    const est = String(dp) === '2' ? this._travel() : null;
    const plan = est ? est.plan(Number(value) / 100) : null;
    const cmd = (st) => this._coverCommandSet ? coverValueFromState(st, this._coverCommandSet) : { up: 'open', down: 'close', idle: 'stop' }[st];
    if (!plan && String(dp) === '2' && this._isNoPositionCover()) {
      const st = require('../../lib/covers/NoPositionCover').positionToState(Number(value) / 100);
      this.log(`[WIFI-COVER] P3371 no-position motor: target ${value}% -> DP1 ${cmd(st)}`);
      this._npcLastDir = st;
      await super._setDP('1', cmd(st));
      if (typeof this.safeSetCapabilityValue === 'function' && this.hasCapability?.('windowcoverings_state')) {
        this.safeSetCapabilityValue('windowcoverings_state', st).catch(() => {});
      }
      return undefined;
    }
    if (!plan) {return super._setDP(dp, value);}
    this._clearTravelTimer();
    await super._setDP('1', cmd(plan.state));
    this._travelOnState(plan.state);
    if (plan.ms > 0 && this.homey && typeof this.homey.setTimeout === 'function') {
      this._travelTimer = this.homey.setTimeout(() => {
        this._travelTimer = null;
        if (this._destroyed) {return;}
        super._setDP('1', cmd('idle')).then(() => this._travelOnState('idle')).catch((e) => this.error?.('[WIFI-COVER] timed stop failed:', e && e.message));
      }, plan.ms);
    }
    return undefined;
  }

  async onUninit() {
    this._clearTravelTimer();
    if (super.onUninit) {await super.onUninit();}
  }

  async onInit() {
    try { this._coverCommandSet = this.getStoreValue('cover_command_set') || null; } catch (_e) { /* store not ready */ }
    this._applyCloudCoverRange();
    try { this._hasPositionDp = this.getStoreValue('cover_has_position_dp') === true; } catch (_e) { /* store not ready */ }
    await super.onInit();
    this.log('[WIFI-COVER] Ready'); }


  async onDeleted() {
    if (this._destroyed) {return;}
    this._destroyed = true;
    this._clearTravelTimer();
    this.log('Device deleted, cleaning up');
    await super.onDeleted();
  }
}

module.exports = WiFiCoverDevice;
return module.exports;
});
