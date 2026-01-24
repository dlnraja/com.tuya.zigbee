'use strict';

const fs = require('fs');
const path = require('path');

/**
 * DriverMappingLoader - Centralized driver mapping database loader
 * 
 * Loads driver-mapping-database.json and provides query methods
 * for device detection, DP mapping, and driver selection.
 * 
 * @class DriverMappingLoader
 */
class DriverMappingLoader {
  constructor() {
    this.database = null;
    this.loaded = false;
    this.loadDatabase();
  }

  /**
   * Load driver-mapping-database.json
   */
  loadDatabase() {
    try {
      const dbPath = path.join(__dirname, '../../driver-mapping-database.json');
      
      if (!fs.existsSync(dbPath)) {
        // Optional file - silently use empty database if not found
        this.database = { devices: {}, parsers: {}, driver_rules: {} };
        return;
      }

      const rawData = fs.readFileSync(dbPath, 'utf8');
      this.database = JSON.parse(rawData);
      this.loaded = true;
      
      console.log('[DRIVER-MAPPING] ✅ Database loaded successfully');
      console.log(`[DRIVER-MAPPING]   Version: ${this.database.version}`);
      console.log(`[DRIVER-MAPPING]   Models: ${Object.keys(this.database.devices).length}`);
      
    } catch (err) {
      console.error('[DRIVER-MAPPING] ❌ Failed to load database:', err.message);
      this.database = { devices: {}, parsers: {}, driver_rules: {} };
    }
  }

  /**
   * Get device information by model and manufacturer
   * @param {string} model - Device model (e.g., 'TS0601')
   * @param {string} manufacturer - Manufacturer ID (e.g., '_TZE284_vvmbj46n')
   * @returns {object|null} Device info or null if not found
   */
  getDeviceInfo(model, manufacturer) {
    if (!this.loaded || !this.database.devices[model]) {
      return null;
    }

    const modelData = this.database.devices[model];
    const manufacturerData = modelData.manufacturers?.[manufacturer];

    if (!manufacturerData) {
      return null;
    }

    return {
      model,
      manufacturer,
      name: manufacturerData.name,
      driver: manufacturerData.driver,
      capabilities: manufacturerData.capabilities || [],
      dps: manufacturerData.dps || {},
      endpoints: manufacturerData.endpoints || {},
      battery: manufacturerData.battery || null,
      polling: manufacturerData.polling || { initial: '3s', interval: '5m' },
      type: modelData.type,
      cluster: modelData.cluster || null,
      description: modelData.description
    };
  }

  /**
   * Get all manufacturers for a specific model
   * @param {string} model - Device model
   * @returns {array} List of manufacturer IDs
   */
  getManufacturersForModel(model) {
    if (!this.loaded || !this.database.devices[model]) {
      return [];
    }

    const manufacturers = this.database.devices[model].manufacturers || {};
    return Object.keys(manufacturers);
  }

  /**
   * Get recommended driver for a device
   * @param {string} model - Device model
   * @param {string} manufacturer - Manufacturer ID
   * @returns {string|null} Driver ID or null
   */
  getRecommendedDriver(model, manufacturer) {
    const deviceInfo = this.getDeviceInfo(model, manufacturer);
    return deviceInfo ? deviceInfo.driver : null;
  }

  /**
   * Get DP mappings for a Tuya device
   * @param {string} model - Device model (e.g., 'TS0601')
   * @param {string} manufacturer - Manufacturer ID
   * @returns {object} DP mappings { dpId: { capability, parser, unit } }
   */
  getDPMappings(model, manufacturer) {
    const deviceInfo = this.getDeviceInfo(model, manufacturer);
    return deviceInfo ? deviceInfo.dps : {};
  }

  /**
   * Parse a DP value using the appropriate parser
   * @param {string} parserName - Parser name (e.g., 'divide_by_10')
   * @param {any} value - Raw value to parse
   * @returns {any} Parsed value
   */
  parseValue(parserName, value) {
    const parser = this.database.parsers?.[parserName];
    
    if (!parser) {
      console.warn(`[DRIVER-MAPPING] Unknown parser: ${parserName}, returning raw value`);
      return value;
    }

    try {
      // Execute parser function
      // eslint-disable-next-line no-eval
      const parserFunc = eval(`(${parser.function})`);
      return parserFunc(value);
    } catch (err) {
      console.error(`[DRIVER-MAPPING] Parser ${parserName} failed:`, err.message);
      return value;
    }
  }

  /**
   * Get driver rules (deprecated drivers, forbidden capabilities, etc.)
   * @param {string} driverType - Driver type (e.g., 'usb_outlet')
   * @returns {object|null} Driver rules or null
   */
  getDriverRules(driverType) {
    return this.database.driver_rules?.[driverType] || null;
  }

