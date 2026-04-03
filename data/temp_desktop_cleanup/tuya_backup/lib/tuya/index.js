'use strict';

/**
 * Tuya Protocol Index - v5.5.797
 * 
 * Centralized exports for all Tuya protocol handlers
 */

module.exports = {
  // Core Managers
  TuyaEF00Manager: require('./TuyaEF00Manager'),
  TuyaSyncManager: require('./TuyaSyncManager'),
  TuyaMultiGangManager: require('./TuyaMultiGangManager'),
  TuyaProtocolManager: require('./TuyaProtocolManager'),
  
  // DP (DataPoint) Handling
  TuyaDataPointsComplete: require('./TuyaDataPointsComplete'),
  TuyaDPMapperComplete: require('./TuyaDPMapperComplete'),
  TuyaDPMapper: require('./TuyaDPMapper'),
  TuyaDPParser: require('./TuyaDPParser'),
  TuyaDPDatabase: require('./TuyaDPDatabase'),
  TuyaDPDiscovery: require('./TuyaDPDiscovery'),
  TuyaDPUltimate: require('./TuyaDPUltimate'),
  TuyaDataPointEngine: require('./TuyaDataPointEngine'),
  EnrichedDPMappings: require('./EnrichedDPMappings'),
  
  // Cluster Handling
  TuyaManufacturerCluster: require('./TuyaManufacturerCluster'),
  TuyaClusterWrapper: require('./TuyaClusterWrapper'),
  TuyaSpecificCluster: require('./TuyaSpecificCluster'),
  
  // Time Sync
  TuyaTimeSync: require('./TuyaTimeSync'),
  TuyaTimeSyncManager: require('./TuyaTimeSyncManager'),
  TuyaTimeSyncFormats: require('./TuyaTimeSyncFormats'),
  UniversalTimeSync: require('./UniversalTimeSync'),
  
  // Device Support
  TuyaAdapter: require('./TuyaAdapter'),
  TuyaZigbeeDevice: require('./TuyaZigbeeDevice'),
  TuyaSpecificDevice: require('./TuyaSpecificDevice'),
  TuyaProfiles: require('./TuyaProfiles'),
  
  // Parsing
  UniversalTuyaParser: require('./UniversalTuyaParser'),
  TuyaEF00Parser: require('./TuyaEF00Parser'),
  TuyaDataQuery: require('./TuyaDataQuery'),
  
  // Device Fingerprinting
  DeviceFingerprintDB: require('./DeviceFingerprintDB'),
  
  // LocalTuya Integration
  LocalTuyaInspired: require('./LocalTuyaInspired'),
  LocalTuyaEntityHandler: require('./LocalTuyaEntityHandler'),
  LocalTuyaDPDatabase: require('./LocalTuyaDPDatabase'),
  
  // Data Recovery
  DataRecoveryManager: require('./DataRecoveryManager'),
  
  // Enrichment Sources
  TuyaDataPointsJohan: require('./TuyaDataPointsJohan'),
  TuyaHelpersJohan: require('./TuyaHelpersJohan'),
  TuyaDataPointsZ2M: require('./TuyaDataPointsZ2M')
};
