'use strict';

const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      DIN RAIL METER - v9.7.3 UNIFIED (extends UnifiedPlugBase properly)      ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ UnifiedPlugBase handles: electrical measurement, Tuya DP energy tracking      ║
 * ║  v9.7.3: purged manual listeners in favor of centralized dpMappings         ║
 * ║  Supports: bidirectional metering (import/export)                            ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class DinRailMeterDevice extends UnifiedPlugBase {

  // v9.7.3: Do NOT force onoff if not in manifest (it's a sensor class meter)
  get plugCapabilities() { 
    return ['measure_power', 'meter_power', 'measure_voltage', 'measure_current', 'meter_power.exported']; 
  }

  async _migrateCapabilities() {
    // Overriding parent to NOT force onoff
    const required = []; // No forced capabilities for sensor-class meters
    for (const cap of required) {
      if (!this.hasCapability(cap)) {
        await this.addCapability(cap).catch(() => { });
      }
    }
  }

  get dpMappings() {
    const powerScale = parseFloat(this.getSetting('power_scale') || '1');
    const bidirectional = this.getSetting('bidirectional') || false;

    return {
      ...super.dpMappings,
      1: { capability: 'meter_power', divisor: 100 },       // Total energy (kWh * 100)
      6: { 
        capability: bidirectional ? 'meter_power.exported' : null, 
        divisor: 100 
      }, // Exported energy (kWh * 100)
      18: { capability: 'measure_power', divisor: 1 / powerScale }, // Power (W)
      19: { capability: 'measure_voltage', divisor: 10 },    // Voltage (V * 10)
      20: { capability: 'measure_current', divisor: 1000 },  // Current (A * 1000)
      17: { capability: 'measure_current', divisor: 1000 },  // Alternative Current DP
      101: { capability: null, internal: 'power_factor' },
      102: { capability: null, internal: 'frequency', divisor: 100 }
    };
  }

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => {
      // v9.7.3: Initialization handled by parent
      await super.onNodeInit({ zclNode });
      this.log('DIN Rail Meter v9.7.3 initialized');
      this.log('[DIN-METER] ✅ Ready');
    }, 'onNodeInit');
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    // No need for manual state updates here as dpMappings getter uses current settings
    await super.onSettings({ oldSettings, newSettings, changedKeys });
    
    if (changedKeys.includes('power_scale') || changedKeys.includes('bidirectional')) {
      this.log(`[DIN-METER] Settings changed, DP mappings will adapt: scale=${newSettings.power_scale}, bidi=${newSettings.bidirectional}`);
    }
  }

  async onDeleted() {
    await super.onDeleted();
    this.log('Device deleted, cleaning up');
  }
}

module.exports = DinRailMeterDevice;

