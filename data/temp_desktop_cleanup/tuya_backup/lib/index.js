'use strict';

/**
 * Universal Tuya Zigbee - Main Library Index
 * v5.5.797: Complete audit and reorganization
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
  
  // Clusters
  Clusters: require('./clusters'),
  
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
  
  // Zigbee Utilities (full module)
  Zigbee: require('./zigbee'),
  
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
  },
  
  // v5.5.797: Additional utilities
  IASAlarmFallback: require('./IASAlarmFallback'),
  ProtocolAutoOptimizer: require('./ProtocolAutoOptimizer'),
  UniversalDataHandler: require('./UniversalDataHandler'),
  ZigbeeClusterManager: require('./ZigbeeClusterManager')
};
