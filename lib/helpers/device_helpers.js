/**
 * Device Helpers - Utility functions for device management
 * Based on: Mega-Prompt V2, SDK3 best practices, Zigbee2MQTT research
 *
 * Functions:
 * - safeAddCapability: Add capability with blacklist & error handling
 * - detectMultiGang: Detect multi-gang switches/outlets
 * - mapPresenceFallback: Fallback for presence sensors
 * - getDeviceOverride: Get device-specific overrides
 * - detectPowerSource: Detect power source from node descriptor
 * - isTuyaDP: Detect Tuya DP protocol devices
 * - ensureManufacturerCategoryCapabilities: Ensure manufacturer category capabilities
 */

'use strict';
const { ManufacturerCatalog } = require('./ManufacturerCatalog');

/**
 * Safe capability addition with blacklist and error handling
 * Prevents destructive capability changes
 *
 * @param {Object} device - Homey device instance
 * @param {string} capability - Capability ID to add
 * @param {Object} options - Optional capability options
 * @returns {Promise<boolean>} - Success status
 */
async function safeAddCapability(device, capability, options = {}) {
  try {
    // Blacklist: Never add these capabilities to these device types
    const blacklist = {
      'button': ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature'],
      'remote': ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature'],
      'sensor': ['onoff', 'dim'],
      'climate': ['onoff', 'dim']
    };

    // Get device class
    const deviceClass = device.getClass();

    // Check blacklist
    if (blacklist[deviceClass] && blacklist[deviceClass].includes(capability)) {
      device.log(`⚠️  Blacklist: ${capability} not allowed for ${deviceClass}`);
      return false;
    }

    // Check if capability already exists
    if (device.hasCapability(capability)) {
      device.log(`ℹ️  Capability ${capability} already exists`);
      return true;
    }

    // Add capability
    await device.addCapability(capability, options);
    device.log(`✅ Added capability: ${capability}`);
    return true;

  } catch (err) {
    device.error(`❌ Failed to add capability ${capability}:`, err.message);
    return false;
  }
}

/**
 * Detect multi-gang switches/outlets based on endpoints
 * Supports: switches, outlets, USB adapters
 *
 * @param {Object} deviceInfo - Device information from collectDeviceInfo()
 * @returns {Object} - { isMultiGang, gangCount, endpoints }
 */
function detectMultiGang(deviceInfo) {
  const result = {
    isMultiGang: false,
    gangCount: 1,
    endpoints: []
  };

  try {
    // Count endpoints with onOff cluster
    let onOffEndpoints = [];

    for (const [epId, epInfo] of Object.entries(deviceInfo.endpoints || {})) {
      const clusters = epInfo.clusterDetails || {};

      // Check if endpoint has onOff cluster as SERVER
      if (clusters.onOff && clusters.onOff.isServer) {
        onOffEndpoints.push(parseInt(epId));
      }
    }

    // Filter out special endpoints (242 = Green Power, 0 = coordinator)
    onOffEndpoints = onOffEndpoints.filter(ep => ep !== 0 && ep !== 242);

    if (onOffEndpoints.length > 1) {
      result.isMultiGang = true;
      result.gangCount = onOffEndpoints.length;
      result.endpoints = onOffEndpoints.sort();
    }

    return result;

  } catch (err) {
    return result;
  }
}

/**
 * Map presence sensor fallback capability
 * For Tuya DP presence sensors that don't expose standard clusters
 *
 * @param {Object} device - Homey device instance
 * @param {Object} deviceInfo - Device information
 * @returns {Promise<string|null>} - Fallback capability or null
 */
async function mapPresenceFallback(device, deviceInfo) {
  try {
    const modelId = deviceInfo.modelId || '';
    const manufacturer = deviceInfo.manufacturer || '';
    const driverName = device.driver?.id || '';

    // Tuya DP presence sensors
    if (modelId === 'TS0601' && manufacturer.startsWith('_TZE200')) {
      // Check driver name for presence keywords
      if (driverName.includes('presence') || driverName.includes('radar')) {
        device.log('🎯 Presence sensor detected (Tuya DP) - adding fallback');

        // Add alarm_motion as fallback
        await safeAddCapability(device, 'alarm_motion');

        // Also ensure battery capability
        await safeAddCapability(device, 'measure_battery');

        return 'alarm_motion';
      }
    }

    return null;

  } catch (err) {
    device.error('❌ mapPresenceFallback error:', err.message);
    return null;
  }
}

