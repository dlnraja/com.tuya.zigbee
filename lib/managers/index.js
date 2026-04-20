'use strict';

/**
 * Managers Index - v5.5.797
 * 
 * Centralized exports for all system managers
 */

module.exports = {
  // Core Managers
  MultiEndpointManager: require('./MultiEndpointManager'),
  PowerManager: require('./PowerManager'),
  EnergyManager: require('./EnergyManager'),
  SmartEnergyManager: require('./SmartEnergyManager'),

  // Device Migration
  DriverMigrationManager: require('./DriverMigrationManager'),
  AutonomousMigrationManager: require('./AutonomousMigrationManager'),
  
  // Capabilities
  DynamicCapabilityManager: require('./DynamicCapabilityManager'),
  
  // IAS Zone (Security)
  IASZoneManager: require('./IASZoneManager'),
  IASZoneEnhanced: require('./IASZoneEnhanced'),
  
  // IEEE Address (v5.5.797) + Advanced Enrollment
  IEEEAddressManager: require('./IEEEAddressManager'),
  IEEEAdvancedEnrollment: require('./IEEEAdvancedEnrollment'),
  
  // Smart Adaptation
  SmartDriverAdaptation: require('./SmartDriverAdaptation'),

  // Data Management
  IntelligentDataManager: require('./IntelligentDataManager'),

  // Battery
  SmartBatteryManager: require('./SmartBatteryManager'),

  // Variant Detection
  UniversalVariantManager: require('./UniversalVariantManager'),

  // Detection
  PowerSourceDetector: require('./PowerSourceDetector')
};
