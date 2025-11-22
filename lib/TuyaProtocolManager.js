'use strict';

/**
 * 🔀 TUYA PROTOCOL MANAGER - Système Unifié Intelligent
 *
 * Fusion et optimisation de:
 * - TuyaAdapter.js
 * - TuyaDataPointEngine.js
 * - TuyaManufacturerCluster.js
 * - TuyaSpecificCluster.js
 * - IntelligentProtocolRouter.js
 *
 * Documentation officielle Tuya Developer:
 * https://developer.tuya.com/en/docs/connect-subdevices-to-gateways
 *
 * Adapté pour Homey SDK3:
 * - Utilise this.zclNode (fourni par Homey)
 * - Accès clusters via this.zclNode.endpoints[1].clusters
 * - Communication via endpoint.sendFrame()
 * - Pas de gateway Tuya, Homey Pro = gateway
 */

const TuyaDPParser = require('./TuyaDPParser');
const { EventEmitter } = require('events');

class TuyaProtocolManager extends EventEmitter {

  constructor(device) {
    super();
    this.device = device;
    this.protocol = null; // 'tuya', 'zigbee', 'hybrid'
    this.capabilities = new Map();
    this.dpMapping = new Map();
    this.clusterCache = null;

    // Statistics
    this.stats = {
      dpSent: 0,
      dpReceived: 0,
      zigbeeSent: 0,
      zigbeeReceived: 0,
      errors: 0
    };
  }

  /**
   * Initialise le protocol manager
   * @param {Object} zclNode - Homey SDK3 ZCL Node
   */
  async initialize(zclNode) {
    this.device.log('[TUYA-PROTOCOL] 🚀 Initializing...');

    if (!zclNode) {
      this.device.error('[TUYA-PROTOCOL] No zclNode provided');
      return false;
    }

    this.zclNode = zclNode;

    // Detect protocol
    await this.detectProtocol();

    // Configure DP mappings if Tuya
    if (this.protocol === 'tuya' || this.protocol === 'hybrid') {
      this.configureDPMappings();
      this.setupTuyaListeners();
    }

    // Setup Zigbee listeners if needed
    if (this.protocol === 'zigbee' || this.protocol === 'hybrid') {
      this.setupZigbeeListeners();
    }

    this.device.log(`[TUYA-PROTOCOL] ✅ Initialized in ${this.protocol.toUpperCase()} mode`);
    return true;
  }

  /**
   * Détecte le protocole optimal (Tuya DP, Zigbee natif, ou Hybrid)
   * Adapté SDK3: Utilise this.zclNode au lieu de gateway Tuya
   */
  async detectProtocol() {
    const endpoint = this.zclNode.endpoints?.[1];
    if (!endpoint) {
      this.protocol = 'zigbee';
      this.device.log('[TUYA-PROTOCOL] ⚠️  No endpoint, defaulting to Zigbee');
      return;
    }

    const clusters = endpoint.clusters || {};

    // Check for Tuya private cluster (0xEF00)
    // SDK3: Accès via clusters object, pas via gateway
    const hasTuyaCluster = !!(
      clusters.tuyaManufacturer ||
      clusters.tuyaSpecific ||
      clusters.manuSpecificTuya ||
      clusters[0xEF00] ||
      clusters[61184] // 0xEF00 en décimal
    );

    // Check for standard Zigbee clusters
    const hasStandardClusters = !!(
      clusters.onOff ||
      clusters.levelControl ||
      clusters.colorControl ||
      clusters.temperatureMeasurement ||
      clusters.illuminanceMeasurement ||
      clusters.occupancySensing ||
      clusters.iasZone ||
      clusters.electricalMeasurement ||
      clusters.metering
    );

    // Determine protocol
    if (hasTuyaCluster && hasStandardClusters) {
      this.protocol = 'hybrid';
      this.device.log('[TUYA-PROTOCOL] ✅ HYBRID MODE: Both Tuya DP and Zigbee native supported');
    } else if (hasTuyaCluster) {
      this.protocol = 'tuya';
      this.device.log('[TUYA-PROTOCOL] ✅ TUYA MODE: Exclusive Tuya Data Points');
    } else {
      this.protocol = 'zigbee';
      this.device.log('[TUYA-PROTOCOL] ✅ ZIGBEE MODE: Standard Zigbee clusters only');
    }

    // Cache cluster for quick access
    if (hasTuyaCluster) {
      this.clusterCache = clusters.tuyaManufacturer
        || clusters.tuyaSpecific
        || clusters.manuSpecificTuya
        || clusters[0xEF00];
    }

    // Log available clusters
    const clusterList = Object.keys(clusters).join(', ');
    this.device.log(`[TUYA-PROTOCOL] Clusters: ${clusterList}`);
  }

