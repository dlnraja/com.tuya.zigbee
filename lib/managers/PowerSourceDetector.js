'use strict';
// A8: NaN Safety - use safeDivide/safeMultiply
const CI = require('../utils/CaseInsensitiveMatcher');
const { safeParse } = require('../utils/tuyaUtils.js');


/**
 * PowerSourceDetector - DÃ©tecte si device est alimentÃ© secteur ou batterie
 *
 * Usage:
 *   const PowerSourceDetector = require('../../lib/PowerSourceDetector');
 *
 *   if (PowerSourceDetector.isPowered(this)) {
 *     // Device sur secteur - pas de batterie
 *   } else {
 *     // Device sur batterie - configurer monitoring
 *   }
 */

class PowerSourceDetector {
  /**
   * DÃ©termine si un device est alimentÃ© par secteur (pas de batterie)
   * @param {ZigBeeDevice} device - Instance du device Homey
   * @returns {boolean} true si device sur secteur, false si batterie
   */
  static isPowered(device) {
    const data = device.getData() || {};
    const modelId = data.modelId || '';
    const productId = data.productId || '';

    // Liste des patterns de devices TOUJOURS sur secteur
    const poweredPatterns = [
      // Switches muraux
      'switch_',
      'TS0121', // Smart plugs
      'TS0122', // Smart plugs 2 gang
      'TS011F', // Smart plugs EU/US
      'TS0001', // 1 gang switch
      'TS0002', // 2 gang switch
      'TS0003', // 3 gang switch
      'TS0004', // 4 gang switch

      // Dimmers
      'dimmer_',
      'TS0601_dimmer',

      // Thermostats filaires (attention: certains ont backup batterie)
      'thermostat_temperature_control',
      'thermostat_heating',

      // Prises et outlets
      'outlet_',
      'usb_outlet',

      // Moteurs (gÃ©nÃ©ralement secteur, parfois batterie rechargeable)
      // 'curtain_motor', 

      // HVAC
      'hvac_',

      // SirÃ¨nes filaires (attention: certaines ont backup)
      'siren_wired'
    ];

    // VÃ©rifier patterns
    const isPowered = poweredPatterns.some(pattern =>
      CI.containsCI(modelId, pattern) ||
      CI.containsCI(productId, pattern)
    );

    if (isPowered) {
      device.log(' [POWER] Device identified as MAINS POWERED');
      device.log(`   Model: ${modelId}, Product: ${productId}`);
    } else {
      device.log(' [POWER] Device identified as BATTERY POWERED');
      device.log(`   Model: ${modelId}, Product: ${productId}`);
    }

    return isPowered;
  }

