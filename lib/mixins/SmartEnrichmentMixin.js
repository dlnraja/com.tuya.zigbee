'use strict';

// A8: NaN Safety - use safeDivide/safeMultiply
  require('../utils/DriverMappingLoader');
const { safeAddCapability } = require('../helpers/device_helpers');
const { safeAutoMigrate } = require('../utils/safe-auto-migrate');

/**
 * SmartEnrichmentMixin
 * Dynamically enriches any driver (universal or specialized) using the mapping database.
 */
module.exports = (BaseObject) => class extends BaseObject {

  /**
   * Initialize Smart Enrichment
   */
  async _initSmartEnrichment() {
    this.log(' [SMART-ENRICH] Initializing dynamic enrichment...');

    try {
      const modelId = this.getStoreValue('modelId') || this.getSettings().zb_model_id;
      const manufacturer = this.getStoreValue('manufacturerName') || this.getSettings().zb_manufacturer_name;

      if (!modelId || !manufacturer) {
        this.log(' [SMART-ENRICH] Missing modelId or manufacturer, skipping');
        return;
      }

      // 1. Get info from Database (Z2M Enriched)
      const dbInfo = DriverMappingLoader.getDeviceInfo(modelId, manufacturer);
      
      if (!dbInfo) {
        this.log(' [SMART-ENRICH] No database record found for this model/mfr');
        return;
      }

      this.log(` [SMART-ENRICH] Found enrichment record: ${dbInfo.name || 'Unknown'}`);
      this._dbEnrichment = dbInfo;

      // 2. Apply Capability Overloads
      if (dbInfo.type && dbInfo.type !== 'other') {
        const category = dbInfo.type;
        this.log(`    Category: ${category}`);
        
        // Auto-add missing core capabilities for this category
        const targetCaps = this._getCategoryCapabilities(category);
        for (const cap of targetCaps) {
          if (!this.hasCapability(cap)) {
            this.log(`    Adding missing capability from DB: ${cap}`);
            await safeAddCapability(this, cap).catch(e => this.error(`Failed to add ${cap}:`, e.message));
          }
        }
      }

      // 3. Check for specific driver recommendation (Self-Healing / Auto-Migration)
      const currentDriver = this.driver?.id;if (dbInfo.driver && dbInfo.driver !== currentDriver && dbInfo.driver !== 'universal_zigbee') {
        this.log(` [SMART-ENRICH] Current driver (${currentDriver}) differs from recommended (${dbInfo.driver})`);
        
        // Trigger safe auto-migration if in universal driver
        if (currentDriver === 'universal_zigbee') {
           this.log('    Automated migration recommendation triggered...');
           await safeAutoMigrate(this, dbInfo.driver, 95, 'Database recommendation for specialized support').catch(e => {
             this.error('    Migration failed:', e.message);
      });
        }
      }

    } catch (err) {
      this.error(' [SMART-ENRICH] Initialization error:', err.message);
    }
  }

  /**
   * Map categories to core capabilities
   */
  _getCategoryCapabilities(category) {
    const map = {
      'presence': ['alarm_motion', 'measure_battery'],
      'motion': ['alarm_motion', 'measure_battery'],
      'switch': ['onoff'],
      'plug': ['onoff', 'measure_power', 'meter_power'],
      'light': ['onoff', 'dim'],
      'curtain': ['windowcoverings_state'],
      'climate': ['measure_temperature', 'measure_humidity'],
      'smoke': ['alarm_smoke', 'measure_battery'],
      'water': ['alarm_water', 'measure_battery'],
      'gas': ['alarm_gas'],
      'thermostat': ['target_temperature', 'measure_temperature']
    };
    return map[category] || [];
  }
};