  /**
   * Configure automatic DP mappings
   * Basé sur documentation officielle Tuya
   */
  configureDPMappings() {
    this.device.log('[TUYA-PROTOCOL] 📊 Configuring DP mappings...');

    // Standard Tuya DP mappings - trying all possible mappings and only applying those with matching capabilities
    const dpMappingOptions = [
      // Switches (DP1-4 for multi-gang)
      { dp: 1, capability: 'onoff', type: TuyaDPParser.DP_TYPE.BOOL, description: 'Main switch / Gang 1' },
      { dp: 2, capability: 'onoff.gang2', type: TuyaDPParser.DP_TYPE.BOOL, description: 'Gang 2' },
      { dp: 3, capability: 'onoff.gang3', type: TuyaDPParser.DP_TYPE.BOOL, description: 'Gang 3' },
      { dp: 4, capability: 'onoff.gang4', type: TuyaDPParser.DP_TYPE.BOOL, description: 'Gang 4' },

      // Countdown timers (DP7-10)
      { dp: 7, capability: 'countdown.gang1', type: TuyaDPParser.DP_TYPE.VALUE, description: 'Timer gang 1', scale: 1 },
      { dp: 8, capability: 'countdown.gang2', type: TuyaDPParser.DP_TYPE.VALUE, description: 'Timer gang 2', scale: 1 },
      { dp: 9, capability: 'countdown.gang3', type: TuyaDPParser.DP_TYPE.VALUE, description: 'Timer gang 3', scale: 1 },
      { dp: 10, capability: 'countdown.gang4', type: TuyaDPParser.DP_TYPE.VALUE, description: 'Timer gang 4', scale: 1 },

      // Power-on behavior
      { dp: 14, capability: 'power_on_behavior', type: TuyaDPParser.DP_TYPE.ENUM, description: 'Main power-on' },
      { dp: 29, capability: 'power_on_behavior.gang1', type: TuyaDPParser.DP_TYPE.ENUM, description: 'Gang 1 power-on' },
      { dp: 30, capability: 'power_on_behavior.gang2', type: TuyaDPParser.DP_TYPE.ENUM, description: 'Gang 2 power-on' },
      { dp: 31, capability: 'power_on_behavior.gang3', type: TuyaDPParser.DP_TYPE.ENUM, description: 'Gang 3 power-on' },
      { dp: 32, capability: 'power_on_behavior.gang4', type: TuyaDPParser.DP_TYPE.ENUM, description: 'Gang 4 power-on' },

      // LED & Backlight
      { dp: 15, capability: 'led_behavior', type: TuyaDPParser.DP_TYPE.ENUM, description: 'LED indicator' },
      { dp: 16, capability: 'backlight', type: TuyaDPParser.DP_TYPE.BOOL, description: 'Backlight' },

      // Inching/Pulse
      { dp: 19, capability: 'inching_mode', type: TuyaDPParser.DP_TYPE.RAW, description: 'Pulse mode' },

      // Environmental sensors (DP1-5, 9)
      { dp: 1, capability: 'measure_temperature', type: TuyaDPParser.DP_TYPE.VALUE, description: 'Temperature', scale: 10 },
      { dp: 2, capability: 'measure_humidity', type: TuyaDPParser.DP_TYPE.VALUE, description: 'Humidity', scale: 10 },
      { dp: 3, capability: 'measure_luminance', type: TuyaDPParser.DP_TYPE.VALUE, description: 'Illuminance', scale: 1 },
      { dp: 4, capability: 'measure_battery', type: TuyaDPParser.DP_TYPE.VALUE, description: 'Battery', scale: 1 },
      { dp: 5, capability: 'alarm_motion', type: TuyaDPParser.DP_TYPE.BOOL, description: 'Motion' },
      { dp: 9, capability: 'alarm_contact', type: TuyaDPParser.DP_TYPE.BOOL, description: 'Contact' },

      // Soil Moisture Sensor (DP1 alternative)
      { dp: 1, capability: 'measure_moisture', type: TuyaDPParser.DP_TYPE.VALUE, description: 'Soil moisture', scale: 1 },

      // Alternative temperature/humidity
      { dp: 18, capability: 'measure_temperature', type: TuyaDPParser.DP_TYPE.VALUE, description: 'Temperature (alt)', scale: 10 },
      { dp: 19, capability: 'measure_humidity', type: TuyaDPParser.DP_TYPE.VALUE, description: 'Humidity (alt)', scale: 10 },

      // Plug/Socket
      { dp: 101, capability: 'onoff', type: TuyaDPParser.DP_TYPE.BOOL, description: 'Socket main' },
      { dp: 102, capability: 'dim', type: TuyaDPParser.DP_TYPE.VALUE, description: 'Dimmer', scale: 1 },
      { dp: 103, capability: 'onoff.usb2', type: TuyaDPParser.DP_TYPE.BOOL, description: 'USB port 2' },

      // Energy monitoring
      { dp: 16, capability: 'measure_voltage', type: TuyaDPParser.DP_TYPE.VALUE, description: 'Voltage', scale: 10 },
      { dp: 17, capability: 'measure_current', type: TuyaDPParser.DP_TYPE.VALUE, description: 'Current (mA)', scale: 1000 },
      { dp: 18, capability: 'measure_power', type: TuyaDPParser.DP_TYPE.VALUE, description: 'Power', scale: 10 },
      { dp: 19, capability: 'meter_power', type: TuyaDPParser.DP_TYPE.VALUE, description: 'Energy (kWh)', scale: 100 }
    ];

    // Apply mappings only for capabilities that exist on device
    let mappedCount = 0;
    for (const config of dpMappingOptions) {
      if (this.device.hasCapability(config.capability)) {
        this.dpMapping.set(config.dp, config);
        this.capabilities.set(config.capability, 'tuya');
        mappedCount++;
      }
    }

    this.device.log(`[TUYA-PROTOCOL] ✅ ${mappedCount} DP mappings configured`);
  }

