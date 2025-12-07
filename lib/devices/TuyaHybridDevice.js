'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const BatteryCalculator = require('../battery/BatteryCalculator');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║            TUYA HYBRID DEVICE - v5.5.47                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  Base class for devices that support BOTH Zigbee standard AND Tuya DP       ║
 * ║                                                                              ║
 * ║  ARCHITECTURE (per user specs):                                              ║
 * ║  ┌─────────────────────────────────────────────────────────────────────────┐ ║
 * ║  │ cluster {}         → Zigbee standard RECEPTION                         │ ║
 * ║  │ boundCluster {}    → Zigbee standard COMMANDS (Homey → Device)         │ ║
 * ║  │ tuyaCluster {}     → Tuya DP RECEPTION (Device → Homey via 0xEF00)     │ ║
 * ║  │ tuyaBoundCluster {}→ Tuya DP COMMANDS (Homey → Device via 0xEF00)      │ ║
 * ║  └─────────────────────────────────────────────────────────────────────────┘ ║
 * ║                                                                              ║
 * ║  HYBRID MODE:                                                                ║
 * ║  - Both paths active by default                                              ║
 * ║  - After 15 min: auto-disable unused path                                    ║
 * ║  - Known devices: use database to skip detection                             ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// Tuya DP data types
const TUYA_DP_TYPE = {
  RAW: 0x00,
  BOOL: 0x01,
  VALUE: 0x02,
  STRING: 0x03,
  ENUM: 0x04,
  BITMAP: 0x05,
};

class TuyaHybridDevice extends ZigBeeDevice {

  /**
   * Override in subclass: DP mappings for Tuya
   * Example:
   * {
   *   3: { capability: 'measure_humidity', divisor: 1 },
   *   5: { capability: 'measure_temperature', divisor: 10 },
   *   15: { capability: 'measure_battery', divisor: 1 },
   * }
   */
  get dpMappings() { return {}; }

  /**
   * Override in subclass: Battery configuration
   * Example:
   * {
   *   chemistry: 'cr2032',        // From BatteryCalculator.CHEMISTRY
   *   algorithm: 'direct',        // From BatteryCalculator.ALGORITHM
   *   dpId: 15,                   // Tuya DP for battery %
   *   dpIdState: 14,              // Tuya DP for battery state enum (optional)
   *   voltageMin: 2.0,            // Min voltage (0%)
   *   voltageMax: 3.0,            // Max voltage (100%)
   * }
   */
  get batteryConfig() {
    return {
      chemistry: BatteryCalculator.CHEMISTRY.CR2032,
      algorithm: BatteryCalculator.ALGORITHM.DIRECT,
      dpId: 15,
      dpIdState: null,
      voltageMin: 2.0,
      voltageMax: 3.0,
    };
  }

  /**
   * Override in subclass: ZCL cluster handlers
   * Example:
   * {
   *   temperatureMeasurement: {
   *     attributeReport: (data) => this._handleZclReport('temperature', data)
   *   }
   * }
   */
  get clusterHandlers() { return {}; }

  /**
   * Override: Is this device mains powered?
   */
  get mainsPowered() { return true; }

  /**
   * Override: Max listeners
   */
  get maxListeners() { return 50; }

