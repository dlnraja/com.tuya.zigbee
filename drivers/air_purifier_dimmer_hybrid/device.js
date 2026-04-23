'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const UnifiedLightBase = require('../../lib/devices/UnifiedLightBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

class DimmerWall1GangDevice extends VirtualButtonMixin(UnifiedLightBase) {
  _appCommandPending = false;
  _appCommandTimeout = null;
  _lastOnoffState = null;
  _lastDimValue = null;

  get lightCapabilities() { return ['onoff', 'dim']; }

  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      2: { capability: 'dim', transform: (v) => Math.max(0.01, Math.min(1, v * 1000 / 1000)) },
      101: { capability: 'dim', divisor: 100 }
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    await this.initVirtualButtons();
  }

  _markAppCommand() {
    this._appCommandPending = true;
    clearTimeout(this._appCommandTimeout);
    this._appCommandTimeout = setTimeout(() => { this._appCommandPending = false; }, 2000);
  }

  async _setOnOff(value) { this._markAppCommand(); return super._setOnOff(value); }
  async _setDim(value) { this._markAppCommand(); return super._setDim(value); }

  _handleDP(dpId, rawValue) {
    const oldDim = this._lastDimValue;
    super._handleDP(dpId, rawValue);
    const isPhysical = !this._appCommandPending;

    if (dpId === 1) {
      const v = rawValue === 1 || rawValue === true;
      if (this._lastOnoffState === v) return;
      this._lastOnoffState = v;
      if (isPhysical) {
        const id = v ? 'air_purifier_dimmer_hybrid_dimmer_wall_1gang_physical_on' : 'air_purifier_dimmer_hybrid_dimmer_wall_1gang_physical_off';
        const card = this.homey.app?._safeGetTriggerCard?.(id );
        if (card) card.trigger(this, {}, {}).catch(() => {});
      }
    } else if (dpId === 2 || dpId === 101) {
      const dim = this.getCapabilityValue('dim');
      if (this._lastDimValue === dim) return;
      const increased = oldDim !== null && dim > oldDim;
      this._lastDimValue = dim;
      if (isPhysical && oldDim !== null) {
        const id = increased ? 'air_purifier_dimmer_hybrid_dimmer_wall_1gang_physical_brightness_up' : 'air_purifier_dimmer_hybrid_dimmer_wall_1gang_physical_brightness_down';
        const card = this.homey.app?._safeGetTriggerCard?.(id );
        if (card) card.trigger(this, { brightness: Math.round(dim * 100) }, {}).catch(() => {});
      }
    }
  }

  onDeleted() {
    clearTimeout(this._appCommandTimeout);
    if (typeof super.onDeleted === 'function') super.onDeleted();
  }
}

module.exports = DimmerWall1GangDevice;