/**
 * Get device-specific override configuration
 * Based on modelId and manufacturer
 *
 * @param {string} modelId - Device model ID
 * @param {string} manufacturer - Device manufacturer name
 * @returns {Object|null} - Override config or null
 */
function getDeviceOverride(modelId, manufacturer) {
  // Device overrides database
  const overrides = {
    // Node 1: TS0002 USB Adapter (NOT a switch!)
    'TS0002_TZ3000_h1ipgkwn': {
      modelId: 'TS0002',
      manufacturer: '_TZ3000_h1ipgkwn',
      deviceType: 'usb_outlet',
      subType: '2gang',
      powerSource: 'mains',
      capabilities: ['onoff.l1', 'onoff.l2'],
      icon: 'usb_outlet',
      name: 'USB Power Adapter 2-Channel',
      description: 'USB adapter with 2 controllable ports',
      preventAdaptation: true,
      recommendedDriver: 'usb_outlet_advanced'
    },

    // GENERIC: All TS0002 _TZ3000* USB adapters
    'TS0002_TZ3000': {
      modelId: 'TS0002',
      manufacturerPattern: '_TZ3000',
      deviceType: 'usb_outlet',
      subType: '2gang',
      powerSource: 'mains',
      capabilities: ['onoff.l1', 'onoff.l2'],
      icon: 'usb_outlet',
      name: 'USB Power Adapter 2-Channel',
      description: 'USB adapter with 2 controllable ports (generic)',
      preventAdaptation: false, // Allow adaptation but guide to correct driver
      recommendedDriver: 'usb_outlet_advanced'
    },

    // Node 2: TS0601 Presence Sensor (specific manufacturer)
    'TS0601_TZE200_rhgsbacq': {
      modelId: 'TS0601',
      manufacturer: '_TZE200_rhgsbacq',
      deviceType: 'sensor',
      subType: 'presence',
      powerSource: 'battery',
      capabilities: ['alarm_motion', 'measure_battery'],
      protocol: 'tuya_dp',
      fallbackCapability: 'alarm_motion',
      preventAdaptation: true,
      recommendedDriver: 'presence_sensor_radar'
    },

    // GENERIC: All TS0601 _TZE200* presence sensors (PIR 3-in-1, mmWave, etc.)
    'TS0601_TZE200_presence': {
      modelId: 'TS0601',
      manufacturerPattern: '_TZE200',
      deviceType: 'sensor',
      subType: 'presence',
      powerSource: 'battery',
      capabilities: ['alarm_motion', 'measure_battery'],
      protocol: 'tuya_dp',
      fallbackCapability: 'alarm_motion',
      preventAdaptation: false,
      recommendedDriver: 'presence_sensor_radar'
    },

    // Node 3: TS0215A SOS Button
    'TS0215A_TZ3000_0dumfk2z': {
      modelId: 'TS0215A',
      manufacturer: '_TZ3000_0dumfk2z',
      deviceType: 'button',
      subType: 'emergency',
      powerSource: 'battery',
      capabilities: ['measure_battery', 'alarm_contact'],
      batteryType: 'CR2032'
    },

    // Node 4: TS0601 Climate Monitor (temp+humidity ONLY - NOT soil sensor!)
    // _TZE284_vvmbj46n = Regular climate monitor with LCD screen
    'TS0601_TZE284_vvmbj46n': {
      modelId: 'TS0601',
      manufacturer: '_TZE284_vvmbj46n',
      deviceType: 'sensor',
      subType: 'climate',
      powerSource: 'battery',
      capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
      protocol: 'tuya_dp',
      preventRemoveBattery: true,
      recommendedDriver: 'climate_sensor'  // CORRECT: climate_sensor, NOT soil_sensor
    },

    // Node 4b: TS0601 SOIL Sensor (soil temp + soil humidity + air temp + air humidity)
    // _TZE284_oitavov2 = Soil sensor with probe
    'TS0601_TZE284_oitavov2': {
      modelId: 'TS0601',
      manufacturer: '_TZE284_oitavov2',
      deviceType: 'sensor',
      subType: 'soil',
      powerSource: 'battery',
      capabilities: ['measure_temperature', 'measure_humidity', 'measure_temperature.soil', 'measure_humidity.soil', 'measure_battery'],
      protocol: 'tuya_dp',
      preventRemoveBattery: true,
      recommendedDriver: 'soil_sensor'  // CORRECT: soil_sensor for soil sensors
    },

    // GENERIC: All TS0601 _TZE284* climate sensors
    'TS0601_TZE284': {
      modelId: 'TS0601',
      manufacturerPattern: '_TZE284',
      deviceType: 'sensor',
      subType: 'climate',
      powerSource: 'battery',
      capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
      protocol: 'tuya_dp',
      preventRemoveBattery: true,
      recommendedDriver: 'soil_sensor'
    },

    // Node 5: TS0044 4-Button Controller
    'TS0044': {
      modelId: 'TS0044',
      deviceType: 'button',
      subType: 'scene_controller_4',
      powerSource: 'battery',
      capabilities: ['measure_battery'],
      endpoints: 4,
      batteryReportDelay: '24h'
    },

    // Node 6: TS0043 3-Button Controller
    'TS0043': {
      modelId: 'TS0043',
      deviceType: 'button',
      subType: 'scene_controller_3',
      powerSource: 'battery',
      capabilities: ['measure_battery'],
      endpoints: 3,
      batteryReportDelay: '24h'
    }
  };

  // Try exact match: modelId_manufacturer
  const key1 = `${modelId}_${manufacturer}`;
  if (overrides[key1]) {
    return overrides[key1];
  }

  // Try pattern matching (e.g., TS0601_TZE284 matches _TZE284*) - case-insensitive
  const patternMatches = [];
  // NULL CHECK: manufacturer can be null for some devices
  if (manufacturer) {
    const mfrLower = manufacturer.toLowerCase();
    const modelLower = (modelId || '').toLowerCase();
    for (const [key, config] of Object.entries(overrides)) {
      if (config.manufacturerPattern && mfrLower.startsWith(config.manufacturerPattern.toLowerCase())) {
        if (!config.modelId || config.modelId.toLowerCase() === modelLower) {
          patternMatches.push(config);
        }
      }
    }
  }

  // If multiple pattern matches, try to disambiguate
  if (patternMatches.length > 1) {
    // Prefer more specific patterns (longer prefix)
    patternMatches.sort((a, b) => {
      const lenA = a.manufacturerPattern?.length || 0;
      const lenB = b.manufacturerPattern?.length || 0;
      return lenB - lenA;
    });
  }

  // Return first (most specific) pattern match
  if (patternMatches.length > 0) {
    return patternMatches[0];
  }

  // Try modelId only
  if (overrides[modelId]) {
    return overrides[modelId];
  }

  return null;
}

