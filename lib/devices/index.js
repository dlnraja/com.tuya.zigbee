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

  // Bases (EF00/ZCL compatible)
 SensorBase: require('./UnifiedSensorBase'),
 PlugBase: require('./UnifiedPlugBase'),
 LightBase: require('./UnifiedLightBase'),
 SwitchBase: require('./UnifiedSwitchBase'),
 CoverBase: require('./UnifiedCoverBase'),
 ThermostatBase: require('./UnifiedThermostatBase'),
  
  // Device Type Detection
  DeviceTypeManager: require('./DeviceTypeManager'),

  // v9.1.0: Specialized Device Feature Modules
  CameraPTZController: require('./CameraPTZController'),
  AirPurifierFilterLife: require('./AirPurifierFilterLife'),
  IRBlasterCodeDatabase: require('./IRBlasterCodeDatabase'),
  FingerprintLockFeatures: require('./FingerprintLockFeatures'),
  EnergyMeterPerPhase: require('./EnergyMeterPerPhase'),
  DoorbellCameraSnapshot: require('./DoorbellCameraSnapshot'),
  CurtainMotorTilt: require('./CurtainMotorTilt'),
  SmokePreAlarm: require('./SmokePreAlarm')
};
