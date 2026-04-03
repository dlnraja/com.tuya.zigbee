'use strict';

/**
 * Battery Management Index - v5.5.797
 * 
 * Centralized exports for all battery-related utilities
 */

module.exports = {
  // Core Battery System
  BatterySystem: require('./BatterySystem'),
  BatteryManager: require('./BatteryManager'),
  BatteryManagerV2: require('./BatteryManagerV2'),
  BatteryManagerV3: require('./BatteryManagerV3'),
  
  // Hybrid & Unified
  BatteryHybridManager: require('./BatteryHybridManager'),
  UnifiedBatteryHandler: require('./UnifiedBatteryHandler'),
  
  // Utilities
  BatteryCalculator: require('./BatteryCalculator'),
  BatteryHelper: require('./BatteryHelper'),
  BatteryIconDetector: require('./BatteryIconDetector'),
  
  // Monitoring
  BatteryMonitoringMixin: require('./BatteryMonitoringMixin'),
  BatteryMonitoringSystem: require('./BatteryMonitoringSystem'),
  
  // Profiles
  BatteryProfileDatabase: require('./BatteryProfileDatabase')
};
