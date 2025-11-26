'use strict';

/**
 * UNIVERSAL CAPABILITY DETECTOR
 * 
 * Détecte AUTOMATIQUEMENT toutes les capabilities d'un device:
 * - Clusters Zigbee standards (ON_OFF, TEMPERATURE, etc.)
 * - Clusters Tuya custom (0xEF00 avec DataPoints)
 * - Clusters propriétaires/manufacturer-specific
 * 
 * Combine TOUT intelligemment pour générer capabilities Homey optimales
 */

// const TuyaDataPointParser = require('./TuyaDataPointParser'); // Use TuyaDPParser instead
// const EnergyCapabilityDetector = require('./EnergyCapabilityDetector'); // Integrated in main detector

// Importer les mappings du projet
let TuyaUniversalMapping;
try {
  TuyaUniversalMapping = require('./tuya-universal-mapping');
} catch (err) {
  TuyaUniversalMapping = null;
}

class UniversalCapabilityDetector {

  /**
   * Détecte TOUTES les capabilities d'un device
   * @param {Object} zclNode - ZCL Node
   * @returns {Object} Capabilities détectées
   */
  static async detectAllCapabilities(zclNode) {
    const result = {
      // Capabilities Homey à ajouter
      capabilities: [],
      
      // Détails par source
      zigbeeStandard: [],
      tuyaCustom: [],
      energy: [],
      
      // Configuration recommandée
      clusters: {},
      endpoints: {},
      
      // Metadata
      deviceInfo: {},
      recommendations: []
    };

    if (!zclNode || !zclNode.endpoints) {
      return result;
    }

    // 1. Extraire device info
    result.deviceInfo = this._extractDeviceInfo(zclNode);

    // 2. Détecter Zigbee Standard
    result.zigbeeStandard = this._detectZigbeeStandard(zclNode);
    result.capabilities.push(...result.zigbeeStandard.map(c => c.capability));

    // 3. Détecter Tuya Custom (DataPoints)
    result.tuyaCustom = this._detectTuyaCustom(zclNode, result.deviceInfo.manufacturerId);
    result.capabilities.push(...result.tuyaCustom.map(c => c.capability));

    // 4. Détecter Energy
    const energyCaps = EnergyCapabilityDetector.detectEnergyCapabilities(zclNode);
    result.energy = EnergyCapabilityDetector.generateHomeyCapabilities(energyCaps);
    result.capabilities.push(...result.energy);

    // 5. Dédupliquer capabilities
    result.capabilities = [...new Set(result.capabilities)];

    // 6. Générer configuration clusters
    result.clusters = this._generateClusterConfig(zclNode, result);

    // 7. Générer recommandations
    result.recommendations = this._generateRecommendations(result);

    return result;
  }

  /**
   * Extrait les infos du device
   * @private
   */
  static _extractDeviceInfo(zclNode) {
    const info = {
      manufacturerId: null,
      modelId: null,
      powerSource: null,
      deviceType: null
    };

    // Chercher dans endpoint 1 (principal)
    const ep1 = zclNode.endpoints[1];
    if (!ep1 || !ep1.clusters || !ep1.clusters.basic) {
      return info;
    }

    const basic = ep1.clusters.basic.attributes || [];

    const manufacturerAttr = basic.find(a => a.name === 'manufacturerName');
    if (manufacturerAttr) {
      info.manufacturerId = manufacturerAttr.value;
    }

    const modelAttr = basic.find(a => a.name === 'modelId');
    if (modelAttr) {
      info.modelId = modelAttr.value;
    }

    const powerAttr = basic.find(a => a.name === 'powerSource');
    if (powerAttr) {
      info.powerSource = powerAttr.value;
    }

    // Device type
    if (zclNode.endpoints[1].deviceType) {
      info.deviceType = zclNode.endpoints[1].deviceType;
    }

    return info;
  }

