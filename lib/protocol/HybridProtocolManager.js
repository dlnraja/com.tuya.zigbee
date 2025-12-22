'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      🔀 HYBRID PROTOCOL MANAGER - v5.5.41 INTELLIGENT PROTOCOL DETECTION     ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  Gestion intelligente Tuya DP + Zigbee Native + BoundClusters                ║
 * ║                                                                              ║
 * ║  STRATÉGIE:                                                                  ║
 * ║  1. Consulte KnownProtocolsDatabase pour devices connus                      ║
 * ║  2. Si inconnu → active TOUS les protocoles (hybrid)                         ║
 * ║  3. Track les stats de réception par protocole                               ║
 * ║  4. Après 15 min → désactive protocoles sans données reçues                  ║
 * ║  5. Raison du délai: constructeurs chinois = surprises possibles             ║
 * ║                                                                              ║
 * ║  PROTOCOLES SUPPORTÉS:                                                       ║
 * ║  - TuyaBoundCluster (dataReport 0x02)                                        ║
 * ║  - TuyaSpecificCluster (events)                                              ║
 * ║  - ZCL BoundCluster (IASZone, OnOff commands)                                ║
 * ║  - ZCL Attribute Reports                                                     ║
 * ║  - ZCL Polling (fallback)                                                    ║
 * ║                                                                              ║
 * ║  Sources:                                                                    ║
 * ║  - Tuya Developer: https://developer.tuya.com/en/docs                        ║
 * ║  - Athom BoundCluster: https://athombv.github.io/node-zigbee-clusters        ║
 * ║  - Z2M tuya.ts: https://github.com/Koenkk/zigbee-herdsman-converters         ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

let TuyaProtocolManager;
try {
  TuyaProtocolManager = require('./TuyaProtocolManager');
} catch (e) {
  TuyaProtocolManager = null;
}

let TuyaDPParser;
try {
  TuyaDPParser = require('../tuya/TuyaDPParser');
} catch (e) {
  TuyaDPParser = null;
}

const {
  PROTOCOL,
  DATA_METHOD,
  lookupProtocol,
  isTuyaDPManufacturer,
  isTuyaDPProductId
} = require('./KnownProtocolsDatabase');

// Auto-disable timeout (15 minutes)
const PROTOCOL_OPTIMIZATION_DELAY = 15 * 60 * 1000;

class HybridProtocolManager {

  constructor(device) {
    this.device = device;
    this.protocol = null; // 'tuya_dp', 'zcl_standard', 'hybrid', 'unknown'
    this.capabilities = new Map(); // capability → protocol mapping
    this.dpMapping = new Map(); // DP → capability mapping

    // v5.5.41: Protocol stats tracking
    this._protocolStats = {
      tuya_bound: { received: 0, lastTime: null, enabled: true },
      tuya_cluster: { received: 0, lastTime: null, enabled: true },
      zcl_bound: { received: 0, lastTime: null, enabled: true },
      zcl_attr: { received: 0, lastTime: null, enabled: true },
      zcl_poll: { received: 0, lastTime: null, enabled: true },
    };

    // v5.5.41: Known protocol info from database
    this._knownProtocolInfo = null;

    // v5.5.41: Optimization timer
    this._optimizationTimer = null;
  }

  /**
   * v5.5.41: Initialize with smart protocol detection
   */
  async initialize(zclNode, manufacturerName, productId) {
    this.device.log('[HYBRID] ════════════════════════════════════════════════════');
    this.device.log('[HYBRID] v5.5.41 INTELLIGENT PROTOCOL MANAGER');
    this.device.log('[HYBRID] ════════════════════════════════════════════════════');
    this.device.log(`[HYBRID] Manufacturer: ${manufacturerName || '(unknown)'}`);
    this.device.log(`[HYBRID] ProductId: ${productId || '(unknown)'}`);

    // Step 1: Check known protocols database
    this._knownProtocolInfo = lookupProtocol(manufacturerName, productId);

    if (this._knownProtocolInfo) {
      this.device.log(`[HYBRID] ✅ KNOWN DEVICE (source: ${this._knownProtocolInfo.source})`);
      this.device.log(`[HYBRID] Protocol: ${this._knownProtocolInfo.protocol}`);
      this.device.log(`[HYBRID] Notes: ${this._knownProtocolInfo.notes || 'none'}`);
      this.protocol = this._knownProtocolInfo.protocol;

      // If known, pre-configure which protocols to enable
      this._configureKnownProtocols();
    } else {
      // Unknown device - use hybrid mode
      this.device.log('[HYBRID] ⚠️ UNKNOWN DEVICE - Using HYBRID mode (all protocols active)');
      this.protocol = PROTOCOL.HYBRID;
    }

    // Step 2: Detect available clusters
    await this.detectProtocol(zclNode);

    // Step 3: Schedule optimization after 15 minutes
    this._scheduleOptimization();

    return this.protocol;
  }

