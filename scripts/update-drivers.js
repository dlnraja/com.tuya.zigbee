import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

// Obtenir le chemin du répertoire actuel en ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  // Dossiers
  DRIVERS_DIR: path.join(__dirname, '../drivers'),
  TEMPLATES_DIR: path.join(__dirname, '../templates'),
  LOGS_DIR: path.join(__dirname, '../logs'),
  
  // Sources de données externes
  SOURCES: {
    BLAKADDER: {
      url: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/devices/tuya.js',
      parser: 'blakadder'
    },
    Z2M: {
      url: 'https://raw.githubusercontent.com/Koenkk/zigbee2mqtt/master/devices/tuya.js',
      parser: 'z2m'
    },
    // Ajouter d'autres sources ici
  },
  
  // Paramètres de mise à jour
  UPDATE_INTERVAL_DAYS: 30,
  MAX_CONCURRENT_REQUESTS: 5,
  
  // Fichiers de logs
  LOG_FILE: path.join(__dirname, '../logs/driver-updates.log'),
  ERROR_FILE: path.join(__dirname, '../logs/update-errors.log')
};

// Types de capacités et leurs clusters associés
const CAPABILITY_CLUSTERS = {
  'onoff': ['genOnOff'],
  'dim': ['genLevelCtrl'],
  'measure_temperature': ['msTemperatureMeasurement'],
  'measure_humidity': ['msRelativeHumidity'],
  'measure_pressure': ['msPressureMeasurement'],
  'measure_battery': ['genPowerCfg'],
  'alarm_battery': ['genPowerCfg'],
  'measure_power': ['haElectricalMeasurement', 'seMetering'],
  'meter_power': ['seMetering'],
  'measure_voltage': ['haElectricalMeasurement'],
  'measure_current': ['haElectricalMeasurement'],
  'measure_co2': ['msCO2'],
  'measure_tvoc': ['msTVOC'],
  'measure_pm25': ['pm25Measurement'],
  'measure_pm10': ['pm10Measurement'],
  'alarm_contact': ['ssIasZone'],
  'alarm_motion': ['ssIasZone', 'msOccupancySensing'],
  'alarm_water_leak': ['ssIasZone'],
  'alarm_smoke': ['ssIasZone'],
  'alarm_fire': ['ssIasZone'],
  'alarm_tamper': ['ssIasZone'],
  'alarm_heat': ['ssIasZone'],
  'alarm_gas': ['ssIasZone'],
  'alarm_battery_low': ['genPowerCfg'],
  'button': ['genOnOff', 'genLevelCtrl', 'genMultistateInput']
};

// Traductions par défaut
const DEFAULT_TRANSLATIONS = {
  en: 'English',
  fr: 'Français',
  nl: 'Nederlands',
  ta: 'தமிழ்'
};

// Configuration des catégories de périphériques
const DEVICE_CATEGORIES = {
  'light': {
    name: {
      en: 'Light',
      fr: 'Lumière',
      nl: 'Lamp',
      ta: 'ஒளி'
    },
    icon: 'lightbulb',
    capabilities: ['onoff', 'dim', 'light_temperature', 'light_hue', 'light_saturation']
  },
  'switch': {
    name: {
      en: 'Switch',
      fr: 'Interrupteur',
      nl: 'Schakelaar',
      ta: 'சுவிட்ச்'
    },
    icon: 'toggle-on',
    capabilities: ['onoff']
  },
  'sensor': {
    name: {
      en: 'Sensor',
      fr: 'Capteur',
      nl: 'Sensor',
      ta: 'சென்சார்'
    },
    icon: 'sensor',
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_pressure']
  },
  'thermostat': {
    name: {
      en: 'Thermostat',
      fr: 'Thermostat',
      nl: 'Thermostaat',
      ta: 'தெர்மோஸ்டாட்'
    },
    icon: 'thermometer-half',
    capabilities: ['target_temperature', 'measure_temperature']
  },
  'lock': {
    name: {
      en: 'Lock',
      fr: 'Serrure',
      nl: 'Slot',
      ta: 'பூட்டு'
    },
    icon: 'lock',
    capabilities: ['locked', 'lock_mode']
  }
};