/**
 * Detect power source from node descriptor
 * Most accurate method (hardware-based)
 *
 * @param {Object} nodeDescriptor - Node descriptor from device
 * @returns {string} - 'mains' or 'battery' or 'unknown'
 */
function detectPowerSource(nodeDescriptor) {
  if (!nodeDescriptor) return 'unknown';

  // receiverOnWhenIdle = true → always powered (mains)
  // receiverOnWhenIdle = false → sleepy device (battery)
  if (nodeDescriptor.receiverOnWhenIdle !== undefined) {
    return nodeDescriptor.receiverOnWhenIdle ? 'mains' : 'battery';
  }

  return 'unknown';
}

/**
 * Detect if device uses Tuya DP protocol - CENTRALIZED DETECTION
 *
 * CRITICAL: This function MUST be the single source of truth
 * Used by: Smart-Adapt, Battery-Reader, Cluster-Config, Data-Collector
 *
 * Tuya DP devices:
 * - Use cluster 0xEF00 (manuSpecificTuya) instead of standard Zigbee
 * - ModelID = TS0601 (always)
 * - Manufacturer starts with _TZE (Tuya Zigbee Endpoint)
 * - Some _TZ3000 devices also use DP (less common)
 *
 * @param {Object} deviceInfo - Device information (modelId, manufacturer, clusters, zclNode)
 * @param {Object} device - Optional: Homey device instance for logging
 * @returns {boolean} - True if Tuya DP device
 */