  /**
   * Détecte capabilities Zigbee standard
   * @private
   */
  static _detectZigbeeStandard(zclNode) {
    const capabilities = [];

    Object.keys(zclNode.endpoints).forEach(epId => {
      const endpoint = zclNode.endpoints[epId];
      if (!endpoint.clusters) return;

      // ON/OFF
      if (endpoint.clusters.onOff) {
        capabilities.push({
          capability: epId === '1' ? 'onoff' : `onoff.${epId}`,
          cluster: 'onOff',
          endpoint: epId,
          type: 'standard'
        });
      }

      // TEMPERATURE
      if (endpoint.clusters.temperatureMeasurement) {
        capabilities.push({
          capability: 'measure_temperature',
          cluster: 'temperatureMeasurement',
          endpoint: epId,
          type: 'standard'
        });
      }

      // HUMIDITY
      if (endpoint.clusters.relativeHumidity) {
        capabilities.push({
          capability: 'measure_humidity',
          cluster: 'relativeHumidity',
          endpoint: epId,
          type: 'standard'
        });
      }

      // ILLUMINANCE
      if (endpoint.clusters.illuminanceMeasurement) {
        capabilities.push({
          capability: 'measure_luminance',
          cluster: 'illuminanceMeasurement',
          endpoint: epId,
          type: 'standard'
        });
      }

      // MOTION (IAS Zone)
      if (endpoint.clusters.iasZone) {
        const zoneType = endpoint.clusters.iasZone.attributes?.find(
          a => a.name === 'zoneType'
        )?.value;
        
        if (zoneType === 'motionSensor' || zoneType === 13) {
          capabilities.push({
            capability: 'alarm_motion',
            cluster: 'iasZone',
            endpoint: epId,
            type: 'standard'
          });
        }
      }

      // BATTERY
      if (endpoint.clusters.powerConfiguration) {
        capabilities.push({
          capability: 'measure_battery',
          cluster: 'powerConfiguration',
          endpoint: epId,
          type: 'standard'
        });
      }

      // LEVEL CONTROL (Dimming)
      if (endpoint.clusters.levelControl) {
        capabilities.push({
          capability: 'dim',
          cluster: 'levelControl',
          endpoint: epId,
          type: 'standard'
        });
      }

      // COLOR CONTROL
      if (endpoint.clusters.colorControl) {
        capabilities.push({
          capability: 'light_hue',
          cluster: 'colorControl',
          endpoint: epId,
          type: 'standard'
        });
        capabilities.push({
          capability: 'light_saturation',
          cluster: 'colorControl',
          endpoint: epId,
          type: 'standard'
        });
      }

      // WINDOW COVERING
      if (endpoint.clusters.windowCovering) {
        capabilities.push({
          capability: 'windowcoverings_state',
          cluster: 'windowCovering',
          endpoint: epId,
          type: 'standard'
        });
      }

      // THERMOSTAT
      if (endpoint.clusters.thermostat) {
        capabilities.push({
          capability: 'target_temperature',
          cluster: 'thermostat',
          endpoint: epId,
          type: 'standard'
        });
      }
    });

    return capabilities;
  }

  /**
   * Détecte capabilities Tuya custom (DataPoints)
   * @private
   */
  static _detectTuyaCustom(zclNode, manufacturerId) {
    const capabilities = [];

    // Chercher cluster Tuya (0xEF00)
    const tuyaEndpoint = Object.values(zclNode.endpoints).find(ep => 
      ep.clusters?.tuya || 
      ep.clusters?.tuyaSpecificCluster || 
      ep.clusters?.[0xEF00]
    );

    if (!tuyaEndpoint) {
      return capabilities;
    }

    // Obtenir les mappings spécifiques
    const mappings = TuyaDataPointParser.getManufacturerMappings(manufacturerId);

    // Si mappings disponibles, ajouter capabilities
    Object.keys(mappings).forEach(dp => {
      const mapping = mappings[dp];
      capabilities.push({
        capability: mapping.capability,
        dp: parseInt(dp),
        type: 'tuya_custom',
        endpoint: tuyaEndpoint.endpointId
      });
    });

    // Utiliser aussi le mapping universel du projet si disponible
    if (TuyaUniversalMapping && manufacturerId) {
      const universalCaps = this._getFromUniversalMapping(manufacturerId);
      capabilities.push(...universalCaps);
    }

    return capabilities;
  }

