'use strict';

/**
 * ZigbeeHelpers - Utility functions for robust Zigbee device handling
 * Provides fallbacks and auto-converters for SDK v3 compatibility
 * 
 * v5.5.797: Enhanced IEEE address handling via IEEEAddressManager
 */

const { CLUSTER } = require('zigbee-clusters');
const IEEEAddressManager = require('../managers/IEEEAddressManager');

class ZigbeeHelpers {
  
  /**
   * Get IEEE Address with multiple fallback methods
   * v5.5.797: Delegates to centralized IEEEAddressManager
   * 
   * @param {Homey.Device} device - Device instance
   * @returns {Promise<string|null>} IEEE address or null
   */
  static async getIeeeAddress(device) {
    const ieeeManager = new IEEEAddressManager(device);
    return ieeeManager.getDeviceIeeeAddress();
  }
  
  /**
   * Get Coordinator (Homey) IEEE Address
   * v5.5.797: New method via centralized IEEEAddressManager
   * 
   * @param {Homey.Device} device - Device instance
   * @returns {Promise<string|null>} Coordinator IEEE address or null
   */
  static async getCoordinatorIeeeAddress(device) {
    const ieeeManager = new IEEEAddressManager(device);
    return ieeeManager.getCoordinatorIeeeAddress();
  }
  
  /**
   * Get IEEE Address Manager instance for advanced operations
   * v5.5.797: Provides access to full IEEEAddressManager API
   * 
   * @param {Homey.Device} device - Device instance
   * @returns {IEEEAddressManager} Manager instance
   */
  static getIeeeAddressManager(device) {
    return new IEEEAddressManager(device);
  }
  
