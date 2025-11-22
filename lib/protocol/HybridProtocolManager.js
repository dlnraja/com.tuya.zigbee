'use strict';

/**
 * 🔀 HYBRID PROTOCOL MANAGER - Gestion intelligente Tuya DP + Zigbee Native
 *
 * Décide automatiquement quel protocole utiliser:
 * - Tuya Data Points (cluster 0xEF00) pour devices Tuya propriétaires
 * - Zigbee standard (ZCL) pour devices Zigbee natifs
 * - Mode hybride pour devices supportant les deux
 *
 * Basé sur la documentation officielle Tuya Developer:
 * https://developer.tuya.com/en/docs/connect-subdevices-to-gateways
 *
 * Adapté Homey SDK3:
 * - Utilise TuyaProtocolManager pour gestion DP
 * - Compatible avec BaseHybridDevice
 * - Routage intelligent automatique
 *
 * INTÉGRATION:
 * - Ce manager est une couche haute niveau
 * - Utilise TuyaProtocolManager pour logique Tuya
 * - Fournit API simple pour devices
 */

const TuyaProtocolManager = require('./TuyaProtocolManager');

class HybridProtocolManager {

  constructor(device) {
    this.device = device;
    this.protocol = null; // 'tuya', 'zigbee', 'hybrid'
    this.capabilities = new Map(); // capability → protocol mapping
    this.dpMapping = new Map(); // DP → capability mapping
  }

  /**
   * Détecte le protocole optimal pour le device
   */
  async detectProtocol(zclNode) {
    this.device.log('[HYBRID] 🔍 Detecting optimal protocol...');

    const endpoint = zclNode.endpoints?.[1];
    if (!endpoint) {
      this.device.log('[HYBRID] ❌ No endpoint found');
      return 'zigbee'; // Fallback to standard Zigbee
    }

    const clusters = endpoint.clusters || {};

    // Check for Tuya private cluster
    const hasTuyaCluster = !!(
      clusters.tuyaManufacturer ||
      clusters.tuyaSpecific ||
      clusters.manuSpecificTuya ||
      clusters[0xEF00] ||
      clusters[61184] // 0xEF00 in decimal
    );

    // Check for standard Zigbee clusters
    const hasStandardClusters = !!(
      clusters.onOff ||
      clusters.levelControl ||
      clusters.colorControl ||
      clusters.temperatureMeasurement ||
      clusters.illuminanceMeasurement ||
      clusters.occupancySensing ||
      clusters.iasZone
    );

    // Determine protocol mode
    if (hasTuyaCluster && hasStandardClusters) {
      this.protocol = 'hybrid';
      this.device.log('[HYBRID] ✅ HYBRID mode: Device supports both Tuya DP and Zigbee native');
    } else if (hasTuyaCluster) {
      this.protocol = 'tuya';
      this.device.log('[HYBRID] ✅ TUYA mode: Device uses Tuya Data Points exclusively');
    } else {
      this.protocol = 'zigbee';
      this.device.log('[HYBRID] ✅ ZIGBEE mode: Device uses standard Zigbee clusters');
    }

    // Log available clusters
    const clusterNames = Object.keys(clusters);
    this.device.log(`[HYBRID] Available clusters: ${clusterNames.join(', ')}`);

    // Auto-configure DP mappings if Tuya
    if (this.protocol === 'tuya' || this.protocol === 'hybrid') {
      this.configureTuyaDPMappings();
    }

    return this.protocol;
  }

