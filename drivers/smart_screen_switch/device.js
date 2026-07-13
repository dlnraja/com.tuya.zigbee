'use strict';

const UnifiedCoverBase = require('../../lib/devices/UnifiedCoverBase');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

/**
 * SmartScreenSwitchDevice - Smart Screen Switch (Motorized Screen/Blind)
 * DPs: 1=control(ENUM), 2=position(VALUE/100), 3=current_position(VALUE/100),
 *      4=luminance(VALUE), 5=temperature(smartDivisor), 6=motion(BOOL)
 */
class SmartScreenSwitchDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedCoverBase)) {

  get mainsPowered() { return true; }

  get dpMappings() {
    return {
      ...super.dpMappings,
      1: { capability: 'windowcoverings_state', transform: (v) => v === 0 ? 'up' : v === 2 ? 'down' : 'idle' },
      2: { capability: 'windowcoverings_set', transform: (v) => v / 100 },
      3: { internal: true, type: 'current_position', transform: (v) => v / 100 },
      4: { capability: 'measure_luminance' },
      5: { capability: 'measure_temperature', smartDivisor: true },
      6: { capability: 'alarm_motion', transform: (v) => v === 1 || v === true },
    };
  }

  async onNodeInit({ zclNode }) {
    if (this._initialized) return;
    this._initialized = true;

    await super.onNodeInit({ zclNode });
    this.log('[SmartScreenSwitch] Initialized');
  }

  onDeleted() {
    this._destroyed = true;
    if (super.onDeleted) super.onDeleted();
  }
}

module.exports = SmartScreenSwitchDevice;
