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
 */

'use strict';

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
      recommendedDriver: 'usb_outlet'
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
      recommendedDriver: 'usb_outlet'
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
    
    // Node 4: TS0601 Climate Monitor (specific manufacturer)
    'TS0601_TZE284_vvmbj46n': {
      modelId: 'TS0601',
      manufacturer: '_TZE284_vvmbj46n',
      deviceType: 'sensor',
      subType: 'climate',
      powerSource: 'battery',
      capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
      protocol: 'tuya_dp',
      preventRemoveBattery: true,
      recommendedDriver: 'climate_sensor_soil'
    },
    
    // Node 4b: TS0601 Climate Monitor (alternate manufacturer)
    'TS0601_TZE284_oitavov2': {
      modelId: 'TS0601',
      manufacturer: '_TZE284_oitavov2',
      deviceType: 'sensor',
      subType: 'climate',
      powerSource: 'battery',
      capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
      protocol: 'tuya_dp',
      preventRemoveBattery: true,
      recommendedDriver: 'climate_sensor_soil'
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
      recommendedDriver: 'climate_sensor_soil'
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
  
  // Try pattern matching (e.g., TS0601_TZE284 matches _TZE284*)
  const patternMatches = [];
  // NULL CHECK: manufacturer can be null for some devices
  if (manufacturer) {
    for (const [key, config] of Object.entries(overrides)) {
      if (config.manufacturerPattern && manufacturer.startsWith(config.manufacturerPattern)) {
        if (!config.modelId || config.modelId === modelId) {
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
 * Detect if device uses Tuya DP protocol
 * Tuya DP devices have cluster 0xEF00 (invisible in standard enumeration)
 * 
 * @param {Object} deviceInfo - Device information from collectDeviceInfo()
 * @returns {boolean} - True if Tuya DP device
 */
function isTuyaDP(deviceInfo) {
  try {
    const modelId = deviceInfo.modelId || '';
    const manufacturer = deviceInfo.manufacturer || '';
    const clusters = deviceInfo.clusters || {};
    
    // TS0601 is ALWAYS Tuya DP
    if (modelId === 'TS0601') {
      return true;
    }
    
    // Check for Tuya manufacturer prefixes
    if (manufacturer.startsWith('_TZE') || manufacturer.startsWith('_TZ3000')) {
      // Check if has manuSpecificTuya cluster
      if (clusters.manuSpecificTuya || clusters['0xEF00']) {
        return true;
      }
    }
    
    return false;
    
  } catch (err) {
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
 * CRITICAL: This will attempt to change the device's driver
 * 
 * @param {Object} device - Homey device instance
 * @param {string} targetDriverId - Target driver ID
 * @returns {Promise<boolean>} - Success status
 */
async function autoMigrateDriver(device, targetDriverId) {
  device.log(`🔄 [AUTO-MIGRATE] Attempting driver migration to: ${targetDriverId}`);
  device.log(`⚠️  [AUTO-MIGRATE] DISABLED - device.setDriver() not available in SDK3`);
  device.log(`ℹ️  Driver migration must be done manually by user:`);
  device.log(`    1. Remove device from Homey`);
  device.log(`    2. Re-pair device`);
  device.log(`    3. Select correct driver: ${targetDriverId}`);
  return false;
  
  /* DISABLED - SDK3 does not support device.setDriver()
   * This was an SDK2 function that no longer exists
   * Migration must be done manually by user
   * 
   * Previous implementation kept for reference:
   * 
  if (!targetDriverId) {
    device.error('❌ [AUTO-MIGRATE] No target driver specified');
    return false;
  }
  
  try {
    // Check if target driver exists
    const drivers = device.homey.drivers.getDrivers();
    const targetDriver = drivers[targetDriverId];
    
    if (!targetDriver) {
      device.error(`❌ [AUTO-MIGRATE] Target driver '${targetDriverId}' does not exist`);
      return false;
    }
    
    device.log(`✅ [AUTO-MIGRATE] Target driver found: ${targetDriverId}`);
    device.log('ℹ️  Migration will preserve device data and capabilities');
    
    // Log current state before migration
    const deviceData = device.getData();
    const deviceSettings = device.getSettings();
    const deviceCapabilities = device.getCapabilities();
    
    device.log(`📦 Current device data: ${JSON.stringify(deviceData)}`);
    device.log(`⚙️  Current settings: ${JSON.stringify(deviceSettings, null, 2)}`);
    device.log(`🔧 Current capabilities: ${JSON.stringify(deviceCapabilities)}`);
    
    // SDK2 ONLY - Not available in SDK3
    await device.setDriver(targetDriverId);
    device.log(`✅ MIGRATION SUCCESS: Device now using ${targetDriverId}`);
    return true;
  } catch (err) {
    device.error(`❌ [AUTO-MIGRATE] Migration error: ${err.message}`);
    return false;
  }
  */
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
  autoMigrateDriver
};