  /**
   * Setup Tuya cluster listeners
   * SDK3: Utilise endpoint.on('frame') au lieu de gateway events
   */
  setupTuyaListeners() {
    try {
      const endpoint = this.zclNode.endpoints?.[1];
      if (!endpoint) return;

      // SDK3: Listen to raw frames from Tuya cluster
      endpoint.on('frame', (frame) => {
        if (frame.cluster === 0xEF00 || frame.cluster === 61184) {
          this.stats.dpReceived++;
          this.handleTuyaFrame(frame);
        }
      });

      this.device.log('[TUYA-PROTOCOL] ✅ Tuya listeners configured');
    } catch (err) {
      this.device.error('[TUYA-PROTOCOL] Failed to setup Tuya listeners:', err.message);
    }
  }

  /**
   * Setup Zigbee standard listeners
   */
  setupZigbeeListeners() {
    try {
      const endpoint = this.zclNode.endpoints?.[1];
      if (!endpoint) return;

      // SDK3: Standard cluster reporting handled by Homey automatically
      // We just track statistics
      this.device.log('[TUYA-PROTOCOL] ✅ Zigbee listeners configured (auto-handled by Homey)');
    } catch (err) {
      this.device.error('[TUYA-PROTOCOL] Failed to setup Zigbee listeners:', err.message);
    }
  }

