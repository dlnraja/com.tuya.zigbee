'use strict';

const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const PowerSwitchFeaturesMixin = require('../../lib/mixins/PowerSwitchFeaturesMixin');

/**
 * WALL SWITCH 1-GANG 1-WAY - v9.8.0 Unified Architecture
 * Standardized on PhysicalButtonMixin for robust bidirectional sync and layered detection.
 * Compatible with BSEED devices: _TZ3000_blhvsaqf, _TZ3000_ysdv91bk
 *
 * v9.8.0: Added PowerSwitchFeaturesMixin for DP 12 (power_on_state) and DP 2 (backlight_mode)
 */
class WallSwitch1Gang1WayDevice extends PowerSwitchFeaturesMixin(PhysicalButtonMixin(VirtualButtonMixin(UnifiedSwitchBase))) {

  get mainsPowered() { return true; }

  get gangCount() { return 1; }

  async onNodeInit({ zclNode }) {
    // All devices routed here are mains-powered one-gang relays. Remove stale
    // capabilities retained by Homey after upgrading from an older manifest.
    for (const capability of ['button.1', 'measure_battery', 'alarm_battery']) {
      if (this.hasCapability(capability)) {
        await this.removeCapability(capability).catch(() => {});
      }
    }
    await this._safeInvoke(async () => { await super.onNodeInit({ zclNode  });
      // v9.8.0: Initialization is now orchestrated by UnifiedSwitchBase and Mixins.
      // Physical button detection, virtual buttons, and capability sync are handled automatically.
      // PowerSwitchFeaturesMixin adds DP 12 (power_on_state) and DP 2 (backlight_mode) support.
      this.log('[WALL-1G] v9.8.0 - Unified initialization complete');
    }, 'onNodeInit');
  }

}

module.exports = WallSwitch1Gang1WayDevice;
