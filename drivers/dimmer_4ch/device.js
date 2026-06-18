'use strict';

const UnifiedLightBase = require('../../lib/devices/UnifiedLightBase');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

/**
 * Dimmer4chDevice - 4-Channel Dimmer Module
 * DPs: 1=ch1_onoff(BOOL), 2=ch1_dim(VALUE/100), 7=ch2_onoff(BOOL), 8=ch2_dim(VALUE/100),
 *      13=ch3_onoff(BOOL), 14=ch3_dim(VALUE/100), 19=ch4_onoff(BOOL), 20=ch4_dim(VALUE/100)
 */
class Dimmer4chDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedLightBase)) {

  get mainsPowered() { return true; }

  get lightCapabilities() {
    return ['onoff', 'dim', 'onoff.2', 'dim.2', 'onoff.3', 'dim.3', 'onoff.4', 'dim.4'];
  }

  get gangCount() { return 4; }

  get dpMappings() {
    return {
      ...super.dpMappings,
      // Channel 1
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      2: { capability: 'dim', transform: (v) => Math.max(0, Math.min(1, v / 100)) },
      // Channel 2
      7: { capability: 'onoff.2', transform: (v) => v === 1 || v === true },
      8: { capability: 'dim.2', transform: (v) => Math.max(0, Math.min(1, v / 100)) },
      // Channel 3
      13: { capability: 'onoff.3', transform: (v) => v === 1 || v === true },
      14: { capability: 'dim.3', transform: (v) => Math.max(0, Math.min(1, v / 100)) },
      // Channel 4
      19: { capability: 'onoff.4', transform: (v) => v === 1 || v === true },
      20: { capability: 'dim.4', transform: (v) => Math.max(0, Math.min(1, v / 100)) },
    };
  }

  async onNodeInit({ zclNode }) {
    if (this._initialized) return;
    this._initialized = true;

    await super.onNodeInit({ zclNode });
    this.log('[Dimmer4ch] Initialized with 4 channels');
  }

  onDeleted() {
    this._destroyed = true;
    if (super.onDeleted) super.onDeleted();
  }
}

module.exports = Dimmer4chDevice;