// Initialisation des dossiers
function initDirectories() {
  const dirs = [
    CONFIG.DRIVERS_DIR,
    CONFIG.TEMPLATES_DIR,
    CONFIG.LOGS_DIR,
    path.join(CONFIG.DRIVERS_DIR, '_common'),
    path.join(CONFIG.DRIVERS_DIR, '_common/assets'),
    path.join(CONFIG.DRIVERS_DIR, '_common/capabilities'),
    path.join(CONFIG.DRIVERS_DIR, '_common/clusters')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
}

// Initialisation des fichiers de logs
function initLogs() {
  if (!fs.existsSync(CONFIG.LOGS_DIR)) {
    fs.mkdirSync(CONFIG.LOGS_DIR, { recursive: true });
  }
  
  const logHeader = `=== Driver Update Log - ${new Date().toISOString()} ===\n`;
  
  if (!fs.existsSync(CONFIG.LOG_FILE)) {
    fs.writeFileSync(CONFIG.LOG_FILE, logHeader);
  } else {
    fs.appendFileSync(CONFIG.LOG_FILE, '\n' + logHeader);
  }
  
  if (!fs.existsSync(CONFIG.ERROR_FILE)) {
    fs.writeFileSync(CONFIG.ERROR_FILE, logHeader);
  } else {
    fs.appendFileSync(CONFIG.ERROR_FILE, '\n' + logHeader);
  }
}

// Fonction de log
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}\n`;
  
  // Écrire dans la console
  console[type === 'error' ? 'error' : 'log'](logMessage.trim());
  
  // Écrire dans le fichier de log approprié
  const logFile = type === 'error' ? CONFIG.ERROR_FILE : CONFIG.LOG_FILE;
  fs.appendFileSync(logFile, logMessage);
}

// Initialisation
console.log('Initialisation des dossiers...');
initDirectories();
console.log('Initialisation des logs...');
initLogs();
console.log('Démarrage du script...');

// Afficher la configuration
console.log('Configuration:', JSON.stringify(CONFIG, null, 2));

/**
 * Récupère les données d'une source externe
 * @param {string} sourceName - Nom de la source (BLAKADDER, Z2M, etc.)
 * @returns {Promise<Object>} Données de la source
 */
async function fetchSourceData(sourceName) {
  const source = CONFIG.SOURCES[sourceName];
  if (!source) {
    throw new Error(`Source inconnue: ${sourceName}`);
  }

  log(`Récupération des données depuis ${sourceName}...`);
  
  try {
    const response = await axios.get(source.url, {
      timeout: 30000, // 30 secondes de timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/vnd.github.v3.raw'
      }
    });
    
    log(`Données récupérées depuis ${sourceName} (${response.data.length} octets)`);
    return {
      name: sourceName,
      data: response.data,
      parser: source.parser
    };
  } catch (error) {
    log(`Erreur lors de la récupération de ${sourceName}: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Parse les données d'une source selon son type
 * @param {Object} sourceData - Données de la source
 * @returns {Array} Liste des appareils parsés
 */
function parseSourceData(sourceData) {
  const { name, data, parser } = sourceData;
  log(`Analyse des données de ${name} avec le parseur ${parser}...`);
  
  try {
    let devices = [];
    
    switch (parser) {
      case 'blakadder':
        devices = parseBlakadderData(data);
        break;
      case 'z2m':
        devices = parseZ2MData(data);
        break;
      default:
        log(`Parseur non supporté: ${parser}`, 'warn');
        return [];
    }
    
    log(`Analyse terminée pour ${name}: ${devices.length} appareils trouvés`);
    return devices;
  } catch (error) {
    log(`Erreur lors de l'analyse des données de ${name}: ${error.message}`, 'error');
    return [];
  }
}

/**
 * Parse les données au format Blakadder
 * @param {string} data - Données brutes
 * @returns {Array} Liste des appareils
 */
