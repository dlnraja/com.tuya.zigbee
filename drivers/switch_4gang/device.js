const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const BatteryMixin = require('../../lib/tuya/BatteryMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      4-GANG SWITCH - v9.7.2 UNIVERSAL                                        ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Standardized via Unified Architecture:                                       ║
 * ║  - PhysicalButtonMixin (tuya/v9.7.2) for bidirectional sync & dedup          ║
 * ║  - Group Isolation Quirk: Auto-handled for BSEED devices                     ║
 * ║  - Magic Mode (Detach Relay): Supported via scene_mode setting               ║
 * ║  - BatteryMixin (tuya/v9.6.0) for optional battery monitoring                ║
 * ║  - UnifiedSwitchBase for core relay logic                                    ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class Switch4GangDevice extends PhysicalButtonMixin(BatteryMixin(VirtualButtonMixin(UnifiedSwitchBase))) {

  get mainsPowered() { return true; }
  
  get gangCount() { return 4; }

  get sceneMode() { return this.getSetting('scene_mode') || 'auto'; }

  async setSceneMode(mode) {
    this.log('[SCENE] Setting scene mode to:', mode);
    await this.setSettings({ scene_mode: mode }).catch(() => {});
  }

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => {
      // v5.5.43: Cleanup orphan capabilities
      await this._cleanupOrphanCapabilities();
      // v9.7.2: PhysicalButtonMixin handles bidirectional sync and quirks (BSEED)
      await super.onNodeInit({ zclNode });
      // v5.5.26: Setup power measurement for ZCL devices
      await this._setupPowerMeasurement(zclNode);
      await this.initVirtualButtons();
      this.log('[SWITCH-4G] ✅ Universal initialization complete');
    }, 'onNodeInit');
  }

  /**
   * v5.5.43: Remove orphan capabilities that don't belong to this driver
   */
  async _cleanupOrphanCapabilities() {
    const validCaps = [
      'onoff', 'onoff.gang2', 'onoff.gang3', 'onoff.gang4',
      'measure_power', 'measure_voltage', 'measure_current', 'meter_power',
      'measure_battery', 'alarm_battery'
    ];
    const currentCaps = this.getCapabilities();
    for (const cap of currentCaps) {
      if (!validCaps.includes(cap) && !cap.startsWith('button')) {
        this.log(`[SWITCH-4G] ⚠️ Removing orphan capability: ${cap}`);
        await this.removeCapability(cap).catch(() => {});
      }
    }
  }

  /**
   * v5.5.26: Setup power measurement via electricalMeasurement + metering clusters
   */
  async _setupPowerMeasurement(zclNode) {
    const endpoint = zclNode?.endpoints?.[1];
    if (!endpoint?.clusters) return;

    // v9.7.2: Use standardized reporting helper
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'haElectricalMeasurement',
          attributeName: 'activePower',
          minInterval: 10,
          maxInterval: 300,
          minChange: 5,
        },
        {
          cluster: 'haElectricalMeasurement',
          attributeName: 'rmsVoltage',
          minInterval: 30,
          maxInterval: 600,
          minChange: 1,
        },
        {
          cluster: 'haElectricalMeasurement',
          attributeName: 'rmsCurrent',
          minInterval: 30,
          maxInterval: 600,
          minChange: 10,
        },
        {
          cluster: 'seMetering',
          attributeName: 'currentSummationDelivered',
          minInterval: 60,
          maxInterval: 3600,
          minChange: 1
        }
      ]).catch(() => {});
    } catch (e) {}
  }
}

module.exports = Switch4GangDevice;