  /**
   * Retourne configuration reporting optimale selon type de device batterie
   * @param {string} deviceType - Type: 'sensor', 'motion', 'contact', 'remote', 'button'
   * @returns {Object} Configuration avec minInterval, maxInterval, minChange
   */
  static getBatteryReportingConfig(deviceType) {
    const configs = {
      // Capteurs gÃ©nÃ©riques (tempÃ©rature, humiditÃ©, CO2, etc.)
      sensor: {
        minInterval: 7200,   // 2h - peu de changements
        maxInterval: 65535,  // ~18h - max uint16 value
        minChange: 10,       // 5% (0-200 scale)
        description: 'Generic sensor - low activity'
      },

      // DÃ©tecteurs de mouvement (plus actifs)
      motion: {
        minInterval: 3600,   // 1h - activitÃ© plus frÃ©quente
        maxInterval: 43200,  // 12h - report bi-quotidien
        minChange: 15,       // 7.5% - seuil plus large
        description: 'Motion sensor - medium activity'
      },

      // Contacts de porte / fenÃªtre
      contact: {
        minInterval: 7200,   // 2h - activitÃ© moyenne
        maxInterval: 65535,  // ~18h - max uint16 value
        minChange: 10,       // 5% - seuil standard
        description: 'Contact sensor - medium activity'
      },

      // TÃ©lÃ©commandes (peu utilisÃ©es)
      remote: {
        minInterval: 14400,  // 4h - peu d'activitÃ©
        maxInterval: 65535,  // ~18h - max uint16 value
        minChange: 20,       // 10% - seuil large
        description: 'Remote control - low activity'
      },

      // Boutons sans fil (peu utilisÃ©s)
      button: {
        minInterval: 14400,  // 4h - peu d'activitÃ©
        maxInterval: 65535,  // ~18h - max uint16 value
        minChange: 20,       // 10% - seuil large
        description: 'Wireless button - low activity'
      },

      // DÃ©tecteurs de fumÃ©e (CRITIQUES)
      smoke: {
        minInterval: 3600,   // 1h - sÃ©curitÃ© critique
        maxInterval: 21600,  // 6h - report frÃ©quent
        minChange: 10,       // 5% - ne pas manquer batterie faible
        description: 'Smoke detector - CRITICAL safety device'
      },

      // DÃ©tecteurs de fuite d'eau (CRITIQUES)
      water: {
        minInterval: 3600,   // 1h - sÃ©curitÃ© critique
        maxInterval: 21600,  // 6h - report frÃ©quent
        minChange: 10,       // 5% - ne pas manquer batterie faible
        description: 'Water leak sensor - CRITICAL safety device'
      },

      // Sonnettes (activitÃ© moyenne, besoin de fiabilitÃ©)
      doorbell: {
        minInterval: 3600,   // 1h - besoin de fiabilitÃ©
        maxInterval: 43200,  // 12h - report bi-quotidien
        minChange: 15,       // 7.5% - seuil modÃ©rÃ©
        description: 'Doorbell - needs reliability'
      },

      // Mode ECO (batterie maximale)
      eco: {
        minInterval: 14400,  // 4h - trÃ¨s Ã©conome
        maxInterval: 65535,  // ~18h - max uint16 value
        minChange: 20,       // 10% - peu de spam
        description: 'ECO mode - maximize battery life'
      },

      // Mode FREQUENT (debug ou besoin prÃ©cis)
      frequent: {
        minInterval: 1800,   // 30min - plus frÃ©quent
        maxInterval: 21600,  // 6h - plusieurs fois par jour
        minChange: 5,        // 2.5% - trÃ¨s sensible
        description: 'FREQUENT mode - debugging or precise needs'
      }
    };

    return configs[deviceType] || configs.sensor;
  }

  /**
   * DÃ©termine le type de device pour configuration batterie
   * @param {ZigBeeDevice} device - Instance du device
   * @returns {string} Type de device ('sensor', 'motion', 'contact', etc.)
   */
  static getDeviceType(device) {
    const data = device.getData() || {};
    const modelId = data.modelId || '';
    const productId = data.productId || '';

    // Patterns pour identifier type
    if (CI.includesCI(modelId, 'motion') || CI.includesCI(modelId, 'pir')) return 'motion';
    if (CI.includesCI(modelId, 'contact') || CI.includesCI(modelId, 'door')) return 'contact';
    if (CI.includesCI(modelId, 'smoke')) return 'smoke';
    if (CI.includesCI(modelId, 'water') || CI.includesCI(modelId, 'leak')) return 'water';
    if (CI.includesCI(modelId, 'button') || CI.includesCI(modelId, 'remote')) return 'button';
    if (CI.includesCI(modelId, 'doorbell')) return 'doorbell';

    // Par dÃ©faut: sensor gÃ©nÃ©rique
    return 'sensor';
  }

  /**
   * Applique configuration reporting selon setting utilisateur
   * @param {ZigBeeDevice} device - Instance du device
   * @param {string} baseType - Type de base ('sensor', 'motion', etc.)
   * @returns {Object} Configuration adaptÃ©e aux settings
   */
  static getConfigWithUserSettings(device, baseType) {
    // Obtenir config de base
    let config = this.getBatteryReportingConfig(baseType);

    // VÃ©rifier si utilisateur a override
    const userInterval = device.getSetting('battery_report_interval');

    if (userInterval === 'eco') {
      config = this.getBatteryReportingConfig('eco');
      device.log(' [BATTERY] Using ECO mode (max battery life)');
    } else if (userInterval === 'frequent') {
      config = this.getBatteryReportingConfig('frequent');
      device.log(' [BATTERY] Using FREQUENT mode (more updates)');
    } else {
      device.log(` [BATTERY] Using ${baseType.toUpperCase()} mode (${config.description})`);
    }

    return config;
  }
}

module.exports = PowerSourceDetector;
