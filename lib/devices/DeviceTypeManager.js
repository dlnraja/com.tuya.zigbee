'use strict';

/**
 * 🏠 Device Type Manager
 * Gère les différents types d'appareils connectés aux modules de contrôle
 * Permet l'inversion logique pour radiateurs électriques et autres cas spéciaux
 */

class DeviceTypeManager {
  constructor() {
    this.deviceTypes = {
      'light': {
        name: 'Éclairage',
        icon: '💡',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Ampoules, LED, éclairage standard'
      },
      'radiator': {
        name: 'Radiateur électrique',
        icon: '🔥',
        invertLogic: true,
        supportsEnergyMonitoring: false,
        description: 'Radiateur avec fil pilote, logique inversée'
      },
      'fan': {
        name: 'Ventilation',
        icon: '🌀',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Ventilateur, aérateur, VMC'
      },
      'other': {
        name: 'Autre appareil',
        icon: '⚙️',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Appareil générique'
      }
    };
  }

  /**
   * Récupère la configuration pour un type de device
   * @param {string} deviceType - Type de device ('light', 'radiator', 'fan', 'other')
   * @returns {object} Configuration du type de device
   */
  getDeviceTypeConfig(deviceType = 'light') {
    return this.deviceTypes[deviceType] || this.deviceTypes['light'];
  }

  /**
   * Applique la logique du type de device (inversion pour radiateurs)
   * @param {boolean} moduleState - État du module
   * @param {string} deviceType - Type de device
   * @returns {boolean} État logique final
   */
  applyDeviceLogic(moduleState, deviceType = 'light') {
    // Gérer les valeurs null/undefined
    if (moduleState === null || moduleState === undefined) {
      return moduleState;
    }

    const config = this.getDeviceTypeConfig(deviceType);

    if (config.invertLogic) {
      return !moduleState; // Inversion pour radiateurs
    }

    return moduleState; // Logique normale
  }

  /**
   * Détermine si la mesure d'énergie est supportée
   * @param {string} deviceType - Type de device
   * @returns {boolean} Supporté ou non
   */
  supportsEnergyMonitoring(deviceType = 'light') {
    const config = this.getDeviceTypeConfig(deviceType);
    return config.supportsEnergyMonitoring;
  }

  /**
   * Récupère la liste des types de devices disponibles pour l'interface
   * @returns {Array} Liste des options pour l'UI
   */
  getDeviceTypeOptions() {
    return Object.keys(this.deviceTypes).map(key => ({
      id: key,
      label: `${this.deviceTypes[key].icon} ${this.deviceTypes[key].name}`,
      description: this.deviceTypes[key].description
    }));
  }

  /**
   * Valide un type de device
   * @param {string} deviceType - Type à valider
   * @returns {boolean} Valide ou non
   */
  isValidDeviceType(deviceType) {
    return Object.keys(this.deviceTypes).includes(deviceType);
  }

  /**
   * Récupère l'icône pour un type de device
   * @param {string} deviceType - Type de device
   * @returns {string} Icône emoji
   */
  getDeviceIcon(deviceType = 'light') {
    // Si type inconnu, retourner icône par défaut
    if (!this.isValidDeviceType(deviceType)) {
      return '⚙️';
    }

    const config = this.getDeviceTypeConfig(deviceType);
    return config.icon;
  }

  /**
   * Génère les paramètres settings pour un driver
   * @returns {Object} Configuration des settings Homey
   */
  generateSettingsConfig() {
    return {
      type: 'group',
      label: {
        en: 'Device Type Configuration',
        fr: 'Configuration Type d\'Appareil'
      },
      children: [
        {
          id: 'device_type',
          type: 'dropdown',
          label: {
            en: 'Connected Device Type',
            fr: 'Type d\'Appareil Connecté'
          },
          hint: {
            en: 'Select the type of device connected to this module. Radiator will invert the ON/OFF logic.',
            fr: 'Sélectionnez le type d\'appareil connecté à ce module. Radiateur inversera la logique MARCHE/ARRÊT.'
          },
          value: 'light',
          values: this.getDeviceTypeOptions().map(option => ({
            id: option.id,
            label: {
              en: option.label,
              fr: option.label
            }
          }))
        },
        {
          id: 'invert_logic_manual',
          type: 'checkbox',
          label: {
            en: 'Manual Logic Inversion',
            fr: 'Inversion Logique Manuelle'
          },
          hint: {
            en: 'Force invert ON/OFF logic regardless of device type (advanced users only)',
            fr: 'Forcer l\'inversion de la logique MARCHE/ARRÊT indépendamment du type (utilisateurs avancés uniquement)'
          },
          value: false
        }
      ]
    };
  }
}

module.exports = DeviceTypeManager;
