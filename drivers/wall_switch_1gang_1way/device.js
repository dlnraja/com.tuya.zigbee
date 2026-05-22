'use strict';

const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * WALL SWITCH 1-GANG 1-WAY - v9.7.3 Unified Architecture
 * Standardized on PhysicalButtonMixin for robust bidirectional sync and layered detection.
 * Compatible with BSEED devices: _TZ3000_blhvsaqf, _TZ3000_ysdv91bk
 */
class WallSwitch1Gang1WayDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedSwitchBase)) {

  get mainsPowered() { return true; }

  get gangCount() { return 1; }

  async onNodeInit({ zclNode }) {
    // Auto-fix: Remove battery capabilities for mains-powered devices
    await this.removeCapability('measure_battery').catch(() => {});
    await this.removeCapability('alarm_battery').catch(() => {});
    await this._safeInvoke(async () => { await super.onNodeInit({ zclNode  });
    await this.initVirtualButtons();
      // v9.7.3: Initialization is now orchestrated by UnifiedSwitchBase and Mixins.
      // Physical button detection, virtual buttons, and capability sync are handled automatically.
      this.log('[WALL-1G] v9.7.3 - Unified initialization complete');
    }, 'onNodeInit');
  }

}

module.exports = WallSwitch1Gang1WayDevice;
