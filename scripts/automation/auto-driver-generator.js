/**
 * AUTO DRIVER GENERATOR
 * 
 * Système automatisé pour convertir interviews forum/GitHub en drivers fonctionnels
 * Sources: Forum Homey, GitHub Issues, GitHub PRs, diagnostics utilisateurs
 */

const fs = require('fs').promises;
const path = require('path');

// Base de données des datapoints Tuya connus
const TUYA_DATAPOINTS_DB = require('../parsers/tuya-datapoints-database');

class AutoDriverGenerator {

  /**
   * Point d'entrée principal
   * @param {Object} input - Interview/Issue/PR data
   */
  static async generateDriverFromInput(input) {
    console.log('🤖 AUTO DRIVER GENERATOR - Starting...');
    console.log('Input type:', input.type); // 'forum', 'github_issue', 'github_pr', 'diagnostic'
    
    try {
      // 1. Extraire les informations device
      const deviceInfo = await this.extractDeviceInfo(input);
      console.log('✅ Device info extracted:', deviceInfo.manufacturerId, deviceInfo.modelId);
      
      // 2. Détecter le type de device et capabilities
      const deviceType = await this.detectDeviceType(deviceInfo);
      console.log('✅ Device type detected:', deviceType);
      
      // 3. Identifier les clusters et datapoints
      const zigbeeInfo = await this.analyzeZigbeeStructure(deviceInfo);
      console.log('✅ Zigbee structure analyzed:', Object.keys(zigbeeInfo.clusters).length, 'clusters');
      
      // 4. Générer le driver complet
      const driverPath = await this.generateDriver(deviceInfo, deviceType, zigbeeInfo);
      console.log('✅ Driver generated at:', driverPath);
      
      // 5. Intégrer dans la structure existante
      await this.integrateDriver(driverPath, deviceInfo);
      console.log('✅ Driver integrated successfully');
      
      // 6. Générer les tests
      await this.generateDriverTests(driverPath, deviceInfo);
      console.log('✅ Tests generated');
      
      return {
        success: true,
        driverPath,
        deviceInfo,
        message: `Driver créé avec succès pour ${deviceInfo.manufacturerId}/${deviceInfo.modelId}`
      };
      
    } catch (error) {
      console.error('❌ Driver generation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extraire informations device depuis input (forum/GitHub/diagnostic)
   */
  static async extractDeviceInfo(input) {
    const deviceInfo = {
      manufacturerId: null,
      modelId: null,
      productId: null,
      clusters: [],
      capabilities: [],
      endpoints: {},
      powerSource: 'unknown',
      customDatapoints: {},
      rawData: input.content
    };

    // Pattern matching pour manufacturer ID
    const mfrPattern = /"manufacturerName"\s*:\s*"([^"]+)"/gi;
    const mfrMatch = mfrPattern.exec(input.content);
    if (mfrMatch) {
      deviceInfo.manufacturerId = mfrMatch[1];
    }

    // Pattern matching pour model ID
    const modelPattern = /"modelId"\s*:\s*"([^"]+)"/gi;
    const modelMatch = modelPattern.exec(input.content);
    if (modelMatch) {
      deviceInfo.modelId = modelMatch[1];
    }

