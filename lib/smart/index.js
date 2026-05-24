'use strict';

/**
 * lib/smart/ — Module Smart Features
 * 
 * Architecture:
 *   lib/smart/
 *     ├── index.js               ← Point d'entrée
 *     ├── SmartCoordinator.js    ← Orchestrateur principal
 *     ├── SmartClusterEngine.js  ← Moteur de clustering intelligent
 *     ├── SmartEnergyEngine.js   ← (dans SmartCoordinator)
 *     ├── PresenceEngine.js      ← (dans SmartCoordinator)
 *     ├── ClusterModel.js        ← Modèle de données cluster
 *     ├── ClusterScoring.js      ← Moteur de scoring
 *     └── ClusterStorage.js      ← Persistance Homey settings
 * 
 * Intégration:
 *   const { SmartCoordinator } = require('./lib/smart');
 *   const coordinator = new SmartCoordinator({ homey: this.homey });
 *   coordinator.start();
 */

const { SmartCoordinator, SmartEnergyEngine, PresenceEngine, POWER_PROFILES, PRESENCE_WEIGHTS } = require('./SmartCoordinator');
const { SmartClusterEngine } = require('./SmartClusterEngine');
const { Cluster, CLUSTER_TYPES, CONFIDENCE_LEVELS } = require('./ClusterModel');
const { ClusterScoring, WEIGHTS, CORRELATION_WINDOW_MS, COMPATIBLE_TYPES } = require('./ClusterScoring');
const { ClusterStorage } = require('./ClusterStorage');

module.exports = {
  // Orchestrateur principal
  SmartCoordinator,
  
  // Moteurs individuels
  SmartEnergyEngine,
  PresenceEngine,
  SmartClusterEngine,
  
  // Modèles et scoring
  Cluster,
  ClusterScoring,
  ClusterStorage,
  
  // Constantes
  CLUSTER_TYPES,
  CONFIDENCE_LEVELS,
  POWER_PROFILES,
  PRESENCE_WEIGHTS,
  WEIGHTS,
  CORRELATION_WINDOW_MS,
  COMPATIBLE_TYPES,
};