  /**
   * Convert cluster specification to proper format
   * Handles: numeric ID, string name, CLUSTER object
   * Auto-converts to the format expected by homey-zigbeedriver
   * 
   * @param {number|string|Object} clusterSpec - Cluster specification
   * @returns {number|Object} Proper cluster specification
   */
  static normalizeClusterSpec(clusterSpec) {
    // Already a number (ID) - perfect
    if (typeof clusterSpec === 'number') {
      return clusterSpec;
    }
    
    // CLUSTER object from zigbee-clusters - perfect
    if (clusterSpec && typeof clusterSpec === 'object' && clusterSpec.ID !== undefined) {
      return clusterSpec;
    }
    
    // String name - try to convert to CLUSTER or numeric ID
    if (typeof clusterSpec === 'string') {
      // Map of common string names to numeric IDs
      const clusterMap = {
        // Standard Zigbee clusters
        'basic': 0,
        'genBasic': 0,
        'powerConfiguration': 1,
        'genPowerCfg': 1,
        'identify': 3,
        'genIdentify': 3,
        'groups': 4,
        'genGroups': 4,
        'scenes': 5,
        'genScenes': 5,
        'onOff': 6,
        'genOnOff': 6,
        'levelControl': 8,
        'genLevelCtrl': 8,
        'alarms': 9,
        'genAlarms': 9,
        'time': 10,
        'genTime': 10,
        'analogInput': 12,
        'genAnalogInput': 12,
        'ota': 25,
        'genOta': 25,
        'pollControl': 32,
        'genPollCtrl': 32,
        
        // Measurement & Sensing
        'temperatureMeasurement': 1026,
        'msTemperatureMeasurement': 1026,
        'pressureMeasurement': 1027,
        'msPressureMeasurement': 1027,
        'flowMeasurement': 1028,
        'msFlowMeasurement': 1028,
        'relativeHumidity': 1029,
        'msRelativeHumidity': 1029,
        'occupancySensing': 1030,
        'msOccupancySensing': 1030,
        'illuminanceMeasurement': 1024,
        'msIlluminanceMeasurement': 1024,
        
        // Lighting
        'colorControl': 768,
        'lightingColorCtrl': 768,
        
        // HVAC
        'thermostat': 513,
        'hvacThermostat': 513,
        'fanControl': 514,
        'hvacFanCtrl': 514,
        
        // Closures
        'windowCovering': 258,
        'closuresWindowCovering': 258,
        
        // Security & Safety
        'iasZone': 1280,
        'ssIasZone': 1280,
        'iasAce': 1281,
        'ssIasAce': 1281,
        'iasWd': 1282,
        'ssIasWd': 1282,
        
        // Smart Energy
        'metering': 1794,
        'seMetering': 1794,
        'electricalMeasurement': 2820,
        'haElectricalMeasurement': 2820,
        
        // Tuya specific
        'manuSpecificTuya': 0xEF00,
        'tuya': 0xEF00,
      };
      
      const normalized = clusterSpec.toLowerCase();
      if (clusterMap[normalized] !== undefined) {
        return clusterMap[normalized];
      }
      
      // Try to parse as hex (0xEF00 format)
      if (normalized.startsWith('0x')) {
        const parsed = parseInt(normalized, 16);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
      
      // Try to get from CLUSTER object
      const clusterKey = Object.keys(CLUSTER).find(key => 
        key.toLowerCase() === normalized || 
        CLUSTER[key]?.name?.toLowerCase() === normalized
      );
      
      if (clusterKey && CLUSTER[clusterKey]) {
        return CLUSTER[clusterKey];
      }
    }
    
    // If all else fails, return as-is and let homey-zigbeedriver handle/error
    console.warn('[ZigbeeHelpers] Could not normalize cluster spec:', clusterSpec);
    return clusterSpec;
  }
  
  /**
   * Wrap any value in a Promise to safely use .catch()
   * Prevents "Cannot read properties of null (reading 'catch')" errors
   * 
   * @param {*} valueOrPromise - Any value or Promise
   * @returns {Promise} Always returns a Promise
   */
  static safePromise(valueOrPromise) {
    return Promise.resolve(valueOrPromise);
  }
  
  /**
   * DEPRECATED: This helper is no longer used
   * 
   * REASON: Caused infinite recursion loop with BaseHybridDevice override
   * 
   * SOLUTION: Drivers now call super.configureAttributeReporting() directly
   * with pre-normalized cluster IDs (use normalizeClusterSpec() before calling)
   * 
   * @deprecated Use direct super.configureAttributeReporting() in drivers
   */
  static async configureAttributeReporting(device, configs) {
    // This method is deprecated but kept for backward compatibility
    // Just normalize and return - don't call anything to avoid loops
    device.log('[WARN] ZigbeeHelpers.configureAttributeReporting is deprecated');
    return false;
  }
  
  /**
   * Safe attribute reporting configuration with auto-conversion
   * Handles cluster specification normalization and error handling
   * 
   * @param {Homey.Device} device - Device instance
   * @param {Array} configs - Array of reporting configurations
   * @returns {Promise<boolean>} Success status
   */
  static async configureAttributeReportingLegacy(device, configs) {
    if (!device.configureAttributeReporting) {
      device.log('[WARN]  configureAttributeReporting not available');
      return false;
    }
    
    try {
      // Normalize all cluster specifications
      const normalizedConfigs = configs.map(config => {
        const normalized = { ...config };
        
        if (normalized.cluster !== undefined) {
          normalized.cluster = this.normalizeClusterSpec(normalized.cluster);
        }
        
        return normalized;
      });
      
      await device.configureAttributeReporting(normalizedConfigs);
      device.log('[OK] Attribute reporting configured:', normalizedConfigs.length, 'configs');
      return true;
      
    } catch (err) {
      device.log('[WARN]  Attribute reporting configuration failed (non-critical):', err.message);
      return false;
    }
  }
  
  /**
   * Safe cluster listener setup with auto-conversion
   * Ensures cluster exists and specification is correct
   * 
   * @param {Object} endpoint - ZCL endpoint
   * @param {number|string|Object} clusterSpec - Cluster specification  
   * @param {string} attribute - Attribute name
   * @param {Function} callback - Listener callback
   * @param {Homey.Device} device - Device instance (for logging)
   * @returns {boolean} Success status
   */
  static setupClusterListener(endpoint, clusterSpec, attribute, callback, device) {
    try {
      const normalizedCluster = this.normalizeClusterSpec(clusterSpec);
      
      // Try to get cluster by ID
      let cluster = null;
      if (typeof normalizedCluster === 'number') {
        cluster = endpoint.clusters?.[normalizedCluster];
      } else if (normalizedCluster && normalizedCluster.ID !== undefined) {
        cluster = endpoint.clusters?.[normalizedCluster.ID];
      }
      
      // Fallback: try common cluster name patterns
      if (!cluster && typeof clusterSpec === 'string') {
        cluster = endpoint.clusters?.[clusterSpec] || 
                  endpoint.clusters?.[clusterSpec.toLowerCase()];
      }
      
      if (!cluster) {
        device?.log('[WARN]  Cluster not found:', clusterSpec);
        return false;
      }
      
      // Setup listener
      cluster.on(`attr.${attribute}`, callback);
      device?.log('[OK] Cluster listener configured:', clusterSpec, attribute);
      return true;
      
    } catch (err) {
      device?.error('Cluster listener setup failed:', err.message);
      return false;
    }
  }
  
  /**
   * Get cluster from endpoint with multiple fallback methods
   * 
   * @param {Object} endpoint - ZCL endpoint
   * @param {number|string|Object} clusterSpec - Cluster specification
   * @returns {Object|null} Cluster object or null
   */
  static getCluster(endpoint, clusterSpec) {
    if (!endpoint?.clusters) {
      return null;
    }
    
    const normalized = this.normalizeClusterSpec(clusterSpec);
    
    // Try numeric ID
    if (typeof normalized === 'number') {
      return endpoint.clusters[normalized] || null;
    }
    
    // Try CLUSTER object
    if (normalized && normalized.ID !== undefined) {
      return endpoint.clusters[normalized.ID] || null;
    }
    
    // Try string name (original spec)
    if (typeof clusterSpec === 'string') {
      return endpoint.clusters[clusterSpec] || 
             endpoint.clusters[clusterSpec.toLowerCase()] || 
             null;
    }
    
    return null;
  }
}

module.exports = ZigbeeHelpers;
