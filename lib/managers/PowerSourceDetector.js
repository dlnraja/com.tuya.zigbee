'use strict';

/**
 * PowerSourceDetector - Détecte si device est alimenté secteur ou batterie
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
   * Détermine si un device est alimenté par secteur (pas de batterie)
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

      // Moteurs (généralement secteur, parfois batterie rechargeable)
      // 'curtain_motor', // AMBIGU - peut être batterie rechargeable

      // HVAC
      'hvac_',

      // Sirènes filaires (attention: certaines ont backup)
      'siren_wired'
    ];

    // Vérifier patterns
    const isPowered = poweredPatterns.some(pattern =>
      modelId.toLowerCase().includes(pattern.toLowerCase()) ||
      productId.toLowerCase().includes(pattern.toLowerCase())
    );

    if (isPowered) {
      device.log('⚡ [POWER] Device identified as MAINS POWERED');
      device.log(`   Model: ${modelId}, Product: ${productId}`);
    } else {
      device.log('🔋 [POWER] Device identified as BATTERY POWERED');
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
      // Capteurs génériques (température, humidité, CO2, etc.)
      sensor: {
        minInterval: 7200,   // 2h - peu de changements
        maxInterval: 65535,  // ~18h - max uint16 value
        minChange: 10,       // 5% (0-200 scale)
        description: 'Generic sensor - low activity'
      },

      // Détecteurs de mouvement (plus actifs)
      motion: {
        minInterval: 3600,   // 1h - activité plus fréquente
        maxInterval: 43200,  // 12h - report bi-quotidien
        minChange: 15,       // 7.5% - seuil plus large
        description: 'Motion sensor - medium activity'
      },

      // Contacts de porte/fenêtre
      contact: {
        minInterval: 7200,   // 2h - activité moyenne
        maxInterval: 65535,  // ~18h - max uint16 value
        minChange: 10,       // 5% - seuil standard
        description: 'Contact sensor - medium activity'
      },

      // Télécommandes (peu utilisées)
      remote: {
        minInterval: 14400,  // 4h - peu d'activité
        maxInterval: 65535,  // ~18h - max uint16 value
        minChange: 20,       // 10% - seuil large
        description: 'Remote control - low activity'
      },

      // Boutons sans fil (peu utilisés)
      button: {
        minInterval: 14400,  // 4h - peu d'activité
        maxInterval: 65535,  // ~18h - max uint16 value
        minChange: 20,       // 10% - seuil large
        description: 'Wireless button - low activity'
      },

      // Détecteurs de fumée (CRITIQUES)
      smoke: {
        minInterval: 3600,   // 1h - sécurité critique
        maxInterval: 21600,  // 6h - report fréquent
        minChange: 10,       // 5% - ne pas manquer batterie faible
        description: 'Smoke detector - CRITICAL safety device'
      },

      // Détecteurs de fuite d'eau (CRITIQUES)
      water: {
        minInterval: 3600,   // 1h - sécurité critique
        maxInterval: 21600,  // 6h - report fréquent
        minChange: 10,       // 5% - ne pas manquer batterie faible
        description: 'Water leak sensor - CRITICAL safety device'
      },

      // Sonnettes (activité moyenne, besoin de fiabilité)
      doorbell: {
        minInterval: 3600,   // 1h - besoin de fiabilité
        maxInterval: 43200,  // 12h - report bi-quotidien
        minChange: 15,       // 7.5% - seuil modéré
        description: 'Doorbell - needs reliability'
      },

      // Mode ECO (batterie maximale)
      eco: {
        minInterval: 14400,  // 4h - très économe
        maxInterval: 65535,  // ~18h - max uint16 value
        minChange: 20,       // 10% - peu de spam
        description: 'ECO mode - maximize battery life'
      },

      // Mode FREQUENT (debug ou besoin précis)
      frequent: {
        minInterval: 1800,   // 30min - plus fréquent
        maxInterval: 21600,  // 6h - plusieurs fois par jour
        minChange: 5,        // 2.5% - très sensible
        description: 'FREQUENT mode - debugging or precise needs'
      }
    };

    return configs[deviceType] || configs.sensor;
  }

  /**
   * Détermine le type de device pour configuration batterie
   * @param {ZigBeeDevice} device - Instance du device
   * @returns {string} Type de device ('sensor', 'motion', 'contact', etc.)
   */
  static getDeviceType(device) {
    const data = device.getData() || {};
    const modelId = (data.modelId || '').toLowerCase();
    const productId = (data.productId || '').toLowerCase();

    // Patterns pour identifier type
    if (modelId.includes('motion') || modelId.includes('pir')) return 'motion';
    if (modelId.includes('contact') || modelId.includes('door')) return 'contact';
    if (modelId.includes('smoke')) return 'smoke';
    if (modelId.includes('water') || modelId.includes('leak')) return 'water';
    if (modelId.includes('button') || modelId.includes('remote')) return 'button';
    if (modelId.includes('doorbell')) return 'doorbell';

    // Par défaut: sensor générique
    return 'sensor';
  }

  /**
   * Applique configuration reporting selon setting utilisateur
   * @param {ZigBeeDevice} device - Instance du device
   * @param {string} baseType - Type de base ('sensor', 'motion', etc.)
   * @returns {Object} Configuration adaptée aux settings
   */
  static getConfigWithUserSettings(device, baseType) {
    // Obtenir config de base
    let config = this.getBatteryReportingConfig(baseType);

    // Vérifier si utilisateur a override
    const userInterval = device.getSetting('battery_report_interval');

    if (userInterval === 'eco') {
      config = this.getBatteryReportingConfig('eco');
      device.log('🌿 [BATTERY] Using ECO mode (max battery life)');
    } else if (userInterval === 'frequent') {
      config = this.getBatteryReportingConfig('frequent');
      device.log('⚡ [BATTERY] Using FREQUENT mode (more updates)');
    } else {
      device.log(`🔋 [BATTERY] Using ${baseType.toUpperCase()} mode (${config.description})`);
    }

    return config;
  }
}

module.exports = PowerSourceDetector;
