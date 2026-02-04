'use strict';

/**
 * Clusters Index - v5.5.797
 * 
 * Centralized exports for all Zigbee cluster handlers
 */

module.exports = {
  // Tuya Clusters
  TuyaBoundCluster: require('./TuyaBoundCluster'),
  TuyaE000BoundCluster: require('./TuyaE000BoundCluster'),
  TuyaSpecificCluster: require('./TuyaSpecificCluster'),
  
  // v5.8.22 Exotic Clusters
  TuyaE000Cluster: require('./TuyaE000Cluster'),
  TuyaE001Cluster: require('./TuyaE001Cluster'),
  TuyaE002Cluster: require('./TuyaE002Cluster'),
  TuyaOnOffExtCluster: require('./TuyaOnOffExtCluster'),
  
  // Standard ZCL Bound Clusters
  OnOffBoundCluster: require('./OnOffBoundCluster'),
  LevelControlBoundCluster: require('./LevelControlBoundCluster'),
  ScenesBoundCluster: require('./ScenesBoundCluster'),
  
  // IAS (Security)
  IasAceCluster: require('./IasAceCluster'),
  
  // Universal Binder
  UniversalClusterBinder: require('./UniversalClusterBinder')
};
