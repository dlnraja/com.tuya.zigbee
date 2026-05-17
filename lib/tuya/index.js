'use strict';

/**
 * 🌌 Tuya Protocol Index - v7.0.0 (Antigravity Overhaul)
 * 
 * Centralized exports for all Tuya protocol handlers.
 * Governed by TUYA_ARCHITECT_SOP.md (Awesome Skills Logic).
 * 
 * Architecture:
 * - L1-L5 Interpretation Stack
 * - Autonomous Self-Healing via Mega-Audit/Fixer
 * - Local-First Agentic Logic (Claude Local Inspired)
 */

module.exports = {
  // Core Bridges & Managers
  LocalWiFiTuyaBridge: require('./LocalWiFiTuyaBridge'),
  // Core Managers
  TuyaEF00Manager: require('./TuyaEF00Manager'),
  TuyaSyncManager: require('./TuyaSyncManager'),
  TuyaMultiGangManager: require('./TuyaMultiGangManager'),
  TuyaProtocolManager: require('./TuyaProtocolManager'),
  
  // DP (DataPoint) Handling
  TuyaDataPointsComplete: require('./TuyaDataPointsComplete'),
  TuyaDPMapper: require('./TuyaDPMapper'),
  TuyaDPParser: require('./TuyaDPParser'),
  TuyaDPDatabase: require('./TuyaDPDatabase'),
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
  TuyaUnifiedParser: require('./TuyaUnifiedParser'),
  TuyaEF00Parser: require('./TuyaEF00Parser'),
  TuyaDataQuery: require('./TuyaDataQuery'),
  
  // Device Fingerprinting
  DeviceFingerprintDB: require('./DeviceFingerprintDB'),
  
  // LocalTuya Integration
  LocalTuyaInspired: require('./LocalTuyaInspired'),
  LocalTuyaEntityHandler: require('./LocalTuyaEntityHandler'),
  
  // Data Recovery
  DataRecoveryManager: require('./DataRecoveryManager'),
  
  // Enrichment Sources
  TuyaDataPointsJohan: require('./TuyaDataPointsJohan'),
  TuyaHelpersJohan: require('./TuyaHelpersJohan'),
  TuyaDataPointsZ2M: require('./TuyaDataPointsZ2M')
};