  /**
   * Configure automatic DP mappings based on Tuya standards
   * Source: https://developer.tuya.com/en/docs/iot/custom-functions
   */
  configureTuyaDPMappings() {
    this.device.log('[HYBRID] 📊 Configuring Tuya DP mappings...');

    // Standard Tuya DP mappings - array to support multiple meanings per DP
    const dpMappingOptions = [
      // Multi-Gang Switches (DP1-4)
      { dp: 1, capability: 'onoff', description: 'Switch gang 1', type: 'bool' },
      { dp: 2, capability: 'onoff.gang2', description: 'Switch gang 2', type: 'bool' },
      { dp: 3, capability: 'onoff.gang3', description: 'Switch gang 3', type: 'bool' },
      { dp: 4, capability: 'onoff.gang4', description: 'Switch gang 4', type: 'bool' },

      // Countdown Timers (DP7-10)
      { dp: 7, capability: 'countdown.gang1', description: 'Countdown timer gang 1', type: 'value' },
      { dp: 8, capability: 'countdown.gang2', description: 'Countdown timer gang 2', type: 'value' },
      { dp: 9, capability: 'countdown.gang3', description: 'Countdown timer gang 3', type: 'value' },
      { dp: 10, capability: 'countdown.gang4', description: 'Countdown timer gang 4', type: 'value' },

      // Power-on behavior (DP14, DP29-32)
      { dp: 14, capability: 'power_on_behavior', description: 'Main power-on behavior', type: 'enum' },
      { dp: 29, capability: 'power_on_behavior.gang1', description: 'Power-on gang 1', type: 'enum' },
      { dp: 30, capability: 'power_on_behavior.gang2', description: 'Power-on gang 2', type: 'enum' },
      { dp: 31, capability: 'power_on_behavior.gang3', description: 'Power-on gang 3', type: 'enum' },
      { dp: 32, capability: 'power_on_behavior.gang4', description: 'Power-on gang 4', type: 'enum' },

      // LED & Backlight (DP15-16)
      { dp: 15, capability: 'led_behavior', description: 'LED indicator', type: 'enum' },
      { dp: 16, capability: 'backlight', description: 'Backlight', type: 'bool' },

      // Inching/Pulse (DP19 for switches)
      { dp: 19, capability: 'inching_mode', description: 'Inching/Pulse mode', type: 'raw' },

      // Plugs/Sockets
      { dp: 101, capability: 'onoff', description: 'Main switch', type: 'bool' },
      { dp: 102, capability: 'dim', description: 'Dimmer level', type: 'value' },
      { dp: 103, capability: 'onoff.usb2', description: 'USB port 2', type: 'bool' },

      // Environmental sensors (alternative for DP1-5)
      { dp: 1, capability: 'measure_temperature', description: 'Temperature', type: 'value', scale: 10 },
      { dp: 2, capability: 'measure_humidity', description: 'Humidity', type: 'value', scale: 10 },
      { dp: 3, capability: 'measure_luminance', description: 'Illuminance', type: 'value' },
      { dp: 4, capability: 'measure_battery', description: 'Battery', type: 'value' },
      { dp: 5, capability: 'alarm_motion', description: 'Motion', type: 'bool' },

      // Contact sensors (DP9 alternative)
      { dp: 9, capability: 'alarm_contact', description: 'Contact', type: 'bool' },

      // Alternative temperature/humidity (DP18-19)
      { dp: 18, capability: 'measure_temperature', description: 'Temperature (alt)', type: 'value', scale: 10 },
      { dp: 19, capability: 'measure_humidity', description: 'Humidity (alt)', type: 'value', scale: 10 }
    ];

    // Apply mappings only for capabilities that exist on device
    for (const config of dpMappingOptions) {
      if (this.device.hasCapability(config.capability)) {
        this.dpMapping.set(config.dp, config);
        this.capabilities.set(config.capability, 'tuya');
        this.device.log(`[HYBRID] ✅ DP${config.dp} → ${config.capability} (${config.type})`);
      }
    }

    this.device.log(`[HYBRID] 📊 ${this.dpMapping.size} DP mappings configured`);
  }

  /**
   * Get protocol for a specific capability
   */
  getProtocolForCapability(capability) {
    return this.capabilities.get(capability) || this.protocol || 'zigbee';
  }

  /**
   * Get DP for a capability
   */
  getDPForCapability(capability) {
    for (const [dp, config] of this.dpMapping.entries()) {
      if (config.capability === capability) {
        return { dp, config };
      }
    }
    return null;
  }

  /**
   * Set capability value using optimal protocol
   */
  async setCapabilityValue(capability, value) {
    const protocol = this.getProtocolForCapability(capability);

    this.device.log(`[HYBRID] Setting ${capability} = ${value} via ${protocol.toUpperCase()}`);

    if (protocol === 'tuya') {
      return this.setViaTuyaDP(capability, value);
    } else {
      return this.setViaZigbee(capability, value);
    }
  }

