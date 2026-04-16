'use strict';

/**
 * Clusters Index - v5.12.2
 * Centralized exports for all Zigbee cluster handlers
 */

module.exports = {
  // Tuya EF00 (main DP tunnel)
  TuyaBoundCluster: require('./TuyaBoundCluster'),
  TuyaSpecificCluster: require('./TuyaSpecificCluster'),

  // Tuya E000-E003 (manufacturer-specific)
  TuyaE000Cluster: require('./TuyaE000Cluster'),
  TuyaE000BoundCluster: require('./TuyaE000BoundCluster'),
  TuyaE001Cluster: require('./TuyaE001Cluster'),
  TuyaE001BoundCluster: require('./TuyaE001BoundCluster'),
  TuyaE002Cluster: require('./TuyaE002Cluster'),
  TuyaE002BoundCluster: require('./TuyaE002BoundCluster'),
  TuyaE003Cluster: require('./TuyaE003Cluster'),
  TuyaE003BoundCluster: require('./TuyaE003BoundCluster'),

  // Tuya extended
  TuyaOnOffExtCluster: require('./TuyaOnOffExtCluster'),

  // Zosung IR (0xE004, 0xED00)
  ZosungIRControlCluster: require('./ZosungIRControlCluster'),
  ZosungIRControlBoundCluster: require('./ZosungIRControlBoundCluster'),
  ZosungIRTransmitCluster: require('./ZosungIRTransmitCluster'),
  ZosungIRTransmitBoundCluster: require('./ZosungIRTransmitBoundCluster'),

  // Standard ZCL Bound Clusters
  OnOffBoundCluster: require('./OnOffBoundCluster'),
  LevelControlBoundCluster: require('./LevelControlBoundCluster'),
  ScenesBoundCluster: require('./ScenesBoundCluster'),

  // IAS (Security)
  IasAceCluster: require('./IasAceCluster'),

  // Universal handlers
  UniversalClusterBinder: require('./UniversalClusterBinder'),
  UnknownClusterHandler: require('./UnknownClusterHandler'),
  RawClusterFallback: require('./RawClusterFallback'),
  CustomClusterManager: require('./CustomClusterManager'),
};
