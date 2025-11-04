'use strict';

/**
 * Universal Tuya Zigbee - Main Library Index
 * 
 * Provides organized access to all library modules
 * 
 * Usage:
 *   const { Battery, Security, Tuya, Flow } = require('./lib');
 *   const batterySystem = new Battery.BatterySystem(device);
 */

module.exports = {
  // Battery Management
  Battery: require('./battery'),
  
  // Security (IAS Zone, Locks)
  Security: require('./security'),
  
  // Tuya Protocol Integration
  Tuya: require('./tuya'),
  
  // Flow Cards
  Flow: require('./flow'),
  
  // Device Types
  Devices: require('./devices'),
  
  // System Managers
  Managers: require('./managers'),
  
  // Protocol & Detection
  Protocol: {
    IntelligentProtocolRouter: require('./protocol/IntelligentProtocolRouter'),
    HybridProtocolManager: require('./protocol/HybridProtocolManager'),
    HardwareDetectionShim: require('./protocol/HardwareDetectionShim')
  },
  
  // Utilities
  Utils: require('./utils'),
  
  // Helpers
  Helpers: {
    PairingHelper: require('./helpers/PairingHelper'),
    RobustInitializer: require('./helpers/RobustInitializer'),
    FallbackSystem: require('./helpers/FallbackSystem')
  },
  
  // Detectors
  Detectors: {
    BseedDetector: require('./detectors/BseedDetector'),
    EnergyCapabilityDetector: require('./detectors/EnergyCapabilityDetector'),
    MotionAwarePresenceDetector: require('./detectors/MotionAwarePresenceDetector')
  },
  
  // Zigbee Utilities
  Zigbee: {
    Debug: require('./zigbee/ZigbeeDebug'),
    Timeout: require('./zigbee/ZigbeeTimeout'),
    ZigpyIntegration: require('./zigbee/ZigpyIntegration'),
    HealthMonitor: require('./zigbee/ZigbeeHealthMonitor'),
    ErrorCodes: require('./zigbee/ZigbeeErrorCodes'),
    CommandManager: require('./zigbee/ZigbeeCommandManager')
  },
  
  // OTA Firmware Updates
  OTA: require('./ota'),
  
  // Xiaomi/Lumi Support
  Xiaomi: require('./xiaomi'),
  
  // RGB Lighting Effects
  Lighting: require('./lighting'),
  
  // Universal Pairing
  Pairing: require('./pairing'),
  
  // Device Quirks
  Quirks: {
    Database: require('./quirks/QuirksDatabase')
  }
};
