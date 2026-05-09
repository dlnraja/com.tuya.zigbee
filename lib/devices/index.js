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

  // Bases (EF00/ZCL compatible)
 SensorBase: require('./HybridSensorBase'),
 PlugBase: require('./HybridPlugBase'),
 LightBase: require('./HybridLightBase'),
 SwitchBase: require('./HybridSwitchBase'),
 CoverBase: require('./HybridCoverBase'),
 ThermostatBase: require('./HybridThermostatBase'),
  
  // Device Type Detection
  DeviceTypeManager: require('./DeviceTypeManager')
};