  /**
   * Obtient capabilities depuis tuya-universal-mapping.js
   * @private
   */
  static _getFromUniversalMapping(manufacturerId) {
    const capabilities = [];

    if (!TuyaUniversalMapping) return capabilities;

    // Chercher dans les différentes sections du mapping
    const sections = [
      'TUYA_DATAPOINTS',
      'MANUFACTURER_SPECIFIC',
      'DEVICE_SPECIFIC'
    ];

    sections.forEach(section => {
      if (TuyaUniversalMapping[section] && TuyaUniversalMapping[section][manufacturerId]) {
        const deviceMapping = TuyaUniversalMapping[section][manufacturerId];
        
        if (deviceMapping.capabilities) {
          deviceMapping.capabilities.forEach(cap => {
            capabilities.push({
              capability: cap,
              type: 'universal_mapping',
              source: 'tuya-universal-mapping.js'
            });
          });
        }

        if (deviceMapping.datapoints) {
          Object.keys(deviceMapping.datapoints).forEach(dp => {
            const dpConfig = deviceMapping.datapoints[dp];
            if (dpConfig.capability) {
              capabilities.push({
                capability: dpConfig.capability,
                dp: parseInt(dp),
                type: 'universal_mapping_dp',
                source: 'tuya-universal-mapping.js'
              });
            }
          });
        }
      }
    });

    return capabilities;
  }

  /**
   * Génère la configuration des clusters
   * @private
   */
  static _generateClusterConfig(zclNode, detectionResult) {
    const config = {};

    // Pour chaque capability détectée, générer config
    detectionResult.zigbeeStandard.forEach(cap => {
      const key = `${cap.cluster}_${cap.endpoint}`;
      
      config[key] = {
        cluster: cap.cluster,
        endpoint: cap.endpoint,
        capability: cap.capability,
        type: 'standard',
        registerMethod: 'registerCapability'
      };
    });

    detectionResult.tuyaCustom.forEach(cap => {
      const key = `tuya_dp${cap.dp}`;
      
      config[key] = {
        dp: cap.dp,
        capability: cap.capability,
        type: 'tuya_custom',
        registerMethod: 'handleDataPoint'
      };
    });

    return config;
  }

  /**
   * Génère des recommandations
   * @private
   */
  static _generateRecommendations(result) {
    const recommendations = [];

    // Si device a des clusters standards ET Tuya custom
    if (result.zigbeeStandard.length > 0 && result.tuyaCustom.length > 0) {
      recommendations.push({
        type: 'hybrid_device',
        message: 'Device hybride détecté: utilise clusters standard + Tuya custom',
        action: 'Utiliser TuyaSpecificDevice comme base class avec fallback standard'
      });
    }

    // Si seulement Tuya custom
    if (result.zigbeeStandard.length === 0 && result.tuyaCustom.length > 0) {
      recommendations.push({
        type: 'tuya_only',
        message: 'Device Tuya pur (TS0601)',
        action: 'Utiliser TuyaSpecificDevice comme base class'
      });
    }

    // Si seulement standard
    if (result.zigbeeStandard.length > 0 && result.tuyaCustom.length === 0) {
      recommendations.push({
        type: 'standard_only',
        message: 'Device Zigbee standard',
        action: 'Utiliser ZigBeeDevice normal'
      });
    }

    // Si multi-endpoint
    const endpoints = new Set([
      ...result.zigbeeStandard.map(c => c.endpoint),
      ...result.tuyaCustom.map(c => c.endpoint)
    ]);

    if (endpoints.size > 1) {
      recommendations.push({
        type: 'multi_endpoint',
        message: `Device multi-endpoint détecté (${endpoints.size} endpoints)`,
        action: 'Utiliser MultiEndpointManager pour gérer les sub-capabilities'
      });
    }

    // Si energy capabilities
    if (result.energy.length > 0) {
      recommendations.push({
        type: 'energy_monitoring',
        message: `Energy monitoring disponible: ${result.energy.join(', ')}`,
        action: 'Ajouter energy capabilities au driver'
      });
    }

    return recommendations;
  }

