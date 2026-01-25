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
  OTAManager: require('./OTAManager'),
  CountdownTimerManager: require('./CountdownTimerManager'),
  EnergyManager: require('./EnergyManager'),
  HybridEnergyManager: require('./HybridEnergyManager'),
  
  // Device Migration
  DeviceMigrationManager: require('./DeviceMigrationManager'),
  DriverMigrationManager: require('./DriverMigrationManager'),
  AutonomousMigrationManager: require('./AutonomousMigrationManager'),
  
  // Capabilities
  DynamicCapabilityManager: require('./DynamicCapabilityManager'),
  
  // IAS Zone (Security)
  IASZoneManager: require('./IASZoneManager'),
  IASZoneEnhanced: require('./IASZoneEnhanced'),
  
  // IEEE Address (v5.5.797)
  IEEEAddressManager: require('./IEEEAddressManager'),
  
  // Smart Adaptation
  SmartAdaptManager: require('./SmartAdaptManager'),
  SmartAdaptationMixin: require('./SmartAdaptationMixin'),
  SmartDriverAdaptation: require('./SmartDriverAdaptation'),
  
  // Data Management
  IntelligentDataManager: require('./IntelligentDataManager'),
  UniversalHybridEnricher: require('./UniversalHybridEnricher'),
  
  // Detection
  PowerSourceDetector: require('./PowerSourceDetector'),
  AutoDiscoverySystem: require('./AutoDiscoverySystem')
};