function isTuyaDP(deviceInfo, device = null) {
  try {
    const modelId = (deviceInfo.modelId || '').toUpperCase();
    const manufacturer = (deviceInfo.manufacturer || '').toUpperCase();

    // EXCLUSION LIST: Known NON-Tuya manufacturers
    // These use standard Zigbee, NOT Tuya DP protocol
    const nonTuyaManufacturers = [
      'HOBEIAN',      // ZG-204ZL motion sensor - uses IAS Zone
      'PHILIPS',
      'IKEA',
      'OSRAM',
      'LEDVANCE',
      'HEIMAN',
      'XIAOMI',
      'LUMI',         // Aqara
      'SONOFF',
      'EWELINK',
      'GLEDOPTO',
      'INNR',
      'SENGLED',
      'CENTRALITE',
      'SMARTTHINGS',
      'SAMJIN',
    ];

    // If manufacturer is in exclusion list, NOT Tuya DP
    if (nonTuyaManufacturers.some(m => manufacturer.includes(m))) {
      device?.log?.(`[isTuyaDP] ❌ ${manufacturer} is in exclusion list → Standard Zigbee`);
      return false;
    }

    // RULE 1: TS0601 is ALWAYS Tuya DP (100% certainty)
    if (modelId === 'TS0601') {
      device?.log?.('[isTuyaDP] ✅ TS0601 detected → Tuya DP device');
      return true;
    }

    // RULE 2: _TZE manufacturer prefix (Tuya Zigbee Endpoint devices)
    if (manufacturer.startsWith('_TZE')) {
      device?.log?.(`[isTuyaDP] ✅ ${manufacturer} detected → Tuya DP device`);
      return true;
    }

    // RULE 3: Check for cluster 0xEF00 presence - ONLY if manufacturer is Tuya-like
    const isTuyaPrefix = manufacturer.startsWith('_TZ');
    if (deviceInfo.zclNode && isTuyaPrefix) {
      try {
        const endpoints = deviceInfo.zclNode.endpoints || {};
        for (const ep of Object.values(endpoints)) {
          if (ep.clusters?.[0xEF00] || ep.clusters?.[61184]) {
            device?.log?.('[isTuyaDP] ✅ Cluster 0xEF00 found + Tuya prefix → Tuya DP device');
            return true;
          }
        }
      } catch (e) {
        // Ignore cluster check errors
      }
    }

    device?.log?.(`[isTuyaDP] ❌ ${modelId}/${manufacturer} → Standard Zigbee`);
    return false;

  } catch (err) {
    device?.error?.('[isTuyaDP] Detection error:', err.message);
    return false;
  }
}

/**
 * Preserve battery capability for battery devices
 * NEVER remove measure_battery from battery-powered devices
 *
 * @param {Object} device - Homey device instance
 * @param {string} powerSource - Power source ('mains' or 'battery')
 * @returns {Promise<boolean>} - Success status
 */
async function preserveBatteryCapability(device, powerSource) {
  try {
    // If battery powered and doesn't have measure_battery
    if (powerSource === 'battery' && !device.hasCapability('measure_battery')) {
      device.log('🔋 Battery device detected - adding measure_battery');
      await safeAddCapability(device, 'measure_battery');
      return true;
    }

    // If battery powered and has measure_battery, PROTECT IT
    if (powerSource === 'battery' && device.hasCapability('measure_battery')) {
      device.log('🛡️  Battery capability protected for battery device');
      return true;
    }

    return false;

  } catch (err) {
    device.error('❌ preserveBatteryCapability error:', err.message);
    return false;
  }
}

