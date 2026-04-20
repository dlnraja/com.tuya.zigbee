'use strict';
const { safeDivide } = require('../utils/tuyaUtils.js');

/**
 *  Device Type Manager
 * GÃ¨re les diffÃ©rents types d'appareils connectÃ©s aux modules de contrÃ´le
 * Permet l'inversion logique pour radiateurs Ã©lectriques et autres cas spÃ©ciaux
 */

class DeviceTypeManager {
  constructor() {
    this.deviceTypes = {
      // === Ã‰CLAIRAGE ===
      'light': {
        name: 'Ã‰clairage',
        icon: '',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Ampoules, LED, Ã©clairage standard'
      },

      // === CHAUFFAGE (avec inversion fil pilote) ===
      'radiator': {
        name: 'Radiateur Ã©lectrique (fil pilote)',
        icon: '',
        invertLogic: true,
        supportsEnergyMonitoring: false,
        description: 'Radiateur avec fil pilote, logique inversÃ©e'
      },
      'water_heater': {
        name: 'Chauffe-eau/Cumulus',
        icon: '',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Ballon d\'eau chaude, cumulus Ã©lectrique'
      },
      'boiler': {
        name: 'ChaudiÃ¨re',
        icon: '',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'ChaudiÃ¨re gaz/fioul, chauffage central'
      },
      'underfloor_heating': {
        name: 'Plancher chauffant',
        icon: '',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Chauffage au sol Ã©lectrique'
      },

      // === CLIMATISATION & VENTILATION ===
      'fan': {
        name: 'Ventilateur / VMC',
        icon: '',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Ventilateur, aÃ©rateur, VMC'
      },
      'ac': {
        name: 'Climatisation',
        icon: '',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Climatiseur, split, pompe Ã chaleur'
      },
      'extractor': {
        name: 'Extracteur / Hotte',
        icon: '',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Hotte aspirante, extracteur cuisine/salle de bain'
      },

      // === MOTORISATION ===
      'shutter': {
        name: 'Volet roulant/Store',
        icon: '',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Volet roulant, store banne, rideau motorisÃ©'
      },
      'gate': {
        name: 'Portail / Garage',
        icon: '',
        invertLogic: false,
        supportsEnergyMonitoring: false,
        description: 'Motorisation portail, porte de garage'
      },
      'door_lock': {
        name: 'GÃ¢che Ã©lectrique/Serrure',
        icon: '',
        invertLogic: false,
        supportsEnergyMonitoring: false,
        description: 'GÃ¢che Ã©lectrique, serrure connectÃ©e'
      },

      // === EAU & JARDIN ===
      'pump': {
        name: 'Pompe',
        icon: '',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Pompe piscine, pompe de relevage, circulation'
      },
      'irrigation': {
        name: 'Arrosage',
        icon: '',
        invertLogic: false,
        supportsEnergyMonitoring: false,
        description: 'SystÃ¨me d\'arrosage automatique, Ã©lectrovanne'
      },
      'pool': {
        name: 'Ã‰quipement piscine',
        icon: '',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Pompe, filtration, Ã©clairage piscine'
      },

      // === Ã‰LECTROMÃ‰NAGER ===
      'socket': {
        name: 'Prise commandÃ©e',
        icon: '',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Prise Ã©lectrique gÃ©nÃ©rique'
      },
      'appliance': {
        name: 'Ã‰lectromÃ©nager',
        icon: '',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Machine Ã laver, sÃ¨che-linge, lave-vaisselle'
      },
      'coffee_machine': {
        name: 'Machine Ã cafÃ©',
        icon: '',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'CafetiÃ¨re, machine expresso'
      },

      // === SÃ‰CURITÃ‰ ===
      'alarm': {
        name: 'Alarme / SirÃ¨ne',
        icon: '',
        invertLogic: false,
        supportsEnergyMonitoring: false,
        description: 'SirÃ¨ne d\'alarme, systÃ¨me de sÃ©curitÃ©'
      },
      'camera': {
        name: 'CamÃ©ra/VidÃ©osurveillance',
        icon: '',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Alimentation camÃ©ra de surveillance'
      },

      // === AUDIO/VIDÃ‰O ===
      'tv': {
        name: 'TV / Ã‰cran',
        icon: '',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'TÃ©lÃ©vision, moniteur, vidÃ©oprojecteur'
      },
      'audio': {
        name: 'Audio / Hifi',
        icon: '',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Ampli, enceintes, systÃ¨me audio'
      },

      // === EXTÃ‰RIEUR ===
      'outdoor_light': {
        name: 'Ã‰clairage extÃ©rieur',
        icon: '',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Lampadaire, projecteur jardin, guirlande'
      },
      'fountain': {
        name: 'Fontaine / Cascade',
        icon: '',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Fontaine dÃ©corative, cascade de jardin'
      },

      // === AUTRE ===
      'other': {
        name: 'Autre appareil',
        icon: '',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Appareil gÃ©nÃ©rique non listÃ©'
      }
    };
  }

  /**
   * RÃ©cupÃ¨re la configuration pour un type de device
   * @param {string} deviceType - Type de device ('light', 'radiator', 'fan', 'other')
   * @returns {object} Configuration du type de device
   */
  getDeviceTypeConfig(deviceType = 'light') {
    return this.deviceTypes[deviceType] || this.deviceTypes['light'];
  }

  /**
   * Applique la logique du type de device (inversion pour radiateurs)
   * @param {boolean} moduleState - Ã‰tat du module
   * @param {string} deviceType - Type de device
   * @returns {boolean} Ã‰tat logique final
   */
  applyDeviceLogic(moduleState, deviceType = 'light') {
    // GÃ©rer les valeurs null/undefined
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
   * DÃ©termine si la mesure d'Ã©nergie est supportÃ©e
   * @param {string} deviceType - Type de device
   * @returns {boolean} SupportÃ© ou non
   */
  supportsEnergyMonitoring(deviceType = 'light') {
    const config = this.getDeviceTypeConfig(deviceType);
    return config.supportsEnergyMonitoring;
  }

  /**
   * RÃ©cupÃ¨re la liste des types de devices disponibles pour l'interface
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
   * @param {string} deviceType - Type Ã valider
   * @returns {boolean} Valide ou non
   */
  isValidDeviceType(deviceType) {
    return Object.keys(this.deviceTypes).includes(deviceType);
  }

  /**
   * RÃ©cupÃ¨re l'icÃ´ne pour un type de device
   * @param {string} deviceType - Type de device
   * @returns {string} IcÃ´ne emoji
   */
  getDeviceIcon(deviceType = 'light') {
    // Si type inconnu, retourner icÃ´ne par dÃ©faut
    if (!this.isValidDeviceType(deviceType)) {
      return '';
    }

    const config = this.getDeviceTypeConfig(deviceType);
    return config.icon;
  }

  /**
   * GÃ©nÃ¨re les paramÃ¨tres settings pour un driver
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
            fr: 'Type d\'Appareil ConnectÃ©'
          },
          hint: {
            en: 'Select the type of device connected to this module. Radiator will invert the ON/OFF logic.',
            fr: 'SÃ©lectionnez le type d\'appareil connectÃ© Ã ce module. Radiateur inversera la logique MARCHE/ARRÃŠT.'
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
            fr: 'Forcer l\'inversion de la logique MARCHE/ARRÃŠT indÃ©pendamment du type (utilisateurs avancÃ©s uniquement)'
          },
          value: false
        }
      ]
    };
  }
}

module.exports = DeviceTypeManager;