  async onNodeInit({ zclNode }) {
    // Prevent double init
    if (this._tuyaHybridInited) {
      this.log('[HYBRID] ⚠️ Already initialized');
      return;
    }
    this._tuyaHybridInited = true;

    this.zclNode = zclNode;

    this.log('');
    this.log('╔══════════════════════════════════════════════════════════════╗');
    this.log('║          TUYA HYBRID DEVICE v5.5.46                          ║');
    this.log('╚══════════════════════════════════════════════════════════════╝');

    // Get device info
    const settings = this.getSettings?.() || {};
    this._modelId = settings.zb_modelId || '';
    this._manufacturer = settings.zb_manufacturerName || '';

    this.log(`[HYBRID] Model: ${this._modelId}`);
    this.log(`[HYBRID] Manufacturer: ${this._manufacturer}`);

    // Hybrid mode state
    this._hybridMode = {
      enabled: true,
      zigbeeActive: true,
      tuyaActive: true,
      decided: false,
      decidedMode: null,
      zigbeeHits: 0,
      tuyaHits: 0,
    };

    // Bump max listeners
    this._bumpMaxListeners(zclNode);

    // Setup both paths
    await Promise.all([
      this._setupTuyaClusterHandlers(zclNode),
      this._setupZigbeeClusterHandlers(zclNode),
    ]);

    // Schedule hybrid mode decision
    this._scheduleHybridDecision();

    this.log('[HYBRID] ✅ Initialization complete');
  }