  /**
   * Génère un rapport de détection complet
   * @param {Object} zclNode - ZCL Node
   * @returns {String} Rapport formaté
   */
  static async generateReport(zclNode) {
    const detection = await this.detectAllCapabilities(zclNode);

    let report = '╔═════════════════════════════════════════════╗\n';
    report += '║   UNIVERSAL CAPABILITY DETECTION REPORT     ║\n';
    report += '╚═════════════════════════════════════════════╝\n\n';

    // Device Info
    report += '📱 DEVICE INFO\n';
    report += `   Manufacturer: ${detection.deviceInfo.manufacturerId || 'Unknown'}\n`;
    report += `   Model: ${detection.deviceInfo.modelId || 'Unknown'}\n`;
    report += `   Power: ${detection.deviceInfo.powerSource || 'Unknown'}\n`;
    report += `   Type: ${detection.deviceInfo.deviceType || 'Unknown'}\n\n`;

    // Capabilities Summary
    report += '✨ DETECTED CAPABILITIES\n';
    report += `   Total: ${detection.capabilities.length}\n`;
    report += `   - Zigbee Standard: ${detection.zigbeeStandard.length}\n`;
    report += `   - Tuya Custom: ${detection.tuyaCustom.length}\n`;
    report += `   - Energy: ${detection.energy.length}\n\n`;

    // Zigbee Standard
    if (detection.zigbeeStandard.length > 0) {
      report += '📡 ZIGBEE STANDARD CLUSTERS\n';
      detection.zigbeeStandard.forEach(cap => {
        report += `   ✓ ${cap.capability.padEnd(25)} [${cap.cluster}] EP${cap.endpoint}\n`;
      });
      report += '\n';
    }

    // Tuya Custom
    if (detection.tuyaCustom.length > 0) {
      report += '🔧 TUYA CUSTOM DATAPOINTS\n';
      detection.tuyaCustom.forEach(cap => {
        report += `   ✓ ${cap.capability.padEnd(25)} [DP ${cap.dp}]\n`;
      });
      report += '\n';
    }

    // Energy
    if (detection.energy.length > 0) {
      report += '⚡ ENERGY MONITORING\n';
      detection.energy.forEach(cap => {
        report += `   ✓ ${cap}\n`;
      });
      report += '\n';
    }

    // Recommendations
    if (detection.recommendations.length > 0) {
      report += '💡 RECOMMENDATIONS\n';
      detection.recommendations.forEach((rec, i) => {
        report += `   ${i + 1}. [${rec.type}]\n`;
        report += `      ${rec.message}\n`;
        report += `      → ${rec.action}\n\n`;
      });
    }

    // Final Capabilities List
    report += '📋 FINAL CAPABILITIES LIST\n';
    detection.capabilities.forEach((cap, i) => {
      report += `   ${(i + 1).toString().padStart(2)}. ${cap}\n`;
    });

    return report;
  }

  /**
   * Génère le code pour driver.compose.json
   * @param {Object} detection - Résultat de detectAllCapabilities
   * @returns {Object} Configuration driver
   */
  static generateDriverConfig(detection) {
    return {
      capabilities: detection.capabilities,
      capabilitiesOptions: this._generateCapabilitiesOptions(detection),
      zigbee: {
        manufacturerName: detection.deviceInfo.manufacturerId,
        productId: detection.deviceInfo.modelId
      }
    };
  }

  /**
   * Génère capabilitiesOptions
   * @private
   */
  static _generateCapabilitiesOptions(detection) {
    const options = {};

    // Pour les sub-capabilities (onoff.2, etc)
    detection.capabilities.forEach(cap => {
      if (cap.includes('.')) {
        const [base, sub] = cap.split('.');
        options[cap] = {
          title: { en: `${base} ${sub}` }
        };
      }
    });

    return options;
  }
}

module.exports = UniversalCapabilityDetector;
