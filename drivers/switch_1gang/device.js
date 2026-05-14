'use strict';
const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const BatteryMixin = require('../../lib/tuya/BatteryMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin'); // Keep for now as it handles button.toggle
const { setupSonoffEwelink, handleSonoffEwlSettings } = require('../../lib/mixins/SonoffEwelinkMixin');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      1-GANG SWITCH - v9.7.2 UNIVERSAL                                        ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Standardized via Unified Architecture:                                       ║
 * ║  - PhysicalButtonMixin (tuya/v9.7.2) for bidirectional sync & dedup          ║
 * ║  - BatteryMixin (tuya/v9.6.0) for standard battery monitoring                ║
 * ║  - UnifiedSwitchBase for core relay logic                                    ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class Switch1GangDevice extends PhysicalButtonMixin(BatteryMixin(VirtualButtonMixin(UnifiedSwitchBase))) {

  get mainsPowered() { return true; }

  get gangCount() { return 1; }

  get sceneMode() { return this.getSetting('scene_mode') || 'auto'; }

  async setSceneMode(mode) {
    this.log('[SCENE] Setting scene mode to:', mode);
    await this.setSettings({ scene_mode: mode }).catch(() => {});
  }

  /**
   * EXTEND parent dpMappings with energy monitoring DPs
   */
  get dpMappings() {
    const parentMappings = super.dpMappings || {};
    return {
      ...parentMappings,
      17: { capability: 'measure_current', divisor: 1000, unit: 'A' },
      18: { capability: 'measure_power', divisor: 10, unit: 'W' },
      19: { capability: 'measure_voltage', divisor: 10, unit: 'V' },
      20: { capability: 'meter_power', divisor: 100, unit: 'kWh' }
    };
  }

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => {
      await super.onNodeInit({ zclNode });
      // v9.7.2: Specialized reporting for switches
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
      }
      ]).catch(() => {});
      } catch (err) {}
      await this.initVirtualButtons();
      await setupSonoffEwelink(this, zclNode);
      this.log('[SWITCH-1G] ✅ Universal initialization complete');
    }, 'onNodeInit');
  }
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    await super.onSettings({ oldSettings, newSettings, changedKeys });
    for (var k of changedKeys) {
      await handleSonoffEwlSettings(this, k, newSettings[k]);
    }
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = Switch1GangDevice;