  /**
   * Handle incoming Tuya frame
   * SDK3: Parse et route vers capabilities
   */
  handleTuyaFrame(frame) {
    try {
      if (!frame.data || frame.data.length === 0) return;

      // Parse with TuyaDPParser
      const parsed = TuyaDPParser.parse(frame.data);

      this.device.log(`[TUYA-PROTOCOL] 📥 DP${parsed.dpId} = ${JSON.stringify(parsed.dpValue)} (type: ${parsed.dpType})`);

      // Emit event for external handlers
      this.emit('datapoint', { dp: parsed.dpId, value: parsed.dpValue, type: parsed.dpType });

      // Auto-map to capability
      const mapping = this.dpMapping.get(parsed.dpId);
      if (mapping) {
        this.setCapabilityFromDP(mapping.capability, parsed.dpValue, mapping);
      } else {
        this.device.log(`[TUYA-PROTOCOL] ⚠️  Unmapped DP${parsed.dpId}`);
      }
    } catch (err) {
      this.stats.errors++;
      this.device.error('[TUYA-PROTOCOL] Frame parse error:', err.message);
    }
  }

  /**
   * Set capability value from DP
   * SDK3: Utilise this.device.setCapabilityValue()
   */
  setCapabilityFromDP(capability, value, mapping) {
    try {
      // Scale value if needed
      let scaledValue = value;
      if (mapping.scale && typeof value === 'number') {
        scaledValue = value / mapping.scale;
      }

      // Convert to boolean if needed
      if (mapping.type === TuyaDPParser.DP_TYPE.BOOL && typeof scaledValue !== 'boolean') {
        scaledValue = Boolean(scaledValue);
      }

      // SDK3: setCapabilityValue
      this.device.setCapabilityValue(capability, scaledValue)
        .then(() => {
          this.device.log(`[TUYA-PROTOCOL] ✅ ${capability} = ${scaledValue}`);
        })
        .catch(err => {
          this.stats.errors++;
          this.device.error(`[TUYA-PROTOCOL] Failed to set ${capability}:`, err.message);
        });
    } catch (err) {
      this.stats.errors++;
      this.device.error('[TUYA-PROTOCOL] Error setting capability:', err.message);
    }
  }

  /**
   * Send Tuya DP command
   * SDK3: Utilise endpoint.sendFrame() au lieu de gateway.sendDataPoint()
   *
   * @param {number} dp - Data Point ID
   * @param {any} value - Value to send
   * @param {number} [dpType] - DP Type (auto-detected if not provided)
   */
  async sendDP(dp, value, dpType = null) {
    try {
      this.device.log(`[TUYA-PROTOCOL] 📤 Sending DP${dp} = ${value}`);

      const endpoint = this.zclNode.endpoints?.[1];
      if (!endpoint) {
        throw new Error('Endpoint not available');
      }

      // Auto-detect DP type from mapping if not provided
      if (dpType === null) {
        const mapping = this.dpMapping.get(dp);
        dpType = mapping ? mapping.type : TuyaDPParser.DP_TYPE.RAW;
      }

      // Scale value if needed
      const mapping = this.dpMapping.get(dp);
      let scaledValue = value;
      if (mapping && mapping.scale && typeof value === 'number') {
        scaledValue = Math.round(value * mapping.scale);
      }

      // Encode with TuyaDPParser
      const buffer = TuyaDPParser.encode(dp, dpType, scaledValue);

      // SDK3: Send via endpoint, not gateway
      await endpoint.sendFrame(0xEF00, buffer, 0x00);

      this.stats.dpSent++;
      this.device.log(`[TUYA-PROTOCOL] ✅ DP${dp} sent successfully`);

      return true;
    } catch (err) {
      this.stats.errors++;
      this.device.error(`[TUYA-PROTOCOL] Failed to send DP${dp}:`, err.message);
      return false;
    }
  }

  /**
   * Get protocol for a capability
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
   * Get comprehensive status
   */
  getStatus() {
    return {
      protocol: this.protocol,
      hasTuyaCluster: !!this.clusterCache,
      mappedCapabilities: this.capabilities.size,
      dpMappings: this.dpMapping.size,
      statistics: this.stats,
      capabilities: Array.from(this.capabilities.entries()),
      dpList: Array.from(this.dpMapping.entries()).map(([dp, config]) => ({
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
    this.clusterCache = null;
    this.removeAllListeners();
  }
}

module.exports = TuyaProtocolManager;