  /**
   * v5.5.41: Configure protocols based on known database
   */
  _configureKnownProtocols() {
    const info = this._knownProtocolInfo;
    if (!info) return;

    // Disable unused protocols based on known info
    if (info.protocol === PROTOCOL.TUYA_DP) {
      // Tuya DP only - disable ZCL methods
      this._protocolStats.zcl_attr.enabled = false;
      this._protocolStats.zcl_poll.enabled = false;
      this.device.log('[HYBRID] 📊 Pre-configured: Tuya DP only (ZCL attr/poll disabled)');
    } else if (info.protocol === PROTOCOL.ZCL_STANDARD) {
      // ZCL only - disable Tuya methods
      this._protocolStats.tuya_bound.enabled = false;
      this._protocolStats.tuya_cluster.enabled = false;
      this.device.log('[HYBRID] 📊 Pre-configured: ZCL only (Tuya disabled)');
    }
    // HYBRID = keep all enabled
  }

  /**
   * v5.5.41: Schedule protocol optimization after 15 minutes
   */
  _scheduleOptimization() {
    if (this._optimizationTimer) {
      this.device.homey.clearTimeout(this._optimizationTimer);
    }

    this._optimizationTimer = this.device.homey.setTimeout(() => {
      this._optimizeProtocols();
    }, PROTOCOL_OPTIMIZATION_DELAY);

    this.device.log('[HYBRID] ⏰ Protocol optimization scheduled in 15 minutes');
  }

  /**
   * v5.5.41: Optimize protocols - disable those with no data received
   */
  _optimizeProtocols() {
    this.device.log('[HYBRID] ════════════════════════════════════════════════════');
    this.device.log('[HYBRID] ⚡ PROTOCOL OPTIMIZATION (15 min elapsed)');
    this.device.log('[HYBRID] ════════════════════════════════════════════════════');

    let activeProtocols = [];
    let disabledProtocols = [];

    for (const [name, stats] of Object.entries(this._protocolStats)) {
      if (!stats.enabled) {
        // Already disabled
        continue;
      }

      if (stats.received > 0) {
        activeProtocols.push(`${name} (${stats.received} msgs)`);
      } else {
        // No data received - disable
        stats.enabled = false;
        disabledProtocols.push(name);
      }
    }

    this.device.log(`[HYBRID] ✅ Active protocols: ${activeProtocols.join(', ') || 'none'}`);
    this.device.log(`[HYBRID] ❌ Disabled protocols: ${disabledProtocols.join(', ') || 'none'}`);

    // Update protocol mode based on what's active
    if (activeProtocols.length === 0) {
      this.device.log('[HYBRID] ⚠️ No data received on ANY protocol - keeping all enabled');
      // Re-enable all
      for (const stats of Object.values(this._protocolStats)) {
        stats.enabled = true;
      }
    } else if (activeProtocols.every(p => p.startsWith('tuya'))) {
      this.protocol = PROTOCOL.TUYA_DP;
      this.device.log('[HYBRID] 📊 Optimized to: TUYA_DP mode');
    } else if (activeProtocols.every(p => p.startsWith('zcl'))) {
      this.protocol = PROTOCOL.ZCL_STANDARD;
      this.device.log('[HYBRID] 📊 Optimized to: ZCL_STANDARD mode');
    } else {
      this.protocol = PROTOCOL.HYBRID;
      this.device.log('[HYBRID] 📊 Optimized to: HYBRID mode (multiple protocols active)');
    }

    // Store optimization result
    this.device.setStoreValue('protocol_optimized', this.protocol).catch(() => { });
    this.device.setStoreValue('protocol_stats', this._protocolStats).catch(() => { });
  }

  /**
   * v5.5.41: Track data reception by protocol
   */
  trackDataReceived(protocolMethod) {
    if (this._protocolStats[protocolMethod]) {
      this._protocolStats[protocolMethod].received++;
      this._protocolStats[protocolMethod].lastTime = Date.now();
      this.device.log(`[HYBRID] 📥 Data via ${protocolMethod} (total: ${this._protocolStats[protocolMethod].received})`);
    }
  }

  /**
   * v5.5.41: Check if a protocol method is enabled
   */
  isProtocolEnabled(protocolMethod) {
    return this._protocolStats[protocolMethod]?.enabled !== false;
  }

  /**
   * v5.5.41: Get protocol stats summary
   */
  getProtocolStats() {
    return {
      currentProtocol: this.protocol,
      knownInfo: this._knownProtocolInfo,
      stats: this._protocolStats,
    };
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
    // Clear optimization timer
    if (this._optimizationTimer) {
      this.device.homey.clearTimeout(this._optimizationTimer);
      this._optimizationTimer = null;
    }

    this.capabilities.clear();
    this.dpMapping.clear();

    this.device.log('[HYBRID] ✅ Cleanup complete');
  }
}

module.exports = HybridProtocolManager;
module.exports.PROTOCOL = PROTOCOL;
module.exports.DATA_METHOD = DATA_METHOD;
