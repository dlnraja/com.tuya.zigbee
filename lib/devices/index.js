'use strict';

module.exports = {
  // Existing base classes
  BaseHybridDevice: require('./BaseHybridDevice'),
  ButtonDevice: require('./ButtonDevice'),
  PlugDevice: require('./PlugDevice'),
  SensorDevice: require('./SensorDevice'),
  SwitchDevice: require('./SwitchDevice'),
  WallTouchDevice: require('./WallTouchDevice'),

  // v5.3.64: Centralized Hybrid Bases (EF00/ZCL compatible)
  HybridSensorBase: require('./HybridSensorBase'),
  HybridPlugBase: require('./HybridPlugBase'),
  HybridLightBase: require('./HybridLightBase'),
  HybridSwitchBase: require('./HybridSwitchBase'),
  HybridCoverBase: require('./HybridCoverBase'),
  HybridThermostatBase: require('./HybridThermostatBase')
};
