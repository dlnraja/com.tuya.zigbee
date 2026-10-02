'use strict';

const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const InPlaceIdentityLayer = require('../../lib/devices/InPlaceIdentityLayer');

/**
 * WIRELESS SWITCH - P127: UnifiedSwitchBase (was bare ZigBeeDevice)
 * - PhysicalButtonMixin for button press detection (ZCL/Tuya)
 * - VirtualButtonMixin + L14 safeSetCapabilityValue pipeline
 */
class SwitchWirelessDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedSwitchBase)) {

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => {
      this.buttonCount = 1;
      await super.onNodeInit({ zclNode });
      await this.initVirtualButtons();
      // WHY(P2792): smoke identity paired here keeps this driver; smoke / tamper / battery DPs in place.
      await InPlaceIdentityLayer.applyInPlaceIdentityLayer(this, zclNode);
      this.log('[WIRELESS-SWITCH] ✅ Universal initialization complete');
    }, 'onNodeInit');
  }

  /** P2792: per-couple DP overrides (e.g. TS0601 smoke DP1/4/14/15) merged over the switch map. */
  get dpMappings() {
    const base = super.dpMappings;
    const extra = InPlaceIdentityLayer.dpOverrides(this);
    return extra ? { ...base, ...extra } : base;
  }

  /** P2792: a smoke DP1 report is not a physical button press. */
  _handleTuyaDPReport(gang, value) {
    if (InPlaceIdentityLayer.dpOverrides(this)) {return;}
    if (typeof super._handleTuyaDPReport === 'function') {super._handleTuyaDPReport(gang, value);}
  }

}

module.exports = SwitchWirelessDevice;
