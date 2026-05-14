'use strict';
const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const BatteryMixin = require('../../lib/tuya/BatteryMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      8-GANG SWITCH - v9.7.2 UNIVERSAL                                        ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Standardized via Unified Architecture:                                       ║
 * ║  - PhysicalButtonMixin (tuya/v9.7.2) for bidirectional sync & dedup          ║
 * ║  - Special DP Mappings (1-6, 101, 102) for 8-gang hardware (TS0601)          ║
 * ║  - BatteryMixin (tuya/v9.6.0) for optional battery monitoring                ║
 * ║  - UnifiedSwitchBase for core relay logic                                    ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class Switch8GangDevice extends PhysicalButtonMixin(BatteryMixin(VirtualButtonMixin(UnifiedSwitchBase))) {

  get mainsPowered() { return true; }
  
  get gangCount() { return 8; }

  get sceneMode() { return this.getSetting('scene_mode') || 'auto'; }

  async setSceneMode(mode) {
    this.log('[SCENE] Setting scene mode to:', mode);
    await this.setSettings({ scene_mode: mode }).catch(() => {});
  }

  /**
   * Override DP mappings for 8-gang switches
   * Gang 7 = DP 101, Gang 8 = DP 102 (TS0601 hardware pattern)
   */
  get dpMappings() {
    const parentMappings = super.dpMappings || {};
    return {
      ...parentMappings,
      1: { capability: 'onoff' },
      2: { capability: 'onoff.gang2' },
      3: { capability: 'onoff.gang3' },
      4: { capability: 'onoff.gang4' },
      5: { capability: 'onoff.gang5' },
      6: { capability: 'onoff.gang6' },
      101: { capability: 'onoff.gang7' },
      102: { capability: 'onoff.gang8' },
      14: { capability: null, setting: 'power_on_behavior' },
      15: { capability: null, setting: 'led_indicator' }
    };
  }

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => {
      await super.onNodeInit({ zclNode });
      await this.initVirtualButtons();
      this.log('[SWITCH-8G] ✅ Universal initialization complete');
    }, 'onNodeInit');
  }
}

module.exports = Switch8GangDevice;
