const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const BatteryMixin = require('../../lib/tuya/BatteryMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      6-GANG SWITCH - v9.7.2 UNIVERSAL                                        ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Standardized via Unified Architecture:                                       ║
 * ║  - PhysicalButtonMixin (tuya/v9.7.2) for bidirectional sync & dedup          ║
 * ║  - BatteryMixin (tuya/v9.6.0) for optional battery monitoring                ║
 * ║  - UnifiedSwitchBase for core relay logic                                    ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class Switch6GangDevice extends PhysicalButtonMixin(BatteryMixin(VirtualButtonMixin(UnifiedSwitchBase))) {

  get mainsPowered() { return true; }
  
  get gangCount() { return 6; }

  get sceneMode() { return this.getSetting('scene_mode') || 'auto'; }

  async setSceneMode(mode) {
    this.log('[SCENE] Setting scene mode to:', mode);
    await this.setSettings({ scene_mode: mode }).catch(() => {});
  }

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => {
      await super.onNodeInit({ zclNode });
      await this.initVirtualButtons();
      this.log('[SWITCH-6G] ✅ Universal initialization complete');
    }, 'onNodeInit');
  }
}

module.exports = Switch6GangDevice;
