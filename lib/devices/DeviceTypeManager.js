'use strict';

/**
 * 🏠 Device Type Manager
 * Gère les différents types d'appareils connectés aux modules de contrôle
 * Permet l'inversion logique pour radiateurs électriques et autres cas spéciaux
 */

class DeviceTypeManager {
  constructor() {
    this.deviceTypes = {
      // === ÉCLAIRAGE ===
      'light': {
        name: 'Éclairage',
        icon: '💡',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Ampoules, LED, éclairage standard'
      },

      // === CHAUFFAGE (avec inversion fil pilote) ===
      'radiator': {
        name: 'Radiateur électrique (fil pilote)',
        icon: '🔥',
        invertLogic: true,
        supportsEnergyMonitoring: false,
        description: 'Radiateur avec fil pilote, logique inversée'
      },
      'water_heater': {
        name: 'Chauffe-eau / Cumulus',
        icon: '🚿',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Ballon d\'eau chaude, cumulus électrique'
      },
      'boiler': {
        name: 'Chaudière',
        icon: '🏠',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Chaudière gaz/fioul, chauffage central'
      },
      'underfloor_heating': {
        name: 'Plancher chauffant',
        icon: '🦶',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Chauffage au sol électrique'
      },

      // === CLIMATISATION & VENTILATION ===
      'fan': {
        name: 'Ventilateur / VMC',
        icon: '🌀',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Ventilateur, aérateur, VMC'
      },
      'ac': {
        name: 'Climatisation',
        icon: '❄️',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Climatiseur, split, pompe à chaleur'
      },
      'extractor': {
        name: 'Extracteur / Hotte',
        icon: '💨',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Hotte aspirante, extracteur cuisine/salle de bain'
      },

      // === MOTORISATION ===
      'shutter': {
        name: 'Volet roulant / Store',
        icon: '🪟',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Volet roulant, store banne, rideau motorisé'
      },
      'gate': {
        name: 'Portail / Garage',
        icon: '🚗',
        invertLogic: false,
        supportsEnergyMonitoring: false,
        description: 'Motorisation portail, porte de garage'
      },
      'door_lock': {
        name: 'Gâche électrique / Serrure',
        icon: '🔐',
        invertLogic: false,
        supportsEnergyMonitoring: false,
        description: 'Gâche électrique, serrure connectée'
      },

      // === EAU & JARDIN ===
      'pump': {
        name: 'Pompe',
        icon: '💧',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Pompe piscine, pompe de relevage, circulation'
      },
      'irrigation': {
        name: 'Arrosage',
        icon: '🌱',
        invertLogic: false,
        supportsEnergyMonitoring: false,
        description: 'Système d\'arrosage automatique, électrovanne'
      },
      'pool': {
        name: 'Équipement piscine',
        icon: '🏊',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Pompe, filtration, éclairage piscine'
      },

      // === ÉLECTROMÉNAGER ===
      'socket': {
        name: 'Prise commandée',
        icon: '🔌',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Prise électrique générique'
      },
      'appliance': {
        name: 'Électroménager',
        icon: '🧺',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Machine à laver, sèche-linge, lave-vaisselle'
      },
      'coffee_machine': {
        name: 'Machine à café',
        icon: '☕',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Cafetière, machine expresso'
      },

      // === SÉCURITÉ ===
      'alarm': {
        name: 'Alarme / Sirène',
        icon: '🚨',
        invertLogic: false,
        supportsEnergyMonitoring: false,
        description: 'Sirène d\'alarme, système de sécurité'
      },
      'camera': {
        name: 'Caméra / Vidéosurveillance',
        icon: '📹',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Alimentation caméra de surveillance'
      },

      // === AUDIO/VIDÉO ===
      'tv': {
        name: 'TV / Écran',
        icon: '📺',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Télévision, moniteur, vidéoprojecteur'
      },
      'audio': {
        name: 'Audio / Hifi',
        icon: '🔊',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Ampli, enceintes, système audio'
      },

      // === EXTÉRIEUR ===
      'outdoor_light': {
        name: 'Éclairage extérieur',
        icon: '🏡',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Lampadaire, projecteur jardin, guirlande'
      },
      'fountain': {
        name: 'Fontaine / Cascade',
        icon: '⛲',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Fontaine décorative, cascade de jardin'
      },

      // === AUTRE ===
      'other': {
        name: 'Autre appareil',
        icon: '⚙️',
        invertLogic: false,
        supportsEnergyMonitoring: true,
        description: 'Appareil générique non listé'
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