/**
 * Detect recommended driver based on device info and override
 * If current driver doesn't match, prepare migration
 *
 * @param {Object} device - Homey device instance
 * @param {Object} deviceInfo - Device information from collectDeviceInfo()
 * @returns {Object} - { shouldMigrate, currentDriver, recommendedDriver, confidence }
 */
function detectRecommendedDriver(device, deviceInfo) {
  const result = {
    shouldMigrate: false,
    currentDriver: device.driver?.id || 'unknown',
    recommendedDriver: null,
    confidence: 0,
    reason: ''
  };

  try {
    // Check device override first
    const override = getDeviceOverride(deviceInfo.modelId, deviceInfo.manufacturer);

    if (override && override.recommendedDriver) {
      result.recommendedDriver = override.recommendedDriver;
      result.confidence = 1.0; // High confidence from override

      // Check if current driver matches
      if (result.currentDriver !== result.recommendedDriver) {
        result.shouldMigrate = true;
        result.reason = `Override specifies ${result.recommendedDriver} but current driver is ${result.currentDriver}`;
        device.log(`⚠️  MIGRATION NEEDED: ${result.currentDriver} → ${result.recommendedDriver}`);
      } else {
        result.reason = `Driver correct: ${result.currentDriver}`;
        device.log(`✅ Driver correct: ${result.currentDriver}`);
      }

      return result;
    }

    // No override or no recommended driver
    result.reason = 'No override or recommended driver specified';
    return result;

  } catch (err) {
    device.error('❌ detectRecommendedDriver error:', err.message);
    return result;
  }
}

/**
 * Auto-migrate device to recommended driver
 *
 * NEW in v4.9.315: Uses safe migration queue system
 * - Validates target driver exists
 * - Respects user preference
 * - Protects Tuya DP devices
 * - Queues migration instead of direct device.setDriver()
 *
 * @param {Object} device - Homey device instance
 * @param {string} targetDriverId - Target driver ID
 * @param {number} confidence - Confidence level (0-100)
 * @param {string} reason - Reason for migration
 * @returns {Promise<boolean>} - Success status
 */
async function autoMigrateDriver(device, targetDriverId, confidence = 100, reason = 'Auto-detected') {
  // Use new safe migration system
  const { safeAutoMigrate } = require('../utils/safe-auto-migrate');

  try {
    return await safeAutoMigrate(device, targetDriverId, confidence, reason);
  } catch (err) {
    device.error('[AUTO-MIGRATE] Error:', err.message);
    return false;
  }
}

/**
 * Ensure manufacturer category capabilities
 *
 * @param {Object} device - Homey device instance
 * @param {string} manufacturer - Device manufacturer name
 * @returns {Object|null} - { category, flows } or null
 */
async function ensureManufacturerCategoryCapabilities(device, manufacturer) {
  const category = ManufacturerCatalog.categorizeManufacturer(manufacturer);
  if (!category) {
    device?.log?.(`[CATEGORY] Manufacturer ${manufacturer} has no predefined category`);
    return null;
  }

  const capabilities = ManufacturerCatalog.getCategoryCapabilities(category);
  for (const capability of capabilities) {
    await safeAddCapability(device, capability).catch(() => { });
  }

  const flows = ManufacturerCatalog.getCategoryFlows(category);
  device?.log?.(`[CATEGORY] Applied ${category} capabilities (${capabilities.length}) and flows: ${flows.map(f => f.id).join(', ')}`);

  return { category, flows };
}

// Export all functions
module.exports = {
  safeAddCapability,
  detectMultiGang,
  mapPresenceFallback,
  getDeviceOverride,
  detectPowerSource,
  isTuyaDP,
  preserveBatteryCapability,
  detectRecommendedDriver,
  autoMigrateDriver,
  ensureManufacturerCategoryCapabilities
};
