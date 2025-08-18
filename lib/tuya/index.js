#!/usr/bin/env node
'use strict';

/**
 * Tuya Library - Module principal
 * Bibliothèque complète pour la gestion des appareils Tuya Zigbee
 */

const TuyaDpMapper = require('./dp-map');

// Export de la classe principale
module.exports = TuyaDpMapper;

// Export des utilitaires
module.exports.utils = {
  /**
   * Valide un DP ID Tuya
   * @param {number} dpId - ID du Data Point
   * @returns {boolean} True si valide
   */
  isValidDpId(dpId) {
    return typeof dpId === 'number' && dpId >= 1 && dpId <= 65535;
  },

  /**
   * Normalise une valeur Tuya selon son type
   * @param {*} value - Valeur brute
   * @param {string} type - Type de valeur
   * @returns {*} Valeur normalisée
   */
  normalizeValue(value, type) {
    switch (type) {
      case 'bool':
        return Boolean(value);
      case 'value':
        return Number(value);
      case 'string':
        return String(value);
      default:
        return value;
    }
  },

  /**
   * Formate un DP pour l'affichage
   * @param {number} dpId - ID du DP
   * @param {*} value - Valeur du DP
   * @param {Object} mapping - Mapping du DP
   * @returns {string} Description formatée
   */
  formatDp(dpId, value, mapping) {
    if (!mapping) {
      return `DP${dpId}: ${value}`;
    }

    const { capability, description, unit, range } = mapping;
    let formatted = `${description} (DP${dpId}): ${value}`;
    
    if (unit) {
      formatted += ` ${unit}`;
    }
    
    if (range && Array.isArray(range)) {
      formatted += ` [${range[0]}-${range[1]}]`;
    }
    
    return formatted;
  }
};

// Export des constantes
module.exports.constants = {
  // Types de DPs
  DP_TYPES: {
    BOOL: 'bool',
    VALUE: 'value',
    STRING: 'string',
    ENUM: 'enum'
  },

  // Niveaux de confiance
  CONFIDENCE_LEVELS: {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low'
  },

  // Ranges de DPs par type d'appareil
  DP_RANGES: {
    SWITCH: [1, 10],
    DIMMER: [20, 40],
    SENSOR: [100, 200],
    COVER: [200, 210],
    ELECTRICAL: [400, 410],
    BATTERY: [500, 510]
  },

  // Clusters Tuya
  TUYA_CLUSTERS: {
    MANU_SPECIFIC_TUYA: 'manuSpecificTuya',
    TUYA_EF00: '0xEF00'
  }
};

// Export des helpers
module.exports.helpers = {
  /**
   * Crée un mapping de DP personnalisé
   * @param {number} dpId - ID du DP
   * @param {string} capability - Capability Homey
   * @param {Object} options - Options du mapping
   * @returns {Object} Mapping personnalisé
   */
  createCustomMapping(dpId, capability, options = {}) {
    return {
      dpId,
      capability,
      description: options.description || `Custom DP ${dpId}`,
      type: options.type || 'value',
      unit: options.unit,
      range: options.range,
      confidence: options.confidence || 'low',
      source: 'custom'
    };
  },

  /**
   * Fusionne des mappings de DPs
   * @param {Array} mappings - Liste des mappings
   * @returns {Object} Mappings fusionnés
   */
  mergeDpMappings(mappings) {
    const merged = {};
    
    mappings.forEach(mapping => {
      if (mapping && mapping.dpId) {
        merged[mapping.dpId] = {
          ...merged[mapping.dpId],
          ...mapping
        };
      }
    });
    
    return merged;
  },

  /**
   * Valide un mapping de DP
   * @param {Object} mapping - Mapping à valider
   * @returns {boolean} True si valide
   */
  validateMapping(mapping) {
    return mapping &&
           typeof mapping.dpId === 'number' &&
           typeof mapping.capability === 'string' &&
           mapping.capability.length > 0;
  }
};
