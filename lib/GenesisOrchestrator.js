'use strict';

const fs = require('fs');
const path = require('path');
const { getDeviceInfo, getDPMappings } = require('./utils/DriverMappingLoader');

/**
 * 🧠 GENESIS ORCHESTRATOR - Unified Truth Engine (v1.0.0)
 * 
 * Provides a single source of truth for all device mappings, 
 * merging local overrides, database intelligence, and legacy fallbacks.
 * 
 * Logic Level: Superior (Claude 4.6+ logic)
 */
class GenesisOrchestrator {

  constructor(device) {
    this.device = device;
    this.mfr = device.getSetting('zb_manufacturer_name') || '_unknown_';
    this.model = device.getSetting('zb_model_id') || '_unknown_';
  }

  /**
   * Resolve the complete functional definition for a device.
   * Merges: Class Overrides > Database > Passive Fallbacks
   */
  getFunctionalDefinition() {
    const dbInfo = getDeviceInfo(this.model, this.mfr) || {};
    const localMappings = this.device.dpMappings || {};
    
    // Merge DP mappings with intelligence
    const mergedMappings = {
      ...this._getPassiveFallbacks(this.mfr),
      ...dbInfo.dps,
      ...localMappings
    };

    return {
      id: `${this.mfr}:${this.model}`,
      mappings: mergedMappings,
      driver: dbInfo.driver || 'auto',
      isTuyaMCU: this.model === 'TS0601' || this.mfr.startsWith('_TZE'),
      polling: dbInfo.polling || { initial: 5000, interval: 300000 }
    };
  }

  /**
   * Moved from TuyaEF00Manager to centralize intelligence.
   */
  _getPassiveFallbacks(mfr) {
    const fallbacks = {
      // Presence / Radar
      '_TZE200_rhgsbacq': {
        1: { capability: 'alarm_motion' },
        4: { capability: 'measure_battery' },
        9: { capability: 'radar_sensitivity' },
        12: { capability: 'target_distance', divisor: 100 },
        103: { capability: 'measure_luminance' }
      },
      // Soil Sensors
      '_TZE284_oitavov2': {
        1: { capability: 'measure_temperature', divisor: 10 },
        2: { capability: 'measure_humidity' },
        3: { capability: 'measure_temperature', divisor: 10 }, // soil
        4: { capability: 'measure_humidity' }, // soil
        15: { capability: 'measure_battery' }
      },
      // Climate Sensors (ZTH05Z)
      '_TZE284_vvmbj46n': {
        1: { capability: 'measure_temperature', divisor: 10 },
        2: { capability: 'measure_humidity' }, // No divisor for this model!
        4: { capability: 'measure_battery' }
      }
    };

    return fallbacks[mfr] || {};
  }
}

/**
 * Singleton-like access for rapid lookup
 */
function getOrchestratedDefinition(device) {
  const orchestrator = new GenesisOrchestrator(device);
  return orchestrator.getFunctionalDefinition();
}

module.exports = {
  GenesisOrchestrator,
  getOrchestratedDefinition
};