  /**
   * Bump max listeners to avoid warnings
   */
  _bumpMaxListeners(zclNode) {
    try {
      if (!zclNode?.endpoints) return;
      for (const endpoint of Object.values(zclNode.endpoints)) {
        if (typeof endpoint.setMaxListeners === 'function') {
          endpoint.setMaxListeners(this.maxListeners);
        }
        for (const cluster of Object.values(endpoint?.clusters || {})) {
          if (typeof cluster?.setMaxListeners === 'function') {
            cluster.setMaxListeners(this.maxListeners);
          }
        }
      }
    } catch (e) { /* ignore */ }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * TUYA CLUSTER HANDLERS (tuyaCluster equivalent)
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async _setupTuyaClusterHandlers(zclNode) {
    this.log('[TUYA-CLUSTER] Setting up Tuya DP handlers...');

    const endpoint = zclNode?.endpoints?.[1];
    if (!endpoint) {
      this.log('[TUYA-CLUSTER] ⚠️ No endpoint 1');
      return;
    }

    // Get tuya cluster (NAME='tuya' from TuyaSpecificCluster)
    const tuyaCluster = endpoint.clusters?.tuya
      || endpoint.clusters?.tuyaSpecific
      || endpoint.clusters?.[61184]
      || endpoint.clusters?.[0xEF00];

    if (tuyaCluster) {
      this.log('[TUYA-CLUSTER] ✅ Tuya cluster found');

      // Listen to response event (command 0x01)
      if (typeof tuyaCluster.on === 'function') {
        tuyaCluster.on('response', (data) => {
          this.log('[TUYA-CLUSTER] 📥 response event:', JSON.stringify(data));
          this._registerTuyaHit();
          this._processTuyaData(data);
        });

        // Listen to reporting event (command 0x02)
        tuyaCluster.on('reporting', (data) => {
          this.log('[TUYA-CLUSTER] 📥 reporting event:', JSON.stringify(data));
          this._registerTuyaHit();
          this._processTuyaData(data);
        });

        // Listen to dp event (parsed DP)
        tuyaCluster.on('dp', (dpId, value, dpType) => {
          this.log(`[TUYA-CLUSTER] 📥 DP${dpId} = ${value} (type: ${dpType})`);
          this._registerTuyaHit();
          this._handleDP(dpId, value);
        });

        this.log('[TUYA-CLUSTER] ✅ Event listeners registered');
      } else {
        this.log('[TUYA-CLUSTER] ⚠️ Cluster has no .on() method');
      }
    } else {
      this.log('[TUYA-CLUSTER] ⚠️ Tuya cluster not found');
      this.log('[TUYA-CLUSTER] Available clusters:', Object.keys(endpoint.clusters || {}).join(', '));
    }

    // Also setup raw frame listener as fallback
    this._setupRawFrameListener(endpoint);
  }

  /**
   * Setup raw frame listener for 0xEF00 frames
   */
  _setupRawFrameListener(endpoint) {
    try {
      if (typeof endpoint.on !== 'function') return;

      endpoint.on('frame', (frame) => {
        if (frame.cluster === 0xEF00 || frame.cluster === 61184) {
          this.log('[TUYA-RAW] 📥 Raw frame:', JSON.stringify({
            cluster: frame.cluster,
            command: frame.command,
            dataHex: frame.data?.toString('hex')
          }));
          this._registerTuyaHit();

          if (frame.data && frame.data.length > 2) {
            this._parseTuyaRawFrame(frame.data);
          }
        }
      });
      this.log('[TUYA-RAW] ✅ Raw frame listener registered');
    } catch (e) {
      this.log('[TUYA-RAW] ⚠️ Raw frame listener failed:', e.message);
    }
  }

  /**
   * Parse raw Tuya frame
   * Format: [seq:2][dpId:1][type:1][len:2][data:len]
   */
  _parseTuyaRawFrame(buffer) {
    try {
      if (buffer.length < 6) return;

      let offset = 2; // Skip sequence number

      while (offset + 4 <= buffer.length) {
        const dpId = buffer.readUInt8(offset);
        const dpType = buffer.readUInt8(offset + 1);
        const length = buffer.readUInt16BE(offset + 2);
        offset += 4;

        if (offset + length > buffer.length) break;

        let value;
        const dataSlice = buffer.slice(offset, offset + length);

        switch (dpType) {
          case TUYA_DP_TYPE.BOOL:
            value = dataSlice.readUInt8(0) === 1;
            break;
          case TUYA_DP_TYPE.VALUE:
            value = dataSlice.readInt32BE(0);
            break;
          case TUYA_DP_TYPE.ENUM:
            value = dataSlice.readUInt8(0);
            break;
          case TUYA_DP_TYPE.STRING:
            value = dataSlice.toString('utf8');
            break;
          default:
            value = dataSlice;
        }

        this.log(`[TUYA-RAW] Parsed DP${dpId} type=${dpType} value=${value}`);
        this._handleDP(dpId, value);

        offset += length;
      }
    } catch (e) {
      this.log('[TUYA-RAW] Parse error:', e.message);
    }
  }

  /**
   * Process Tuya data from cluster events
   */
  _processTuyaData(data) {
    if (!data) return;

    // Handle dpValues buffer
    if (data.dpValues && Buffer.isBuffer(data.dpValues)) {
      this._parseTuyaRawFrame(Buffer.concat([Buffer.alloc(2), data.dpValues]));
    }
    // Handle parsed data
    else if (data.dp !== undefined) {
      this._handleDP(data.dp, data.value || data.data);
    }
  }

  /**
   * Handle a single DP value
   */
  _handleDP(dpId, value) {
    if (!this._hybridMode.tuyaActive) {
      this.log(`[TUYA-DP] Ignoring DP${dpId} - Tuya mode disabled`);
      return;
    }

    const mapping = this.dpMappings[dpId];
    const batteryConfig = this.batteryConfig;

    // ═══════════════════════════════════════════════════════════════════════
    // BATTERY HANDLING - Special processing with BatteryCalculator
    // ═══════════════════════════════════════════════════════════════════════
    if (dpId === batteryConfig.dpId || dpId === batteryConfig.dpIdState) {
      this._handleBatteryDP(dpId, value);
      return;
    }

    if (!mapping) {
      this.log(`[TUYA-DP] DP${dpId} = ${value} (no mapping)`);
      return;
    }

    // Skip settings
    if (!mapping.capability) {
      this.log(`[TUYA-DP] DP${dpId} = ${value} (setting: ${mapping.setting})`);
      return;
    }

    // Transform value
    let finalValue = value;
    if (mapping.transform) {
      finalValue = mapping.transform(value);
    } else if (mapping.divisor) {
      finalValue = value / mapping.divisor;
    }

    this.log(`[TUYA-DP] DP${dpId} → ${mapping.capability} = ${finalValue} (raw: ${value})`);

    // Set capability
    if (this.hasCapability(mapping.capability)) {
      this.setCapabilityValue(mapping.capability, finalValue).catch(err => {
        this.error(`Failed to set ${mapping.capability}:`, err.message);
      });
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * BATTERY DP HANDLING - Ultra-precise with BatteryCalculator
   * ═══════════════════════════════════════════════════════════════════════════
   */
  _handleBatteryDP(dpId, value) {
    const config = this.batteryConfig;
    let percentage;

    this.log(`[BATTERY] DP${dpId} raw=${value}`);

    // Determine algorithm based on which DP we received
    if (dpId === config.dpIdState) {
      // Battery state enum (low/medium/high)
      percentage = BatteryCalculator.calculate(value, {
        algorithm: BatteryCalculator.ALGORITHM.ENUM_3,
      });
      this.log(`[BATTERY] State enum: ${value} → ${percentage}%`);
    } else if (dpId === config.dpId) {
      // Battery percentage/voltage
      percentage = BatteryCalculator.calculate(value, {
        algorithm: config.algorithm,
        chemistry: config.chemistry,
        voltageMin: config.voltageMin,
        voltageMax: config.voltageMax,
      });
      this.log(`[BATTERY] ${config.algorithm}: ${value} → ${percentage}% (chemistry: ${config.chemistry})`);
    }

    if (percentage !== null && this.hasCapability('measure_battery')) {
      this.setCapabilityValue('measure_battery', percentage).catch(err => {
        this.error('Failed to set battery:', err.message);
      });

      // Check low battery
      if (BatteryCalculator.isLow(percentage)) {
        this.log(`[BATTERY] ⚠️ Low battery: ${percentage}%`);
        if (this.hasCapability('alarm_battery')) {
          this.setCapabilityValue('alarm_battery', true).catch(() => { });
        }
      }
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * ZIGBEE CLUSTER HANDLERS (cluster equivalent)
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async _setupZigbeeClusterHandlers(zclNode) {
    this.log('[ZCL-CLUSTER] Setting up Zigbee standard handlers...');

    const handlers = this.clusterHandlers;
    if (!handlers || Object.keys(handlers).length === 0) {
      this.log('[ZCL-CLUSTER] No cluster handlers defined');
      return;
    }

    for (const [clusterName, clusterHandler] of Object.entries(handlers)) {
      try {
        // Find cluster on any endpoint
        for (const [epId, endpoint] of Object.entries(zclNode.endpoints || {})) {
          const cluster = endpoint.clusters?.[clusterName];
          if (!cluster) continue;

          this.log(`[ZCL-CLUSTER] Found ${clusterName} on EP${epId}`);

          // Setup attribute report listener
          if (clusterHandler.attributeReport && typeof cluster.on === 'function') {
            cluster.on('attr', (attrName, value) => {
              this.log(`[ZCL-CLUSTER] ${clusterName}.${attrName} = ${value}`);
              this._registerZigbeeHit();
              if (this._hybridMode.zigbeeActive) {
                clusterHandler.attributeReport.call(this, { [attrName]: value });
              }
            });
            this.log(`[ZCL-CLUSTER] ✅ ${clusterName} attr listener registered`);
          }
        }
      } catch (e) {
        this.log(`[ZCL-CLUSTER] Error setting up ${clusterName}:`, e.message);
      }
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * HYBRID MODE MANAGEMENT
   * ═══════════════════════════════════════════════════════════════════════════
   */
  _registerTuyaHit() {
    if (!this._hybridMode.enabled) return;
    this._hybridMode.tuyaHits++;
  }

  _registerZigbeeHit() {
    if (!this._hybridMode.enabled) return;
    this._hybridMode.zigbeeHits++;
  }

  _scheduleHybridDecision() {
    // 15 minutes
    const DURATION_MS = 15 * 60 * 1000;

    this._hybridTimeout = this.homey.setTimeout(() => {
      this._finalizeHybridMode();
    }, DURATION_MS);

    this.log('[HYBRID] ⏰ Mode decision scheduled in 15 minutes');
  }

  _finalizeHybridMode() {
    const mode = this._hybridMode;

    this.log('[HYBRID] ════════════════════════════════════════════════════');
    this.log('[HYBRID] ⚡ HYBRID MODE DECISION (15 min elapsed)');
    this.log(`[HYBRID] Tuya hits: ${mode.tuyaHits}`);
    this.log(`[HYBRID] Zigbee hits: ${mode.zigbeeHits}`);
    this.log('[HYBRID] ════════════════════════════════════════════════════');

    if (mode.tuyaHits > 0 && mode.zigbeeHits === 0) {
      mode.zigbeeActive = false;
      mode.decided = true;
      mode.decidedMode = 'tuya';
      this.log('[HYBRID] ✅ Decision: TUYA ONLY');
    } else if (mode.zigbeeHits > 0 && mode.tuyaHits === 0) {
      mode.tuyaActive = false;
      mode.decided = true;
      mode.decidedMode = 'zigbee';
      this.log('[HYBRID] ✅ Decision: ZIGBEE ONLY');
    } else if (mode.tuyaHits > 0 && mode.zigbeeHits > 0) {
      mode.decided = true;
      mode.decidedMode = 'hybrid';
      this.log('[HYBRID] ✅ Decision: KEEP HYBRID (both active)');
    } else {
      this.log('[HYBRID] ⚠️ No data received - keeping hybrid mode');
    }

    // Save decision
    this.setStoreValue('hybrid_mode', mode.decidedMode).catch(() => { });
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * TUYA BOUND CLUSTER (tuyaBoundCluster equivalent) - COMMANDS
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async sendTuyaDP(dpId, value, dpType = TUYA_DP_TYPE.VALUE) {
    this.log(`[TUYA-CMD] Sending DP${dpId} = ${value} (type: ${dpType})`);

    const endpoint = this.zclNode?.endpoints?.[1];
    const tuyaCluster = endpoint?.clusters?.tuya;

    if (!tuyaCluster) {
      this.log('[TUYA-CMD] ⚠️ Tuya cluster not available');
      return false;
    }

    try {
      // Build DP payload
      const payload = this._buildDPPayload(dpId, value, dpType);

      // Send via setData command (0x00)
      if (typeof tuyaCluster.setData === 'function') {
        await tuyaCluster.setData({
          seq: this._getNextSeq(),
          dpValues: payload
        });
        this.log('[TUYA-CMD] ✅ DP sent successfully');
        return true;
      }
    } catch (e) {
      this.log('[TUYA-CMD] ⚠️ Send failed:', e.message);
    }
    return false;
  }

  _buildDPPayload(dpId, value, dpType) {
    let data;

    switch (dpType) {
      case TUYA_DP_TYPE.BOOL:
        data = Buffer.alloc(1);
        data.writeUInt8(value ? 1 : 0, 0);
        break;
      case TUYA_DP_TYPE.VALUE:
        data = Buffer.alloc(4);
        data.writeInt32BE(value, 0);
        break;
      case TUYA_DP_TYPE.ENUM:
        data = Buffer.alloc(1);
        data.writeUInt8(value, 0);
        break;
      default:
        data = Buffer.from([value]);
    }

    // [dpId:1][type:1][len:2][data:len]
    const payload = Buffer.alloc(4 + data.length);
    payload.writeUInt8(dpId, 0);
    payload.writeUInt8(dpType, 1);
    payload.writeUInt16BE(data.length, 2);
    data.copy(payload, 4);

    return payload;
  }

  _getNextSeq() {
    this._seq = ((this._seq || 0) + 1) % 65536;
    return this._seq;
  }

  /**
   * Cleanup
   */
  onDeleted() {
    if (this._hybridTimeout) {
      this.homey.clearTimeout(this._hybridTimeout);
    }
    this.log('[HYBRID] Device deleted');
  }
}

// Export with DP types
TuyaHybridDevice.TUYA_DP_TYPE = TUYA_DP_TYPE;

module.exports = TuyaHybridDevice;