  /**
   * Check if a driver is deprecated and get replacement
   * @param {string} driverType - Driver type
   * @param {string} subType - Sub-type (e.g., '2gang')
   * @returns {object} { deprecated: bool, mapTo: string|null, reason: string|null }
   */
  checkDeprecated(driverType, subType = null) {
    const rules = this.getDriverRules(driverType);
    
    if (!rules || !rules.deprecated) {
      return { deprecated: false, mapTo: null, reason: null };
    }

    let mapTo = null;
    if (rules.mapTo) {
      if (subType && rules.mapTo[subType]) {
        mapTo = rules.mapTo[subType];
      } else if (typeof rules.mapTo === 'string') {
        mapTo = rules.mapTo;
      }
    }

    return {
      deprecated: true,
      mapTo,
      reason: rules.reason || 'Driver deprecated'
    };
  }

  /**
   * Get detection priority order
   * @returns {array} Ordered list of device types by priority
   */
  getDetectionPriority() {
    return this.database.detection_priority?.order || [];
  }

  /**
   * Get detection rule for a device type
   * @param {string} deviceType - Device type
   * @returns {object|null} Detection rule or null
   */
  getDetectionRule(deviceType) {
    return this.database.detection_priority?.rules?.[deviceType] || null;
  }

  /**
   * Get common issue information
   * @param {string} issueKey - Issue key (e.g., 'battery_not_showing')
   * @returns {object|null} Issue info or null
   */
  getCommonIssue(issueKey) {
    return this.database.common_issues?.[issueKey] || null;
  }

  /**
   * Find all devices affected by a common issue
   * @param {string} issueKey - Issue key
   * @returns {array} List of affected devices
   */
  getAffectedDevices(issueKey) {
    const issue = this.getCommonIssue(issueKey);
    return issue ? issue.devices : [];
  }

  /**
   * Get all supported models
   * @returns {array} List of model IDs
   */
  getAllModels() {
    return this.loaded ? Object.keys(this.database.devices) : [];
  }

  /**
   * Get database version
   * @returns {string} Version string
   */
  getVersion() {
    return this.database?.version || 'unknown';
  }

  /**
   * Get database last updated date
   * @returns {string} Date string
   */
  getLastUpdated() {
    return this.database?.lastUpdated || 'unknown';
  }

  /**
   * Search devices by name
   * @param {string} query - Search query
   * @returns {array} List of matching devices
   */
  searchDevices(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();

    if (!this.loaded) return results;

    for (const [model, modelData] of Object.entries(this.database.devices)) {
      const manufacturers = modelData.manufacturers || {};
      
      for (const [manufacturer, device] of Object.entries(manufacturers)) {
        const name = (device.name || '').toLowerCase();
        const desc = (modelData.description || '').toLowerCase();
        
        if (name.includes(lowerQuery) || desc.includes(lowerQuery) || 
            model.toLowerCase().includes(lowerQuery) ||
            manufacturer.toLowerCase().includes(lowerQuery)) {
          results.push({
            model,
            manufacturer,
            name: device.name,
            driver: device.driver,
            description: modelData.description
          });
        }
      }
    }

    return results;
  }

  /**
   * Get statistics about the database
   * @returns {object} Database statistics
   */
  getStats() {
    if (!this.loaded) {
      return { loaded: false };
    }

    const models = Object.keys(this.database.devices);
    let totalManufacturers = 0;
    let tuyaDpDevices = 0;
    let standardZigbeeDevices = 0;

    for (const [model, modelData] of Object.entries(this.database.devices)) {
      const manufacturerCount = Object.keys(modelData.manufacturers || {}).length;
      totalManufacturers += manufacturerCount;

      if (modelData.type === 'tuya_dp') {
        tuyaDpDevices += manufacturerCount;
      } else {
        standardZigbeeDevices += manufacturerCount;
      }
    }

    return {
      loaded: true,
      version: this.database.version,
      lastUpdated: this.database.lastUpdated,
      totalModels: models.length,
      totalManufacturers,
      tuyaDpDevices,
      standardZigbeeDevices,
      parsers: Object.keys(this.database.parsers || {}).length,
      driverRules: Object.keys(this.database.driver_rules || {}).length,
      commonIssues: Object.keys(this.database.common_issues || {}).length
    };
  }
}

// Singleton instance
let instance = null;

/**
 * Get singleton instance of DriverMappingLoader
 * @returns {DriverMappingLoader} Singleton instance
 */
function getInstance() {
  if (!instance) {
    instance = new DriverMappingLoader();
  }
  return instance;
}

module.exports = {
  DriverMappingLoader,
  getInstance,
  
  // Convenience methods
  getDeviceInfo: (model, manufacturer) => getInstance().getDeviceInfo(model, manufacturer),
  getDPMappings: (model, manufacturer) => getInstance().getDPMappings(model, manufacturer),
  getRecommendedDriver: (model, manufacturer) => getInstance().getRecommendedDriver(model, manufacturer),
  parseValue: (parserName, value) => getInstance().parseValue(parserName, value),
  checkDeprecated: (driverType, subType) => getInstance().checkDeprecated(driverType, subType),
  searchDevices: (query) => getInstance().searchDevices(query),
  getStats: () => getInstance().getStats()
};
