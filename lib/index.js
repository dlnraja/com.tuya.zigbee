#!/usr/bin/env node
'use strict';

/**
 * Universal Tuya Zigbee Library - Module principal
 * Bibliothèque complète pour la gestion des appareils Tuya et Zigbee
 */

const helpers = require('./helpers');
const tuya = require('./tuya');
const zcl = require('./zcl');

// Export principal
module.exports = {
  // Modules principaux
  helpers,
  tuya,
  zcl,
  
  // Version de la bibliothèque
  version: '3.3.0',
  
  // Informations sur la bibliothèque
  info: {
    name: 'Universal Tuya Zigbee Library',
    description: 'Bibliothèque complète pour la gestion des appareils Tuya et Zigbee dans Homey',
    author: 'dlnraja',
    license: 'MIT',
    homepage: 'https://github.com/dlnraja/com.tuya.zigbee'
  }
};

// Export des classes principales pour compatibilité
module.exports.TuyaDpMapper = tuya;
module.exports.ClusterCapMap = zcl;
module.exports.Helpers = helpers;

// Export des utilitaires combinés
module.exports.utils = {
  // Utilitaires Tuya
  tuya: tuya.utils,
  
  // Utilitaires ZCL
  zcl: zcl.utils,
  
  // Utilitaires généraux
  general: helpers
};

// Export des constantes combinées
module.exports.constants = {
  // Constantes Tuya
  tuya: tuya.constants,
  
  // Constantes ZCL
  zcl: zcl.constants,
  
  // Constantes générales
  general: {
    // Types d'appareils
    DEVICE_TYPES: {
      SWITCH: 'switch',
      OUTLET: 'outlet',
      DIMMER: 'dimmer',
      LIGHT: 'light',
      SENSOR: 'sensor',
      COVER: 'cover',
      CURTAIN: 'curtain',
      GATEWAY: 'gateway'
    },
    
    // Types de protocoles
    PROTOCOLS: {
      ZIGBEE: 'zigbee',
      TUYA: 'tuya',
      ZIGBEE_TUYA: 'zigbee_tuya'
    },
    
    // Niveaux de support
    SUPPORT_LEVELS: {
      FULL: 'full',
      PARTIAL: 'partial',
      BASIC: 'basic',
      UNKNOWN: 'unknown'
    }
  }
};

// Export des helpers combinés
module.exports.helpers = {
  // Helpers Tuya
  tuya: tuya.helpers,
  
  // Helpers ZCL
  zcl: zcl.helpers,
  
  // Helpers généraux
  general: helpers
};

// Fonction d'initialisation de la bibliothèque
module.exports.initialize = function(options = {}) {
  console.log(`🚀 Initializing Universal Tuya Zigbee Library v${this.version}`);
  
  // Options de configuration
  const config = {
    debug: options.debug || false,
    logLevel: options.logLevel || 'info',
    enableHeuristics: options.enableHeuristics !== false,
    enableCache: options.enableCache !== false,
    ...options
  };
  
  // Initialiser les modules
  if (config.debug) {
    console.log('🔧 Debug mode enabled');
    console.log('📊 Library modules loaded:', Object.keys(this).filter(key => typeof this[key] === 'object'));
  }
  
  // Émettre un événement d'initialisation
  this.emit && this.emit('initialized', { version: this.version, config });
  
  return this;
};

// Fonction de diagnostic de la bibliothèque
module.exports.diagnose = function() {
  const diagnosis = {
    version: this.version,
    modules: {
      helpers: typeof helpers === 'object',
      tuya: typeof tuya === 'function',
      zcl: typeof zcl === 'object'
    },
    capabilities: {
      tuya: tuya.getStats ? tuya.getStats() : 'Not available',
      zcl: zcl.getClusterStats ? zcl.getClusterStats() : 'Not available'
    },
    timestamp: new Date().toISOString()
  };
  
  return diagnosis;
};

// Fonction de nettoyage de la bibliothèque
module.exports.cleanup = function() {
  console.log('🧹 Cleaning up Universal Tuya Zigbee Library');
  
  // Nettoyer les caches
  if (tuya.clearHeuristicCache) {
    tuya.clearHeuristicCache();
  }
  
  // Émettre un événement de nettoyage
  this.emit && this.emit('cleanup');
  
  return this;
};

// Auto-initialisation si appelé directement
if (require.main === module) {
  console.log('📚 Universal Tuya Zigbee Library loaded successfully');
  console.log('🔍 Run .diagnose() to check library status');
}
