'use strict';

const UnifiedLightBase = require('../../lib/devices/UnifiedLightBase');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

/**
 * Dimmer010vDevice - 0-10V Dimmer Module
 * DPs: 1=onoff(BOOL), 2=brightness(VALUE/100), 3=min_brightness(VALUE),
 *      4=max_brightness(VALUE), 5=countdown(VALUE)
 */
class Dimmer010vDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedLightBase)) {

  get mainsPowered() { return true; }

  get lightCapabilities() { return ['onoff', 'dim']; }

  get dpMappings() {
    return {
      ...super.dpMappings,
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      2: { capability: 'dim', transform: (v) => Math.max(0, Math.min(1, v / 100)) },
      3: { internal: true, type: 'min_brightness', writable: true },
      4: { internal: true, type: 'max_brightness', writable: true },
      5: { capability: 'countdown_remaining' },
    };
  }

  async onNodeInit({ zclNode }) {
    if (this._initialized) return;
    this._initialized = true;

    await super.onNodeInit({ zclNode });
    this.log('[Dimmer010v] Initialized');
  }

  onDeleted() {
    this._destroyed = true;
    if (super.onDeleted) super.onDeleted();
  }
}

module.exports = Dimmer010vDevice;
