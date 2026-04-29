'use strict';
const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const { setupSonoffEwelink, handleSonoffEwlSettings } = require('../../lib/mixins/SonoffEwelinkMixin');

/**
 * 
 *       1-GANG SWITCH - v5.5.940 SIMPLIFIED (PR #118 rollback)                 
 * 
 *   Uses UnifiedSwitchBase which provides:                                       
 *   - dpMappings for DP 1-8 (gang switches) + DP 14-15 (settings)              
 *   - _setupTuyaDPMode() + _setupZCLMode()                                      
 *   - _registerCapabilityListeners() for all gangs                              
 *   - ProtocolAutoOptimizer for automatic detection                             
 *                                                                                
 *   NOTE: BSEED devices should use wall_switch_1gang_1way driver instead       
 *   (PR #118 by packetninja/Attilla)                                            
 * 
 */
class Switch1GangDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedSwitchBase)) {

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
    const parentMappings = Object.getPrototypeOf(Object.getPrototypeOf(this)).dpMappings || {};
    return {
      ...parentMappings,
      17: { capability: 'measure_current', divisor: 1000, unit: 'A' },
      18: { capability: 'measure_power', divisor: 10, unit: 'W' },
      19: { capability: 'measure_voltage', divisor: 10, unit: 'V' },
      20: { capability: 'meter_power', divisor: 100, unit: 'kWh' }
    };
  }

  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        },
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
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    // v5.8.95: Removed redundant _markAppCommand + broken _handleTuyaDatapoint wrapper.
    // UnifiedSwitchBase._setGangOnOff() now calls PhysicalButtonMixin.markAppCommand() centrally.
    await super.onNodeInit({ zclNode });
    this.initPhysicalButtonDetection(); // rule-19 injected
    await this.initPhysicalButtonDetection(zclNode);
    await this.initVirtualButtons();
    await setupSonoffEwelink(this, zclNode);
    this.log('[SWITCH-1G] v5.11.106 - Bidirectional physical+virtual button detection ready');
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