  /**
   * Set value via Tuya Data Point
   */
  async setViaTuyaDP(capability, value) {
    const dpInfo = this.getDPForCapability(capability);

    if (!dpInfo) {
      this.device.error(`[HYBRID] No DP mapping for ${capability}`);
      return false;
    }

    const { dp, config } = dpInfo;

    // Scale value if needed
    let scaledValue = value;
    if (config.scale && typeof value === 'number') {
      scaledValue = Math.round(value * config.scale);
    }

    // Get DP type
    let dpType = TuyaDPParser.DP_TYPE.RAW;
    switch (config.type) {
      case 'bool':
        dpType = TuyaDPParser.DP_TYPE.BOOL;
        break;
      case 'value':
        dpType = TuyaDPParser.DP_TYPE.VALUE;
        break;
      case 'enum':
        dpType = TuyaDPParser.DP_TYPE.ENUM;
        break;
      case 'string':
        dpType = TuyaDPParser.DP_TYPE.STRING;
        break;
    }

    // Encode and send
    try {
      const buffer = TuyaDPParser.encode(dp, dpType, scaledValue);
      const endpoint = this.device.zclNode?.endpoints?.[1];

      if (!endpoint) {
        throw new Error('Endpoint not available');
      }

      const tuyaCluster = endpoint.clusters.tuyaManufacturer
        || endpoint.clusters.tuyaSpecific
        || endpoint.clusters.manuSpecificTuya
        || endpoint.clusters[0xEF00];

      if (!tuyaCluster) {
        throw new Error('Tuya cluster not available');
      }

      // Send via cluster
      await endpoint.sendFrame(0xEF00, buffer, 0x00);

      this.device.log(`[HYBRID] ✅ Sent DP${dp} = ${scaledValue} (${config.type})`);
      return true;
    } catch (err) {
      this.device.error(`[HYBRID] Failed to send DP${dp}:`, err.message);
      return false;
    }
  }

  /**
   * Set value via standard Zigbee cluster
   */
  async setViaZigbee(capability, value) {
    this.device.log(`[HYBRID] Setting ${capability} via standard Zigbee`);

    // Use device's built-in Zigbee methods
    try {
      // This will use the device's registerCapability bindings
      await this.device.setCapabilityValue(capability, value);
      this.device.log(`[HYBRID] ✅ Set ${capability} = ${value} via Zigbee`);
      return true;
    } catch (err) {
      this.device.error(`[HYBRID] Failed to set ${capability} via Zigbee:`, err.message);
      return false;
    }
  }

  /**
   * Handle incoming data (auto-detect source)
   */
  handleIncomingData(data) {
    // Detect if it's Tuya DP or Zigbee cluster data
    if (data.dp !== undefined || data.dpId !== undefined) {
      // Tuya DP data
      return this.handleTuyaDP(data);
    } else {
      // Zigbee cluster data
      return this.handleZigbeeCluster(data);
    }
  }

  /**
   * Handle Tuya DP data
   */
  handleTuyaDP(data) {
    const dp = data.dp || data.dpId;
    const value = data.value || data.dpValue || data.data;

    const mapping = this.dpMapping.get(dp);

    if (mapping) {
      // Scale value if needed
      let scaledValue = value;
      if (mapping.scale && typeof value === 'number') {
        scaledValue = value / mapping.scale;
      }

      // Convert to boolean if needed
      if (mapping.type === 'bool' && typeof scaledValue !== 'boolean') {
        scaledValue = Boolean(scaledValue);
      }

      this.device.log(`[HYBRID] DP${dp} → ${mapping.capability} = ${scaledValue}`);

      // Set capability
      this.device.setCapabilityValue(mapping.capability, scaledValue)
        .catch(err => {
          this.device.error(`[HYBRID] Failed to set ${mapping.capability}:`, err.message);
        });

      return true;
    } else {
      this.device.log(`[HYBRID] Unmapped DP${dp} = ${value}`);
      return false;
    }
  }

  /**
   * Handle Zigbee cluster data
   */
  handleZigbeeCluster(data) {
    // Let standard Zigbee handler process it
    this.device.log('[HYBRID] Standard Zigbee data received:', JSON.stringify(data));
    return true;
  }

  /**
   * Get device protocol summary
   */
  getSummary() {
    return {
      protocol: this.protocol,
      capabilities: Array.from(this.capabilities.entries()),
      dpMappings: Array.from(this.dpMapping.entries()).map(([dp, config]) => ({
        dp,
        capability: config.capability,
        type: config.type,
        description: config.description
      }))
    };
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.capabilities.clear();
    this.dpMapping.clear();
  }
}

module.exports = HybridProtocolManager;
