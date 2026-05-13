'use strict';

/**
 * Devices Index - v5.5.797
 * 
 * Centralized exports for all device base classes
 */

module.exports = {
  // Core Base Classes
  BaseUnifiedDevice: require('./BaseUnifiedDevice'),
  BaseTuyaDPDevice: require('./BaseTuyaDPDevice'),
  TuyaUnifiedDevice: require('./TuyaUnifiedDevice'),
  
  // Device Types
  ButtonDevice: require('./ButtonDevice'),
  PlugDevice: require('./PlugDevice'),
  SensorDevice: require('./SensorDevice'),
  SwitchDevice: require('./SwitchDevice'),
  WallTouchDevice: require('./WallTouchDevice'),

  // Hybrid Bases (EF00/ZCL compatible)
  UnifiedSensorBase: require('./UnifiedSensorBase'),
  UnifiedPlugBase: require('./UnifiedPlugBase'),
  UnifiedLightBase: require('./UnifiedLightBase'),
  UnifiedSwitchBase: require('./UnifiedSwitchBase'),
  UnifiedCoverBase: require('./UnifiedCoverBase'),
  UnifiedThermostatBase: require('./UnifiedThermostatBase'),
  
  // Device Type Detection
  DeviceTypeManager: require('./DeviceTypeManager')
};
