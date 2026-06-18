'use strict';

const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const LightBase = require('../../lib/devices/UnifiedLightBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      1-GANG DIMMER - v5.5.412 + Virtual Buttons                             ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ LightBase handles: onoff, dim listeners and ZCL setup                ║
 * ║  v5.5.412: Added virtual toggle/dim up/dim down buttons                     ║
 * ║  DPs: 1-5,7,9,14,101,102 | ZCL: 6,8,EF00                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class DimmerWall1GangDevice extends PhysicalButtonMixin(VirtualButtonMixin(LightBase)) {

  get mainsPowered() { return true; }

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
      7: { capability: 'countdown_remaining' },
      9: { capability: 'power_on_behavior', transform: (v) => ({ 0: 'off', 1: 'on', 2: 'previous' }[v] ?? 'previous') },
      14: { capability: null, internal: 'indicator_mode', writable: true },
      101: { capability: 'dim', divisor: 100 },
      102: { capability: null, internal: 'fade_time', writable: true }
    };
  }

  async onNodeInit({ zclNode }) {
    // Auto-fix: Remove battery capabilities for mains-powered devices
    await this.removeCapability('measure_battery').catch(() => {});
    await this.removeCapability('alarm_battery').catch(() => {});
    await this._safeInvoke(async () => {
      await super.onNodeInit({ zclNode });

      // --- Attribute Reporting Configuration ---
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

      // v5.5.412: Initialize virtual buttons
      await this.initVirtualButtons();
      this.log('[DIMMER-1G] v5.8.97 ✅ Ready + physical detection');
    }, 'onNodeInit');
  }

  _markAppCommand() {
    this._appCommandPending = true;
    clearTimeout(this._appCommandTimeout);
    this._appCommandTimeout = this.homey.setTimeout(() => { if (this._destroyed) return; this._appCommandPending = false; }, 2000);
  }

  _setOnOff(value) { this._markAppCommand(); return super._setOnOff(value); }
  _setDim(value) { this._markAppCommand(); return super._setDim(value); }

  _handleDP(dpId, rawValue) {
    const oldOnoff = this._lastOnoffState;
    const oldDim = this._lastDimValue;
    super._handleDP(dpId, rawValue);
    const isPhysical = !this._appCommandPending;
    
    if (dpId === 1) {
      const v = rawValue === 1 || rawValue === true;
      if (this._lastOnoffState === v) {return;}
      this._lastOnoffState = v;
      if (isPhysical) {
        const id = v ? 'dimmer_wall_1gang_physical_on' : 'dimmer_wall_1gang_physical_off';
        const trigger = this.homey.flow.getDeviceTriggerCard(id);
        if (trigger) {trigger.trigger(this).catch(this.error);}
      }
    } else if (dpId === 2 || dpId === 101) {
      const dim = this.getCapabilityValue('dim');
      if (this._lastDimValue === dim) {return;}
      const increased = oldDim !== null && dim > oldDim;
      this._lastDimValue = dim;
      if (isPhysical && oldDim !== null) {
        const id = increased ? 'dimmer_wall_1gang_physical_brightness_up' : 'dimmer_wall_1gang_physical_brightness_down';
        const trigger = this.homey.flow.getDeviceTriggerCard(id);
        if (trigger) {trigger.trigger(this, { brightness: Math.round(dim * 100) }).catch(this.error);}
      }
    }
  }

  /**
   * v9.7.4: _setGangOnOff for switch_multi_gang flow card compatibility.
   * Single-gang dimmer: delegates to onoff capability listener.
   */
  async _setGangOnOff(gang, value) {
    this.log(`[FLOW] _setGangOnOff: gang=${gang} value=${value}`);
    if (typeof this.markAppCommand === 'function') {
      this.markAppCommand(1, value);
    }
    await this.triggerCapabilityListener('onoff', value);
  }

  onDeleted() {
    clearTimeout(this._appCommandTimeout);
    if (super.onDeleted) {super.onDeleted();}
  }
}

module.exports = DimmerWall1GangDevice;
