#!/usr/bin/env node
'use strict';

/**
 * ZCL Library - Module principal
 * Bibliothèque complète pour la gestion des clusters ZCL Zigbee
 */

const clusterCapMap = require('./cluster-cap-map');

// Export de la classe principale
module.exports = clusterCapMap;

// Export des utilitaires
module.exports.utils = {
  /**
   * Valide un nom de cluster ZCL
   * @param {string} clusterName - Nom du cluster
   * @returns {boolean} True si valide
   */
  isValidClusterName(clusterName) {
    return typeof clusterName === 'string' && clusterName.length > 0;
  },

  /**
   * Normalise un nom de cluster ZCL
   * @param {string} clusterName - Nom du cluster
   * @returns {string} Nom normalisé
   */
  normalizeClusterName(clusterName) {
    if (!clusterName) return '';
    
    // Supprimer les préfixes hexadécimaux
    return clusterName.replace(/^0x/i, '');
  },

  /**
   * Formate un attribut ZCL pour l'affichage
   * @param {string} clusterName - Nom du cluster
   * @param {string} attributeName - Nom de l'attribut
   * @param {*} value - Valeur de l'attribut
   * @returns {string} Description formatée
   */
  formatAttribute(clusterName, attributeName, value) {
    const cluster = clusterCapMap.clusterCapMap[clusterName];
    if (!cluster || !cluster.attributes[attributeName]) {
      return `${clusterName}.${attributeName}: ${value}`;
    }

    const capability = cluster.attributes[attributeName];
    return `${capability} (${clusterName}.${attributeName}): ${value}`;
  },

  /**
   * Obtient le type de données d'un attribut ZCL
   * @param {string} clusterName - Nom du cluster
   * @param {string} attributeName - Nom de l'attribut
   * @returns {string|null} Type de données
   */
  getAttributeType(clusterName, attributeName) {
    // Types de données ZCL standards
    const zclTypes = {
      // Booléens
      'genOnOff.onOff': 'bool',
      'ssIasZone.zoneState': 'bool',
      
      // Entiers
      'levelControl.currentLevel': 'uint8',
      'genPowerCfg.batteryPercentageRemaining': 'uint8',
      'msTemperatureMeasurement.measuredValue': 'int16',
      'msRelativeHumidity.measuredValue': 'uint16',
      'msIlluminanceMeasurement.measuredValue': 'uint16',
      
      // Flottants
      'haElectricalMeasurement.activePower': 'int16',
      'haElectricalMeasurement.rmsVoltage': 'uint16',
      'haElectricalMeasurement.rmsCurrent': 'uint16',
      
      // Énumérations
      'closuresWindowCovering.currentPositionLiftPercentage': 'uint8',
      'closuresWindowCovering.currentPositionTiltPercentage': 'uint8'
    };

    const key = `${clusterName}.${attributeName}`;
    return zclTypes[key] || 'unknown';
  }
};

// Export des constantes
module.exports.constants = {
  // Types de clusters ZCL
  CLUSTER_TYPES: {
    GENERAL: 'gen',
    MEASUREMENT: 'ms',
    SECURITY: 'ss',
    HOME_AUTOMATION: 'ha',
    SMART_ENERGY: 'se',
    CLOSURES: 'closures'
  },

  // Types de données ZCL
  DATA_TYPES: {
    BOOL: 'bool',
    UINT8: 'uint8',
    UINT16: 'uint16',
    UINT32: 'uint32',
    INT8: 'int8',
    INT16: 'int16',
    INT32: 'int32',
    FLOAT: 'float',
    STRING: 'string',
    ARRAY: 'array'
  },

  // Clusters ZCL standards
  STANDARD_CLUSTERS: {
    // Général
    GEN_ON_OFF: 'genOnOff',
    GEN_LEVEL_CONTROL: 'levelControl',
    GEN_POWER_CFG: 'genPowerCfg',
    
    // Mesures
    MS_TEMPERATURE: 'msTemperatureMeasurement',
    MS_HUMIDITY: 'msRelativeHumidity',
    MS_ILLUMINANCE: 'msIlluminanceMeasurement',
    
    // Électrique
    HA_ELECTRICAL: 'haElectricalMeasurement',
    SE_METERING: 'seMetering',
    
    // Couvertures
    CLOSURES_WINDOW: 'closuresWindowCovering',
    
    // Sécurité
    SS_IAS_ZONE: 'ssIasZone'
  },

  // Attributs ZCL standards
  STANDARD_ATTRIBUTES: {
    // Général
    ON_OFF: 'onOff',
    CURRENT_LEVEL: 'currentLevel',
    BATTERY_PERCENTAGE: 'batteryPercentageRemaining',
    
    // Mesures
    MEASURED_VALUE: 'measuredValue',
    
    // Électrique
    ACTIVE_POWER: 'activePower',
    RMS_VOLTAGE: 'rmsVoltage',
    RMS_CURRENT: 'rmsCurrent',
    
    // Couvertures
    LIFT_PERCENTAGE: 'currentPositionLiftPercentage',
    TILT_PERCENTAGE: 'currentPositionTiltPercentage',
    
    // Sécurité
    ZONE_STATE: 'zoneState'
  }
};

// Export des helpers
module.exports.helpers = {
  /**
   * Crée un mapping de cluster personnalisé
   * @param {string} clusterName - Nom du cluster
   * @param {Array} capabilities - Capabilities Homey
   * @param {Object} attributes - Mapping des attributs
   * @returns {Object} Mapping personnalisé
   */
  createCustomClusterMapping(clusterName, capabilities, attributes = {}) {
    return {
      capabilities,
      attributes
    };
  },

  /**
   * Fusionne des mappings de clusters
   * @param {Array} mappings - Liste des mappings
   * @returns {Object} Mappings fusionnés
   */
  mergeClusterMappings(mappings) {
    const merged = {};
    
    mappings.forEach(mapping => {
      if (mapping && mapping.clusterName) {
        merged[mapping.clusterName] = {
          ...merged[mapping.clusterName],
          ...mapping
        };
      }
    });
    
    return merged;
  },

  /**
   * Valide un mapping de cluster
   * @param {Object} mapping - Mapping à valider
   * @returns {boolean} True si valide
   */
  validateClusterMapping(mapping) {
    return mapping &&
           Array.isArray(mapping.capabilities) &&
           mapping.capabilities.length > 0 &&
           typeof mapping.attributes === 'object';
  },

  /**
   * Obtient les statistiques des clusters
   * @returns {Object} Statistiques
   */
  getClusterStats() {
    const clusters = Object.keys(clusterCapMap.clusterCapMap);
    const capabilities = clusterCapMap.getSupportedCapabilities();
    
    return {
      totalClusters: clusters.length,
      totalCapabilities: capabilities.length,
      clusters,
      capabilities
    };
  }
};
