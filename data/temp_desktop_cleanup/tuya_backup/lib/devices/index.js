'use strict';

/**
 * Devices Index - v5.5.797
 * 
 * Centralized exports for all device base classes
 */

module.exports = {
  // Core Base Classes
  BaseHybridDevice: require('./BaseHybridDevice'),
  BaseTuyaDPDevice: require('./BaseTuyaDPDevice'),
  TuyaHybridDevice: require('./TuyaHybridDevice'),
  
  // Device Types
  ButtonDevice: require('./ButtonDevice'),
  PlugDevice: require('./PlugDevice'),
  SensorDevice: require('./SensorDevice'),
  SwitchDevice: require('./SwitchDevice'),
  WallTouchDevice: require('./WallTouchDevice'),

  // Hybrid Bases (EF00/ZCL compatible)
  HybridSensorBase: require('./HybridSensorBase'),
  HybridPlugBase: require('./HybridPlugBase'),
  HybridLightBase: require('./HybridLightBase'),
  HybridSwitchBase: require('./HybridSwitchBase'),
  HybridCoverBase: require('./HybridCoverBase'),
  HybridThermostatBase: require('./HybridThermostatBase'),
  
  // Device Type Detection
  DeviceTypeManager: require('./DeviceTypeManager')
};
