'use strict';
const HybridLightBase = require('../../lib/devices/HybridLightBase');
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

  // v5.8.97: Physical button detection state (PR #112 packetninja pattern)
  _appCommandPending = false;
  _appCommandTimeout = null;
  _lastOnoffState = null;
  _lastDimValue = null;

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
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'haElectricalMeasurement',
          attributeName: 'activePower',
          minInterval: 10,
          maxInterval: 300,
          minChange: 5,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    // Parent handles ALL: onoff/dim listeners, ZCL setup
    await super.onNodeInit({ zclNode });
    // v5.5.412: Initialize virtual buttons
    await this.initVirtualButtons();
    this.log('[DIMMER-1G] v5.8.97 ✅ Ready + physical detection');
  }

  _markAppCommand() {
    this._appCommandPending = true;
    clearTimeout(this._appCommandTimeout);
    this._appCommandTimeout = setTimeout(() => { this._appCommandPending = false; }, 2000);
  }

  async _setOnOff(value) { this._markAppCommand(); return super._setOnOff(value); }
  async _setDim(value) { this._markAppCommand(); return super._setDim(value); }

  _handleDP(dpId, rawValue) {
    const oldOnoff = this._lastOnoffState;
    const oldDim = this._lastDimValue;
    super._handleDP(dpId, rawValue);
    const isPhysical = !this._appCommandPending;
    if (dpId === 1) {
      const v = rawValue === 1 || rawValue === true;
      if (this._lastOnoffState === v) return;
      this._lastOnoffState = v;
      if (isPhysical) {
        const id = v ? 'air_purifier_dimmer_hybrid_dimmer_wall_1gang_physical_on' : 'air_purifier_dimmer_hybrid_dimmer_wall_1gang_physical_off';
        try {
          (() => { try { return this.homey.flow.getDeviceTriggerCard(id); } catch (e) { this.error('[FLOW-SAFE] Failed to load card:', e.message); return null; } })().trigger(this, {}, {}).catch(() => {});
        } catch (e) { /* card missing */ }
      }
    } else if (dpId === 2 || dpId === 101) {
      const dim = this.getCapabilityValue('dim');
      if (this._lastDimValue === dim) return;
      const increased = oldDim !== null && dim > oldDim;
      this._lastDimValue = dim;
      if (isPhysical && oldDim !== null) {
        const id = increased ? 'air_purifier_dimmer_hybrid_dimmer_wall_1gang_physical_brightness_up' : 'air_purifier_dimmer_hybrid_dimmer_wall_1gang_physical_brightness_down';
        try {
          (() => { try { return this.homey.flow.getDeviceTriggerCard(id); } catch (e) { this.error('[FLOW-SAFE] Failed to load card:', e.message); return null; } })().trigger(this, { brightness: Math.round(dim * 100) }, {}).catch(() => {});
        } catch (e) { /* card missing */ }
      }
    }
  }

  onDeleted() { clearTimeout(this._appCommandTimeout); super.onDeleted?.(); }
}

module.exports = DimmerWall1GangDevice;