    // Extraire clusters
    const clustersPattern = /"inputClusters"\s*:\s*\[([^\]]+)\]/gi;
    const clustersMatch = clustersPattern.exec(input.content);
    if (clustersMatch) {
      const clusterIds = clustersMatch[1].split(',').map(c => parseInt(c.trim()));
      deviceInfo.clusters = clusterIds;
    }

    // Extraire powerSource
    const powerPattern = /"powerSource"\s*:\s*"([^"]+)"/gi;
    const powerMatch = powerPattern.exec(input.content);
    if (powerMatch) {
      deviceInfo.powerSource = powerMatch[1];
    }

    // Extraire endpoints structure complète
    const endpointsPattern = /"endpoints"\s*:\s*{([^}]+)}/gi;
    const endpointsMatch = endpointsPattern.exec(input.content);
    if (endpointsMatch) {
      try {
        // Parse endpoint structure (simplifié)
        deviceInfo.endpoints = this.parseEndpoints(input.content);
      } catch (e) {
        console.warn('Could not parse endpoints:', e.message);
      }
    }

    // Si Tuya cluster présent (61184 / 0xEF00), extraire datapoints
    if (deviceInfo.clusters.includes(61184)) {
      deviceInfo.customDatapoints = await this.extractTuyaDatapoints(input.content);
      deviceInfo.isTuyaDevice = true;
    }

    return deviceInfo;
  }

  /**
   * Détecter type de device et capabilities nécessaires
   */
  static async detectDeviceType(deviceInfo) {
    const { clusters, modelId, manufacturerId, customDatapoints } = deviceInfo;
    
    // Analyse basée sur clusters
    const hasMotion = clusters.includes(1030); // occupancySensing
    const hasTemp = clusters.includes(1026); // temperatureMeasurement
    const hasHumidity = clusters.includes(1029); // relativeHumidity
    const hasIlluminance = clusters.includes(1024); // illuminanceMeasurement
    const hasIASZone = clusters.includes(1280); // iasZone
    const hasPowerConfig = clusters.includes(1); // powerConfiguration
    const hasOnOff = clusters.includes(6); // onOff
    const hasTuyaCluster = clusters.includes(61184); // Tuya 0xEF00

    // Détection intelligente
    if (modelId === 'TS0601' && hasTuyaCluster) {
      // Device Tuya propriétaire - analyse datapoints
      if (customDatapoints[1] || customDatapoints[13]) {
        return {
          type: 'gas_sensor_ts0601',
          class: 'sensor',
          capabilities: ['alarm_co', 'alarm_smoke']
        };
      }
      if (customDatapoints[101] || customDatapoints[102]) {
        return {
          type: 'motion_sensor_ts0601',
          class: 'sensor',
          capabilities: ['alarm_motion', 'measure_temperature', 'measure_humidity']
        };
      }
    }

    // Multi-sensor (motion + temp + humidity + lux)
    if (hasMotion && hasTemp && hasHumidity && hasIlluminance) {
      return {
        type: 'motion_temp_humidity_illumination_multi_battery',
        class: 'sensor',
        capabilities: ['alarm_motion', 'measure_temperature', 'measure_humidity', 'measure_luminance', 'measure_battery']
      };
    }

    // Gas sensor (IAS Zone type 21/22/23)
    if (hasIASZone && !hasMotion) {
      return {
        type: 'gas_sensor_ias_zone',
        class: 'sensor',
        capabilities: ['alarm_co', 'alarm_smoke', 'measure_battery']
      };
    }

    // SOS button (IAS Zone type 21 + battery)
    if (hasIASZone && hasPowerConfig && !hasMotion) {
      return {
        type: 'sos_emergency_button_cr2032',
        class: 'sensor',
        capabilities: ['alarm_generic', 'measure_battery']
      };
    }

    // Contact sensor
    if (hasIASZone && hasPowerConfig) {
      return {
        type: 'contact_sensor_battery',
        class: 'sensor',
        capabilities: ['alarm_contact', 'measure_battery']
      };
    }

    // Smart plug
    if (hasOnOff && clusters.includes(2820)) { // electrical measurement
      return {
        type: 'smart_plug_energy_monitoring',
        class: 'socket',
        capabilities: ['onoff', 'measure_power', 'meter_power']
      };
    }

    // Default: sensor générique
    return {
      type: 'generic_zigbee_sensor',
      class: 'sensor',
      capabilities: this.inferCapabilities(clusters)
    };
  }

  /**
   * Inférer capabilities depuis clusters
   */
  static inferCapabilities(clusters) {
    const caps = [];
    
    if (clusters.includes(6)) caps.push('onoff');
    if (clusters.includes(8)) caps.push('dim');
    if (clusters.includes(1)) caps.push('measure_battery');
    if (clusters.includes(1026)) caps.push('measure_temperature');
    if (clusters.includes(1029)) caps.push('measure_humidity');
    if (clusters.includes(1024)) caps.push('measure_luminance');
    if (clusters.includes(1030)) caps.push('alarm_motion');
    if (clusters.includes(1280)) caps.push('alarm_contact');
    if (clusters.includes(2820)) caps.push('measure_power');
    
    return caps;
  }

  /**
   * Analyser structure Zigbee complète
   */
  static async analyzeZigbeeStructure(deviceInfo) {
    const structure = {
      clusters: {},
      bindings: {},
      reporting: {},
      commands: {}
    };

    // Pour chaque cluster, définir configuration
    for (const clusterId of deviceInfo.clusters) {
      structure.clusters[clusterId] = {
        id: clusterId,
        name: this.getClusterName(clusterId),
        attributes: await this.getClusterAttributes(clusterId),
        commands: await this.getClusterCommands(clusterId)
      };
    }

    return structure;
  }

  /**
   * Obtenir nom de cluster
   */
  static getClusterName(clusterId) {
    const CLUSTER_NAMES = {
      0: 'basic',
      1: 'powerConfiguration',
      3: 'identify',
      4: 'groups',
      5: 'scenes',
      6: 'onOff',
      8: 'levelControl',
      1024: 'illuminanceMeasurement',
      1026: 'temperatureMeasurement',
      1029: 'relativeHumidity',
      1030: 'occupancySensing',
      1280: 'iasZone',
      2820: 'electricalMeasurement',
      61184: 'tuya' // 0xEF00
    };
    
    return CLUSTER_NAMES[clusterId] || `cluster_${clusterId}`;
  }

  /**
   * Obtenir attributs cluster
   */
  static async getClusterAttributes(clusterId) {
    // Base de données attributs cluster
    const ATTRIBUTES = {
      1: ['batteryPercentageRemaining', 'batteryVoltage'],
      1026: ['measuredValue', 'minMeasuredValue', 'maxMeasuredValue'],
      1029: ['measuredValue', 'minMeasuredValue', 'maxMeasuredValue'],
      1024: ['measuredValue', 'lightSensorType'],
      1030: ['occupancy', 'occupancySensorType'],
      1280: ['zoneState', 'zoneType', 'zoneStatus', 'iasCIEAddress']
    };
    
    return ATTRIBUTES[clusterId] || [];
  }

  /**
   * Obtenir commandes cluster
   */
  static async getClusterCommands(clusterId) {
    const COMMANDS = {
      6: ['on', 'off', 'toggle'],
      8: ['moveToLevel', 'move', 'stop'],
      1280: ['enrollResponse']
    };
    
    return COMMANDS[clusterId] || [];
  }

  /**
   * Extraire datapoints Tuya depuis diagnostic
   */
  static async extractTuyaDatapoints(content) {
    const datapoints = {};
    
    // Pattern pour datapoints dans logs
    const dpPattern = /DP\s*(\d+)\s*[=:]\s*([^\s,;]+)/gi;
    let match;
    
    while ((match = dpPattern.exec(content)) !== null) {
      const dpId = parseInt(match[1]);
      const value = match[2];
      datapoints[dpId] = value;
    }
    
    // Pattern alternatif pour JSON datapoints
    const jsonPattern = /"dataPoints"\s*:\s*{([^}]+)}/gi;
    const jsonMatch = jsonPattern.exec(content);
    if (jsonMatch) {
      try {
        const pairs = jsonMatch[1].split(',');
        pairs.forEach(pair => {
          const [key, val] = pair.split(':').map(s => s.trim().replace(/"/g, ''));
          datapoints[parseInt(key)] = val;
        });
      } catch (e) {
        console.warn('Could not parse JSON datapoints:', e.message);
      }
    }
    
    return datapoints;
  }

  /**
   * Parse endpoints structure
   */
  static parseEndpoints(content) {
    const endpoints = {};
    
    // Extraire endpoint 1 (principal)
    const ep1Pattern = /"1"\s*:\s*{[^}]*"clusters"\s*:\s*{([^}]+)}/gi;
    const ep1Match = ep1Pattern.exec(content);
    if (ep1Match) {
      endpoints['1'] = {
        clusters: []
      };
    }
    
    return endpoints;
  }

  /**
   * Générer driver complet
   */
  static async generateDriver(deviceInfo, deviceType, zigbeeInfo) {
    const driverName = this.generateDriverName(deviceInfo, deviceType);
    const driverPath = path.join(__dirname, '../../drivers', driverName);
    
    // Créer dossier driver
    await fs.mkdir(driverPath, { recursive: true });
    await fs.mkdir(path.join(driverPath, 'assets/images'), { recursive: true });
    
    // Générer fichiers
    await this.generateDriverCompose(driverPath, deviceInfo, deviceType, zigbeeInfo);
    await this.generateDeviceJS(driverPath, deviceInfo, deviceType, zigbeeInfo);
    await this.generateDriverJS(driverPath, deviceInfo, deviceType);
    await this.generateAssets(driverPath, deviceType);
    
    return driverPath;
  }

  /**
   * Générer nom driver
   */
  static generateDriverName(deviceInfo, deviceType) {
    const { manufacturerId, modelId, powerSource } = deviceInfo;
    
    // Nom basé sur type + power source
    let name = deviceType.type;
    
    // Ajouter suffix pour manufacturer spécifique si nécessaire
    if (manufacturerId && !name.includes(manufacturerId.toLowerCase())) {
      // Extraire suffix manufacturer (_TZE204_ → tze204)
      const mfrSuffix = String(manufacturerId).replace(/[_\s]/g, '').toLowerCase();
      if (mfrSuffix.length < 15) { // éviter noms trop longs
        name += `_${mfrSuffix}`;
      }
    }
    
    return name;
  }

  /**
   * Générer driver.compose.json
   */
  static async generateDriverCompose(driverPath, deviceInfo, deviceType, zigbeeInfo) {
    const compose = {
      name: {
        en: this.generateDriverDisplayName(deviceInfo, deviceType, 'en'),
        fr: this.generateDriverDisplayName(deviceInfo, deviceType, 'fr')
      },
      class: deviceType.class,
      capabilities: deviceType.capabilities,
      zigbee: {
        manufacturerName: [deviceInfo.manufacturerId],
        productId: deviceInfo.productId ? [deviceInfo.productId] : [],
        endpoints: this.generateEndpointsConfig(deviceInfo, zigbeeInfo),
        learnmode: {
          instruction: {
            en: "Press and hold the reset button for 5 seconds until the LED blinks",
            fr: "Appuyez et maintenez le bouton reset pendant 5 secondes jusqu'à ce que la LED clignote"
          }
        }
      },
      energy: this.generateEnergyConfig(deviceInfo, deviceType),
      images: {
        small: "./assets/images/small.png",
        large: "./assets/images/large.png",
        xlarge: "./assets/images/xlarge.png"
      },
      platforms: ["local"],
      connectivity: ["zigbee"]
    };
    
    const composePath = path.join(driverPath, 'driver.compose.json');
    await fs.writeFile(composePath, JSON.stringify(compose, null, 2));
  }

  /**
   * Générer nom affichage driver
   */
  static generateDriverDisplayName(deviceInfo, deviceType, lang) {
    const { modelId, powerSource } = deviceInfo;
    
    const TYPE_NAMES = {
      en: {
        gas_sensor: 'Gas Sensor',
        motion_sensor: 'Motion Sensor',
        contact_sensor: 'Contact Sensor',
        sos_button: 'SOS Emergency Button',
        smart_plug: 'Smart Plug'
      },
      fr: {
        gas_sensor: 'Capteur de Gaz',
        motion_sensor: 'Capteur de Mouvement',
        contact_sensor: 'Capteur de Contact',
        sos_button: 'Bouton SOS d\'Urgence',
        smart_plug: 'Prise Intelligente'
      }
    };
    
    const baseType = deviceType.type.split('_')[0] + '_' + deviceType.type.split('_')[1];
    let name = TYPE_NAMES[lang][baseType] || deviceType.type;
    
    // Ajouter modèle si TS0601
    if (modelId === 'TS0601') {
      name += ` ${modelId}`;
    }
    
    // Ajouter power source
    if (powerSource === 'mains') {
      name += lang === 'en' ? ' (AC)' : ' (Secteur)';
    } else if (powerSource === 'battery') {
      name += lang === 'en' ? ' (Battery)' : ' (Batterie)';
    }
    
    return name;
  }

  /**
   * Générer configuration endpoints
   */
  static generateEndpointsConfig(deviceInfo, zigbeeInfo) {
    const endpoints = {
      "1": {
        clusters: deviceInfo.clusters,
        bindings: []
      }
    };
    
    // Ajouter bindings selon type
    if (deviceInfo.clusters.includes(1)) {
      endpoints["1"].bindings.push(1); // powerConfiguration
    }
    
    return endpoints;
  }

  /**
   * Générer configuration energy
   */
  static generateEnergyConfig(deviceInfo, deviceType) {
    if (deviceInfo.powerSource === 'battery') {
      return {
        batteries: ["CR2032"]
      };
    }
    
    if (deviceType.capabilities.includes('measure_power')) {
      return {
        approximation: {
          usageOn: 0.5,
          usageOff: 0.5
        }
      };
    }
    
    return undefined;
  }

  /**
   * Générer device.js avec handlers appropriés
   */
  static async generateDeviceJS(driverPath, deviceInfo, deviceType, zigbeeInfo) {
    let deviceJS = `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
`;

    // Ajouter imports selon type
    if (deviceInfo.isTuyaDevice) {
      deviceJS += `const TuyaClusterHandler = require('../../utils/tuya-cluster-handler');\n`;
    }
    
    if (deviceType.capabilities.includes('alarm_contact') || 
        deviceType.capabilities.includes('alarm_motion') ||
        deviceType.capabilities.includes('alarm_generic')) {
      deviceJS += `const IASZoneEnroller = require('../../lib/IASZoneEnroller');\n`;
    }

    deviceJS += `
class ${this.getClassName(deviceType)}Device extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('${deviceType.type} initialized');
`;

    // Ajouter logique selon type
    if (deviceInfo.isTuyaDevice) {
      deviceJS += this.generateTuyaInitCode(deviceInfo, deviceType);
    } else {
      deviceJS += this.generateStandardInitCode(deviceInfo, deviceType, zigbeeInfo);
    }

    deviceJS += `
    await this.setAvailable();
  }

}

module.exports = ${this.getClassName(deviceType)}Device;
`;

    const deviceJSPath = path.join(driverPath, 'device.js');
    await fs.writeFile(deviceJSPath, deviceJS);
  }

  /**
   * Obtenir nom de classe
   */
  static getClassName(deviceType) {
    return deviceType.type
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');
  }

  /**
   * Générer code init pour Tuya devices
   */
  static generateTuyaInitCode(deviceInfo, deviceType) {
    return `
    // Auto-detect device type and initialize Tuya cluster handler
    const deviceType = TuyaClusterHandler.detectDeviceType('${deviceType.type}');
    const tuyaInitialized = await TuyaClusterHandler.init(this, zclNode, deviceType);
    
    if (tuyaInitialized) {
      this.log('✅ Tuya cluster handler initialized for type:', deviceType);
    } else {
      this.log('⚠️  No Tuya cluster found, using standard Zigbee');
      await this.registerStandardCapabilities();
    }
`;
  }

  /**
   * Générer code init standard
   */
  static generateStandardInitCode(deviceInfo, deviceType, zigbeeInfo) {
    let code = '\n';
    
    // Enregistrer capabilities
    for (const cap of deviceType.capabilities) {
      code += this.generateCapabilityRegistration(cap, deviceInfo);
    }
    
    return code;
  }

  /**
   * Générer enregistrement capability
   */
  static generateCapabilityRegistration(capability, deviceInfo) {
    const CAPABILITY_CLUSTERS = {
      measure_battery: { cluster: 'POWER_CONFIGURATION', attribute: 'batteryPercentageRemaining', parser: 'value / 2' },
      measure_temperature: { cluster: 'TEMPERATURE_MEASUREMENT', attribute: 'measuredValue', parser: 'value / 100' },
      measure_humidity: { cluster: 'RELATIVE_HUMIDITY', attribute: 'measuredValue', parser: 'value / 100' },
      measure_luminance: { cluster: 'ILLUMINANCE_MEASUREMENT', attribute: 'measuredValue', parser: 'Math.pow(10, (value - 1) / 10000)' },
      onoff: { cluster: 'ON_OFF', attribute: 'onOff', parser: 'value' }
    };
    
    const config = CAPABILITY_CLUSTERS[capability];
    if (!config) return '';
    
    return `
    // ${capability}
    this.registerCapability('${capability}', CLUSTER.${config.cluster}, {
      get: '${config.attribute}',
      report: '${config.attribute}',
      getOpts: {
        getOnStart: true
      },
      reportParser: value => {
        this.log('${capability}:', value);
        return ${config.parser};
      }
    });
    this.log('✅ ${capability} registered');
`;
  }

  /**
   * Générer driver.js
   */
  static async generateDriverJS(driverPath, deviceInfo, deviceType) {
    const driverJS = `'use strict';

const { Driver } = require('homey');

class ${this.getClassName(deviceType)}Driver extends Driver {

  async onInit() {
    this.log('${deviceType.type} driver initialized');
  }

  async onPair(session) {
    this.log('Pairing session started');
    
    session.setHandler('showView', async (view) => {
      this.log('Showing view:', view);
    });
  }

}

module.exports = ${this.getClassName(deviceType)}Driver;
`;

    const driverJSPath = path.join(driverPath, 'driver.js');
    await fs.writeFile(driverJSPath, driverJS);
  }

  /**
   * Générer assets (images placeholder)
   */
  static async generateAssets(driverPath, deviceType) {
    // Pour l'instant, créer juste les fichiers .gitkeep
    const imagesPath = path.join(driverPath, 'assets/images');
    await fs.writeFile(path.join(imagesPath, '.gitkeep'), '');
    
    // TODO: Générer vraies images basées sur device type
  }

  /**
   * Intégrer driver dans structure
   */
  static async integrateDriver(driverPath, deviceInfo) {
    // TODO: Ajouter à app.json, mettre à jour README, etc.
    console.log('Driver integration complete');
  }

  /**
   * Générer tests driver
   */
  static async generateDriverTests(driverPath, deviceInfo) {
    // TODO: Générer tests unitaires
    console.log('Tests generation complete');
  }

}

module.exports = AutoDriverGenerator;