function parseBlakadderData(data) {
  const devices = [];
  
  try {
    // Extraction des définitions d'appareils (simplifiée)
    const deviceRegex = /{\s*zigbeeModel:\s*\[([^\]]+)\],\s*model:\s*'([^']+)',\s*description:\s*'([^']*)',/g;
    let match;
    
    while ((match = deviceRegex.exec(data)) !== null) {
      const models = match[1].split(',').map(m => m.trim().replace(/['"]/g, ''));
      const model = match[2];
      const description = match[3];
      
      devices.push({
        id: `blk_${models[0].toLowerCase()}`,
        models,
        model,
        description,
        source: 'blakadder',
        capabilities: extractCapabilities(data, match.index, 5000) // 5000 caractères de contexte
      });
    }
  } catch (error) {
    log(`Erreur lors de l'analyse des données Blakadder: ${error.message}`, 'error');
  }
  
  return devices;
}

/**
 * Parse les données au format Zigbee2MQTT
 * @param {string} data - Données brutes
 * @returns {Array} Liste des appareils
 */
function parseZ2MData(data) {
  const devices = [];
  
  try {
    // Extraction des définitions d'appareils (simplifiée)
    const deviceRegex = /{\s*zigbeeModel:\s*\[([^\]]+)\],\s*model:\s*'([^']+)',[^}]*description:\s*'([^']*)',/gs;
    let match;
    
    while ((match = deviceRegex.exec(data)) !== null) {
      const models = match[1].split(',').map(m => m.trim().replace(/['"]/g, ''));
      const model = match[2];
      const description = match[3];
      
      devices.push({
        id: `z2m_${models[0].toLowerCase()}`,
        models,
        model,
        description,
        source: 'z2m',
        capabilities: extractCapabilities(data, match.index, 5000) // 5000 caractères de contexte
      });
    }
  } catch (error) {
    log(`Erreur lors de l'analyse des données Zigbee2MQTT: ${error.message}`, 'error');
  }
  
  return devices;
}

/**
 * Extrait les capacités à partir du contexte
 * @param {string} data - Données brutes
 * @param {number} startIndex - Index de début
 * @param {number} length - Longueur du contexte
 * @returns {Array} Liste des capacités
 */
function extractCapabilities(data, startIndex, length) {
  const context = data.substring(startIndex, startIndex + length);
  const capabilities = [];
  
  // Recherche de modèles connus de capacités
  for (const [capability, clusters] of Object.entries(CAPABILITY_CLUSTERS)) {
    for (const cluster of clusters) {
      if (context.includes(`'${cluster}'`) || context.includes(`"${cluster}"`)) {
        if (!capabilities.includes(capability)) {
          capabilities.push(capability);
        }
      }
    }
  }
  
  return capabilities;
}

/**
 * Récupère et analyse toutes les sources configurées
 * @returns {Promise<Array>} Liste consolidée des appareils
 */
async function fetchAllSources() {
  const sources = Object.keys(CONFIG.SOURCES);
  const allDevices = [];
  
  log(`Récupération des données depuis ${sources.length} sources...`);
  
  // Limiter le nombre de requêtes concurrentes
  const batchSize = CONFIG.MAX_CONCURRENT_REQUESTS;
  for (let i = 0; i < sources.length; i += batchSize) {
    const batch = sources.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(source => fetchSourceData(source))
    );
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const devices = parseSourceData(result.value);
        allDevices.push(...devices);
      } else {
        log(`Erreur lors de la récupération d'une source: ${result.reason.message}`, 'error');
      }
    }
    
    // Pause entre les lots pour éviter le rate limiting
    if (i + batchSize < sources.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  log(`Récupération terminée: ${allDevices.length} appareils trouvés au total`);
  return allDevices;
}

/**
 * Compare les appareils avec les drivers existants et génère les mises à jour nécessaires
 * @param {Array} devices - Liste des appareils des sources externes
 * @returns {Object} Résultats de la comparaison
 */
function compareWithExistingDrivers(devices) {
  log('Comparaison avec les drivers existants...');
  
  const results = {
    newDevices: [],
    updatedDevices: [],
    upToDate: [],
    errors: []
  };
  
  try {
    // Parcourir tous les dossiers de drivers
    const driverDirs = fs.readdirSync(CONFIG.DRIVERS_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('_'))
      .map(dirent => dirent.name);
    
    // Parcourir les appareils des sources
    for (const device of devices) {
      try {
        const driverDir = driverDirs.find(dir => 
          dir.toLowerCase().includes(device.id.toLowerCase()) ||
          device.models.some(model => dir.toLowerCase().includes(model.toLowerCase()))
        );
        
        if (driverDir) {
          // Vérifier si une mise à jour est nécessaire
          const needsUpdate = checkIfUpdateNeeded(device, driverDir);
          if (needsUpdate) {
            results.updatedDevices.push({
              ...device,
              driverDir
            });
          } else {
            results.upToDate.push(device.id);
          }
        } else {
          // Nouvel appareil
          results.newDevices.push(device);
        }
      } catch (error) {
        results.errors.push({
          deviceId: device.id,
          error: error.message
        });
        log(`Erreur lors de la comparaison de l'appareil ${device.id}: ${error.message}`, 'error');
      }
    }
    
    log(`Comparaison terminée: ${results.newDevices.length} nouveaux, ${results.updatedDevices.length} mis à jour, ${results.upToDate.length} à jour`);
    return results;
  } catch (error) {
    log(`Erreur lors de la comparaison avec les drivers existants: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Vérifie si un driver nécessite une mise à jour
 * @param {Object} device - Données de l'appareil
 * @param {string} driverDir - Dossier du driver
 * @returns {boolean} True si une mise à jour est nécessaire
 */
function checkIfUpdateNeeded(device, driverDir) {
  const driverPath = path.join(CONFIG.DRIVERS_DIR, driverDir);
  const driverFiles = fs.readdirSync(driverPath);
  
  // Vérifier le fichier driver.compose.json
  const composeFile = driverFiles.find(f => f === 'driver.compose.json');
  if (composeFile) {
    const composePath = path.join(driverPath, composeFile);
    const composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    // Vérifier si des capacités ont été ajoutées
    const currentCapabilities = composeData.capabilities || [];
    const newCapabilities = device.capabilities.filter(cap => !currentCapabilities.includes(cap));
    
    if (newCapabilities.length > 0) {
      log(`Nouvelles capacités détectées pour ${device.id}: ${newCapabilities.join(', ')}`, 'info');
      return true;
    }
  }
  
  // Vérifier le fichier device.js
  const deviceFile = driverFiles.find(f => f === 'device.js');
  if (deviceFile) {
    const devicePath = path.join(driverPath, deviceFile);
    const deviceCode = fs.readFileSync(devicePath, 'utf8');
    
    // Vérifier si le code gère toutes les capacités
    for (const cap of device.capabilities) {
      if (!deviceCode.includes(`this.registerCapability('${cap}'`)) {
        log(`Capacité manquante dans le code pour ${device.id}: ${cap}`, 'info');
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Génère le code source d'un nouveau driver
 * @param {Object} device - Données de l'appareil
 * @returns {string} Code source du driver
 */
function generateDriverCode(device) {
  const className = device.model.replace(/[^a-zA-Z0-9]/g, '_') + 'Device';
  const capabilities = device.capabilities || [];
  
  // Générer les appels registerCapability
  const capabilityRegistrations = capabilities.map(cap => {
    return `    this.registerCapability('${cap}', '${getCapabilityType(cap)}');`;
  }).join('\n');
  
  // Générer les méthodes pour chaque capacité
  const capabilityMethods = capabilities.map(cap => {
    const methodName = `on${cap.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')}`;
    return `
  async ${methodName}(value, opts = {}) {
    this.log('${methodName} called with', value, opts);
    // Implémentez la logique pour ${cap} ici
    
    // Exemple pour on/off
    ${cap === 'onoff' ? `
    const command = value ? 'on' : 'off';
    await this.sendCommand('onoff', command);
    ` : ''}
    
    return Promise.resolve();
  }`;
  }).join('\n');
  
  // Générer les méthodes de commande
  const commandMethods = `
  /**
   * Envoie une commande à l'appareil
   * @param {string} command - Commande à envoyer
   * @param {*} value - Valeur de la commande
   * @returns {Promise} Promesse résolue lorsque la commande est envoyée
   */
  async sendCommand(command, value) {
    this.log('Sending command:', command, value);
    // Implémentez l'envoi de commande ici
    
    // Exemple avec l'API Homey
    try {
      const result = await this.homey.zigbee.sendCommand({
        device: this,
        node: this.node,
        cid: 'genOnOff',
        cmd: 'toggle',
        payload: {},
        cmdType: 'functional'
      });
      
      this.log('Command result:', result);
      return result;
    } catch (error) {
      this.error('Command failed:', error);
      throw error;
    }
  }
  
  /**
   * Met à jour l'état de l'appareil
   * @param {Object} state - État de l'appareil
   */
  async updateState(state) {
    this.log('Updating device state:', state);
    
    // Mettre à jour les capacités en fonction de l'état
    for (const [key, value] of Object.entries(state)) {
      if (this.hasCapability(key)) {
        await this.setCapabilityValue(key, value).catch(this.error);
      }
    }
  }`;
  
  // Générer le code complet du driver
  const driverCode = `// Driver for ${device.model} (${device.description || 'No description'})
// Source: ${device.source}
// Generated: ${new Date().toISOString()}

const Homey = require('homey');

class ${className} extends Homey.Device {
  
  /**
   * Initialisation du périphérique
   */
  async onInit() {
    this.log('${className} initialized');
    
    // Enregistrement des capacités
${capabilityRegistrations}
    
    // Configuration des paramètres
    this.registerSettings();
    
    // Vérification de la connexion
    await this.checkConnection();
    
    // Mise à jour initiale de l'état
    await this.syncState();
  }
  
  /**
   * Configuration des paramètres du périphérique
   */
  registerSettings() {
    // Exemple de configuration de paramètres
    this.registerSetting('poll_interval', (value) => {
      return Math.max(30, Math.min(3600, parseInt(value) || 300));
    });
  }
  
  /**
   * Vérifie la connexion avec le périphérique
   */
  async checkConnection() {
    try {
      // Implémentez la vérification de connexion ici
      this.setAvailable().catch(this.error);
      return true;
    } catch (error) {
      this.setUnavailable('Could not connect to device').catch(this.error);
      return false;
    }
  }
  
  /**
   * Synchronise l'état du périphérique
   */
  async syncState() {
    try {
      // Implémentez la récupération de l'état ici
      const state = await this.getDeviceState();
      await this.updateState(state);
      
      // Planifier la prochaine mise à jour
      const pollInterval = this.getSetting('poll_interval') || 300;
      this.syncTimeout = setTimeout(() => this.syncState(), pollInterval * 1000);
    } catch (error) {
      this.error('Failed to sync device state:', error);
      this.setUnavailable('Failed to sync device state').catch(this.error);
    }
  }
  
  /**
   * Récupère l'état actuel du périphérique
   * @returns {Promise<Object>} État du périphérique
   */
  async getDeviceState() {
    // Implémentez la récupération de l'état ici
    return {};
  }
  
  /**
   * Nettoyage lors de la suppression du périphérique
   */
  async onDeleted() {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    this.log('${className} removed');
  }
  
  // Méthodes de capacité
${capabilityMethods}
  
  // Méthodes utilitaires
${commandMethods}
}

module.exports = ${className};`;
  
  return driverCode;
}

/**
 * Génère un fichier driver.compose.json pour un appareil
 * @param {Object} device - Données de l'appareil
 * @returns {Object} Objet de configuration du driver
 */
function generateDriverConfig(device) {
  const driverId = device.model.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const category = getDeviceCategory(device);
  
  return {
    id: driverId,
    name: {
      en: device.model,
      fr: device.model,
      nl: device.model,
      ta: device.model
    },
    class: category,
    capabilities: device.capabilities || [],
    capabilitiesOptions: {},
    images: {
      large: `drivers/${driverId}/assets/images/large.png`,
      small: `drivers/${driverId}/assets/images/small.png`
    },
    pair: [
      {
        id: 'list_devices',
        template: 'list_devices',
        options: {
          title: {
            en: 'Select your device',
            fr: 'Sélectionnez votre appareil',
            nl: 'Selecteer uw apparaat',
            ta: 'உங்கள் சாதனத்தைத் தேர்ந்தெடுக்கவும்'
          },
          getDevices: true
        }
      }
    ],
    settings: [
      {
        id: 'poll_interval',
        type: 'number',
        label: {
          en: 'Polling interval (seconds)',
          fr: 'Intervalle de mise à jour (secondes)',
          nl: 'Polling interval (seconden)',
          ta: 'போலிங் இடைவெளி (விநாடிகள்)'
        },
        value: 300,
        hint: {
          en: 'How often to check the device status (min 30, max 3600)',
          fr: 'Fréquence de vérification de l\'état (min 30, max 3600)',
          nl: 'Hoe vaak de apparaatstatus moet worden gecontroleerd (min 30, max 3600)',
          ta: 'சாதன நிலையை எத்தனை முறை சரிபார்க்க வேண்டும் (குறைந்தது 30, அதிகபட்சம் 3600)'
        }
      }
    ]
  };
}

/**
 * Détermine la catégorie d'un appareil
 * @param {Object} device - Données de l'appareil
 * @returns {string} Catégorie de l'appareil
 */
function getDeviceCategory(device) {
  const capabilities = device.capabilities || [];
  
  // Déterminer la catégorie en fonction des capacités
  if (capabilities.includes('onoff') && capabilities.includes('dim')) {
    return 'light';
  } else if (capabilities.includes('onoff')) {
    return 'switch';
  } else if (capabilities.some(cap => cap.startsWith('measure_'))) {
    return 'sensor';
  } else if (capabilities.includes('target_temperature')) {
    return 'thermostat';
  } else if (capabilities.includes('locked')) {
    return 'lock';
  }
  
  return 'other';
}

/**
 * Obtient le type de capacité pour l'enregistrement
 * @param {string} capability - Nom de la capacité
 * @returns {string} Type de capacité
 */
function getCapabilityType(capability) {
  // Mappage des capacités vers leurs types
  const capabilityTypes = {
    'onoff': 'boolean',
    'dim': 'number',
    'measure_temperature': 'number',
    'measure_humidity': 'number',
    'measure_pressure': 'number',
    'measure_battery': 'number',
    'alarm_battery': 'boolean',
    'measure_power': 'number',
    'meter_power': 'number',
    'measure_voltage': 'number',
    'measure_current': 'number',
    'measure_co2': 'number',
    'measure_tvoc': 'number',
    'measure_pm25': 'number',
    'measure_pm10': 'number',
    'alarm_contact': 'boolean',
    'alarm_motion': 'boolean',
    'alarm_water_leak': 'boolean',
    'alarm_smoke': 'boolean',
    'alarm_fire': 'boolean',
    'alarm_tamper': 'boolean',
    'alarm_heat': 'boolean',
    'alarm_gas': 'boolean',
    'target_temperature': 'number',
    'locked': 'boolean',
    'lock_mode': 'string'
  };
  
  return capabilityTypes[capability] || 'string';
}

/**
 * Crée ou met à jour un driver pour un appareil
 * @param {Object} device - Données de l'appareil
 * @param {string} driverDir - Dossier du driver (optionnel pour la mise à jour)
 * @returns {Promise<Object>} Résultat de l'opération
 */
async function createOrUpdateDriver(device, driverDir = null) {
  const driverId = device.model.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const driverPath = driverDir 
    ? path.join(CONFIG.DRIVERS_DIR, driverDir)
    : path.join(CONFIG.DRIVERS_DIR, driverId);
  
  try {
    // Créer le dossier du driver s'il n'existe pas
    if (!fs.existsSync(driverPath)) {
      fs.mkdirSync(driverPath, { recursive: true });
      log(`Dossier du driver créé: ${driverPath}`);
    }
    
    // Créer le fichier device.js
    const deviceCode = generateDriverCode(device);
    fs.writeFileSync(path.join(driverPath, 'device.js'), deviceCode);
    
    // Créer le fichier driver.compose.json
    const driverConfig = generateDriverConfig(device);
    fs.writeFileSync(
      path.join(driverPath, 'driver.compose.json'),
      JSON.stringify(driverConfig, null, 2)
    );
    
    // Créer les dossiers pour les assets
    const assetsPath = path.join(driverPath, 'assets');
    if (!fs.existsSync(assetsPath)) {
      fs.mkdirSync(assetsPath, { recursive: true });
      fs.mkdirSync(path.join(assetsPath, 'images'), { recursive: true });
      
      // Copier les images par défaut si elles existent
      const defaultImage = path.join(CONFIG.TEMPLATES_DIR, 'default-device.png');
      if (fs.existsSync(defaultImage)) {
        fs.copyFileSync(
          defaultImage,
          path.join(assetsPath, 'images', 'large.png')
        );
        fs.copyFileSync(
          defaultImage,
          path.join(assetsPath, 'images', 'small.png')
        );
      }
    }
    
    return {
      success: true,
      driverId,
      path: driverPath,
      message: driverDir ? 'Driver mis à jour avec succès' : 'Nouveau driver créé avec succès'
    };
  } catch (error) {
    log(`Erreur lors de la création/mise à jour du driver: ${error.message}`, 'error');
    return {
      success: false,
      driverId,
      error: error.message
    };
  }
}

/**
 * Fonction principale
 */
async function main() {
  try {
    log('Démarrage de la mise à jour des drivers...');
    
    // 1. Récupérer les données des sources externes
    const devices = await fetchAllSources();
    
    if (devices.length === 0) {
      log('Aucun appareil trouvé dans les sources', 'warn');
      return;
    }
    
    // 2. Comparer avec les drivers existants
    const comparison = compareWithExistingDrivers(devices);
    
    // 3. Traiter les nouveaux appareils
    if (comparison.newDevices.length > 0) {
      log(`Création de ${comparison.newDevices.length} nouveaux drivers...`);
      
      for (const device of comparison.newDevices) {
        try {
          const result = await createOrUpdateDriver(device);
          if (result.success) {
            log(`✅ Driver créé: ${device.model} (${result.driverId})`);
          } else {
            log(`❌ Échec de la création du driver ${device.model}: ${result.error}`, 'error');
          }
        } catch (error) {
          log(`❌ Erreur lors de la création du driver ${device.model}: ${error.message}`, 'error');
        }
      }
    }
    
    // 4. Mettre à jour les drivers existants
    if (comparison.updatedDevices.length > 0) {
      log(`Mise à jour de ${comparison.updatedDevices.length} drivers...`);
      
      for (const device of comparison.updatedDevices) {
        try {
          const result = await createOrUpdateDriver(device, device.driverDir);
          if (result.success) {
            log(`✅ Driver mis à jour: ${device.model} (${result.driverId})`);
          } else {
            log(`❌ Échec de la mise à jour du driver ${device.model}: ${result.error}`, 'error');
          }
        } catch (error) {
          log(`❌ Erreur lors de la mise à jour du driver ${device.model}: ${error.message}`, 'error');
        }
      }
    }
    
    // 5. Générer un rapport
    const report = {
      timestamp: new Date().toISOString(),
      newDevices: comparison.newDevices.length,
      updatedDevices: comparison.updatedDevices.length,
      upToDate: comparison.upToDate.length,
      errors: comparison.errors.length
    };
    
    log('\n=== RAPPORT DE MISE À JOUR ===');
    log(`- Nouveaux appareils: ${report.newDevices}`);
    log(`- Appareils mis à jour: ${report.updatedDevices}`);
    log(`- Appareils à jour: ${report.upToDate}`);
    log(`- Erreurs: ${report.errors}`);
    log('===========================\n');
    
    // Enregistrer le rapport
    const reportPath = path.join(CONFIG.LOGS_DIR, 'update-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`Rapport enregistré dans ${reportPath}`);
    
    log('Mise à jour des drivers terminée avec succès!');
    
  } catch (error) {
    log(`ERREUR: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Exporter la fonction main pour pouvoir l'importer depuis d'autres modules
export { main };

// Démarrer le processus si exécuté directement
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    log(`ERREUR NON GÉRÉE: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  });
}
