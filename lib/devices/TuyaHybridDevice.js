'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { BoundCluster } = require('zigbee-clusters');
const BatteryCalculator = require('../battery/BatteryCalculator');
const { getAppVersionPrefixed } = require('../utils/AppVersion');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║            TUYA HYBRID DEVICE - Dynamic version from app.json                ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  Base class for devices that support BOTH Zigbee standard AND Tuya DP       ║
 * ║                                                                              ║
 * ║  ARCHITECTURE (Athom SDK pattern):                                           ║
 * ║  ┌─────────────────────────────────────────────────────────────────────────┐ ║
 * ║  │ 1. TuyaSpecificCluster  → Custom cluster 0xEF00 (Cluster.addCluster)   │ ║
 * ║  │ 2. TuyaBoundCluster     → BoundCluster for incoming DP commands        │ ║
 * ║  │ 3. endpoint.bind()      → Bind BoundCluster to receive data            │ ║
 * ║  │ 4. cluster.on()         → Event listeners as FALLBACK                  │ ║
 * ║  └─────────────────────────────────────────────────────────────────────────┘ ║
 * ║                                                                              ║
 * ║  FALLBACK CHAIN (robustness):                                                ║
 * ║  ┌─────────────────────────────────────────────────────────────────────────┐ ║
 * ║  │ Priority 1: BoundCluster.bind() → Official Athom pattern               │ ║
 * ║  │ Priority 2: cluster.on('response') → Community pattern                 │ ║
 * ║  │ Priority 3: endpoint.on('frame') → Raw frame fallback                  │ ║
 * ║  │ Priority 4: TuyaEF00Manager → Legacy manager                           │ ║
 * ║  └─────────────────────────────────────────────────────────────────────────┘ ║
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
    this.log(`║          TUYA HYBRID DEVICE ${getAppVersionPrefixed()}`.padEnd(62) + '║');
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
   * TUYA CLUSTER HANDLERS - MULTI-FALLBACK SYSTEM v5.5.48
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * Fallback chain (all methods tried, first success wins):
   * 1. BoundCluster.bind() - Official Athom SDK pattern
   * 2. cluster.on('response'|'reporting') - Community pattern
   * 3. endpoint.on('frame') - Raw frame fallback
   * 4. TuyaEF00Manager - Legacy compatibility
   */
  async _setupTuyaClusterHandlers(zclNode) {
    this.log('[TUYA] ════════════════════════════════════════════════════');
    this.log('[TUYA] Setting up MULTI-FALLBACK Tuya DP handlers...');
    this.log('[TUYA] ════════════════════════════════════════════════════');

    const endpoint = zclNode?.endpoints?.[1];
    if (!endpoint) {
      this.log('[TUYA] ⚠️ No endpoint 1');
      return;
    }

    // Track which methods succeeded
    this._tuyaListeners = {
      lowLevelNode: false,
      boundCluster: false,
      clusterEvents: false,
      rawFrames: false,
      legacyManager: false,
    };

    // ═══════════════════════════════════════════════════════════════════════
    // PRIORITY 0: LOW-LEVEL NODE handleFrame (CRITICAL FOR TS0601)
    // Reference: https://apps.developer.homey.app/wireless/zigbee#3-zigbee-api
    // This is the ONLY reliable way to receive frames from clusters not
    // declared by the device during interview (like 0xEF00 on TS0601)
    // ═══════════════════════════════════════════════════════════════════════
    try {
      await this._setupLowLevelNodeHandler();
    } catch (e) {
      this.log('[TUYA-P0] Low-level node handler failed:', e.message);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIORITY 1: BoundCluster (Official Athom SDK pattern)
    // Reference: https://athombv.github.io/node-zigbee-clusters/
    // ═══════════════════════════════════════════════════════════════════════
    try {
      await this._setupTuyaBoundCluster(endpoint);
    } catch (e) {
      this.log('[TUYA-P1] BoundCluster failed:', e.message);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIORITY 2: Cluster event listeners (Community pattern)
    // Pattern: zclNode.endpoints[1].clusters.tuya.on('response', ...)
    // ═══════════════════════════════════════════════════════════════════════
    try {
      await this._setupTuyaClusterEvents(endpoint);
    } catch (e) {
      this.log('[TUYA-P2] Cluster events failed:', e.message);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIORITY 3: Raw frame listener (Fallback)
    // ═══════════════════════════════════════════════════════════════════════
    try {
      this._setupRawFrameListener(endpoint);
    } catch (e) {
      this.log('[TUYA-P3] Raw frames failed:', e.message);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIORITY 4: Legacy TuyaEF00Manager (compatibility)
    // ═══════════════════════════════════════════════════════════════════════
    try {
      await this._setupLegacyTuyaManager(zclNode);
    } catch (e) {
      this.log('[TUYA-P4] Legacy manager failed:', e.message);
    }

    // Log summary
    this.log('[TUYA] ════════════════════════════════════════════════════');
    this.log('[TUYA] FALLBACK STATUS:');
    this.log(`[TUYA]   P0 LowLevelNode:   ${this._tuyaListeners.lowLevelNode ? '✅' : '❌'}`);
    this.log(`[TUYA]   P1 BoundCluster:   ${this._tuyaListeners.boundCluster ? '✅' : '❌'}`);
    this.log(`[TUYA]   P2 ClusterEvents:  ${this._tuyaListeners.clusterEvents ? '✅' : '❌'}`);
    this.log(`[TUYA]   P3 RawFrames:      ${this._tuyaListeners.rawFrames ? '✅' : '❌'}`);
    this.log(`[TUYA]   P4 LegacyManager:  ${this._tuyaListeners.legacyManager ? '✅' : '❌'}`);
    this.log('[TUYA] ════════════════════════════════════════════════════');
  }

  /**
   * PRIORITY 0: Setup LOW-LEVEL NODE handleFrame
   *
   * v5.5.79: THE CRITICAL FIX FOR TS0601 DEVICES
   *
   * Per Athom SDK docs (https://apps.developer.homey.app/wireless/zigbee):
   * "override the handleFrame method on ZigBeeNode, this method is called
   * when a frame is received and if it is not overridden it will throw"
   *
   * This is the ONLY reliable way to receive frames from clusters that are
   * NOT declared by the device during Zigbee interview (like 0xEF00 on TS0601).
   *
   * The high-level zclNode API (BoundCluster, cluster.on()) only works for
   * clusters that the device announces. TS0601 devices do NOT announce 0xEF00.
   */
  async _setupLowLevelNodeHandler() {
    this.log('[TUYA-P0] Setting up LOW-LEVEL NODE handleFrame...');
    this.log('[TUYA-P0] This is the ONLY way to receive 0xEF00 frames from TS0601');

    try {
      // Get the low-level ZigBeeNode via Homey's Zigbee API
      const node = await this.homey.zigbee.getNode(this);

      if (!node) {
        this.log('[TUYA-P0] ⚠️ Could not get ZigBeeNode from homey.zigbee');
        return;
      }

      this.log('[TUYA-P0] ✅ Got ZigBeeNode via homey.zigbee.getNode()');

      // Store reference for sending frames later
      this._zigbeeNode = node;

      // Override handleFrame to intercept ALL incoming frames
      const device = this;
      const originalHandleFrame = node.handleFrame?.bind(node);

      node.handleFrame = (endpointId, clusterId, frame, meta) => {
        // Log ALL frames for debugging
        device.log(`[TUYA-P0] 📦 FRAME RECEIVED: endpoint=${endpointId}, cluster=${clusterId} (0x${clusterId.toString(16)})`);

        // Check for Tuya cluster 0xEF00 (61184 decimal)
        if (clusterId === 0xEF00 || clusterId === 61184) {
          device.log('[TUYA-P0] ════════════════════════════════════════════════════');
          device.log('[TUYA-P0] 🎉 TUYA 0xEF00 FRAME RECEIVED!');
          device.log(`[TUYA-P0] Endpoint: ${endpointId}`);
          device.log(`[TUYA-P0] Frame length: ${frame?.length || 0}`);
          if (frame) {
            device.log(`[TUYA-P0] Frame hex: ${frame.toString('hex')}`);
          }
          device.log('[TUYA-P0] ════════════════════════════════════════════════════');

          // Register Tuya hit for hybrid mode decision
          device._registerTuyaHit();

          // Parse Tuya DP frame
          if (frame && frame.length > 2) {
            device._parseTuyaRawFrame(frame);
          }
        }

        // Call original handler if it exists (to not break other functionality)
        if (typeof originalHandleFrame === 'function') {
          try {
            return originalHandleFrame(endpointId, clusterId, frame, meta);
          } catch (e) {
            // Ignore errors from original handler (it may throw for unknown clusters)
          }
        }
      };

      this.log('[TUYA-P0] ✅ handleFrame override installed');
      this._tuyaListeners.lowLevelNode = true;

    } catch (e) {
      this.log('[TUYA-P0] ❌ Failed:', e.message);
      this.error('[TUYA-P0] Stack:', e.stack);
    }
  }

  /**
   * PRIORITY 1: Setup TuyaBoundCluster (Athom SDK pattern)
   *
   * Per Athom docs: "Zigbee nodes can send commands to Homey via bound clusters"
   * This requires binding a BoundCluster implementation to the endpoint.
   */
  async _setupTuyaBoundCluster(endpoint) {
    this.log('[TUYA-P1] Setting up BoundCluster (Athom pattern)...');

    // Create inline BoundCluster for Tuya
    const device = this;

    class TuyaInlineBoundCluster extends BoundCluster {
      /**
       * v5.5.77: RESTORED FROM v5.5.46 (working version)
       *
       * CRITICAL: Method names MUST be 'response' and 'reporting'
       * to match TuyaSpecificCluster.COMMANDS
       *
       * Payload structure from TuyaSpecificCluster:
       * { seq: uint16, dpValues: Buffer }
       */

      // Helper to log and process any payload
      _handleTuyaPayload(cmdName, payload) {
        try {
          device.log(`[TUYA-BOUND] 📥 ${cmdName} received`);

          // Log payload for debugging
          if (payload && typeof payload === 'object') {
            if (payload.seq !== undefined) {
              device.log(`[TUYA-BOUND] seq: ${payload.seq}`);
            }
            if (payload.dpValues) {
              device.log(`[TUYA-BOUND] dpValues: ${Buffer.isBuffer(payload.dpValues) ? payload.dpValues.toString('hex') : JSON.stringify(payload.dpValues)}`);
            }
          }

          device._registerTuyaHit();
          device._processTuyaData(payload);
        } catch (err) {
          device.log(`[TUYA-BOUND] Error handling ${cmdName}:`, err.message);
        }
      }

      /**
       * Response to getData (0x01) - device responds to our query
       * CRITICAL: Method name MUST be 'response' to match COMMANDS.response
       */
      response(payload) {
        this._handleTuyaPayload('response', payload);
      }

      /**
       * Spontaneous dataReport (0x02) - device sends data unprompted
       * CRITICAL: Method name MUST be 'reporting' to match COMMANDS.reporting
       */
      reporting(payload) {
        this._handleTuyaPayload('reporting', payload);
      }

      /**
       * MCU sync time (0x24) - device requests time
       */
      mcuSyncTime(payload) {
        device.log('[TUYA-BOUND] ⏰ mcuSyncTime received');
        device._registerTuyaHit();
        device._respondToTimeSync?.();
      }
    }

    // Try to bind with different cluster names
    const clusterNames = ['tuya', 'tuyaSpecific', 'manuSpecificTuya', 61184, 0xEF00];

    for (const name of clusterNames) {
      try {
        endpoint.bind(name, new TuyaInlineBoundCluster());
        this.log(`[TUYA-P1] ✅ BoundCluster bound with name: ${name}`);
        this._tuyaListeners.boundCluster = true;
        return;
      } catch (e) {
        // Try next name
      }
    }

    this.log('[TUYA-P1] ⚠️ Could not bind BoundCluster');
  }

  /**
   * PRIORITY 2: Setup cluster event listeners (Community pattern)
   */
  async _setupTuyaClusterEvents(endpoint) {
    this.log('[TUYA-P2] Setting up cluster event listeners...');

    // Find tuya cluster
    const tuyaCluster = endpoint.clusters?.tuya
      || endpoint.clusters?.tuyaSpecific
      || endpoint.clusters?.[61184]
      || endpoint.clusters?.[0xEF00];

    if (!tuyaCluster) {
      this.log('[TUYA-P2] Tuya cluster not found');
      this.log('[TUYA-P2] Available:', Object.keys(endpoint.clusters || {}).join(', '));
      return;
    }

    if (typeof tuyaCluster.on !== 'function') {
      this.log('[TUYA-P2] Cluster has no .on() method');
      return;
    }

    // Listen to all possible event names
    const events = ['response', 'reporting', 'dataReport', 'dp', 'data'];

    for (const eventName of events) {
      tuyaCluster.on(eventName, (data, ...args) => {
        this.log(`[TUYA-P2] 📥 ${eventName} event:`, typeof data === 'object' ? JSON.stringify(data) : data);
        this._registerTuyaHit();

        if (eventName === 'dp' && args.length >= 1) {
          // dp event: (dpId, value, dpType)
          this._handleDP(data, args[0]);
        } else {
          this._processTuyaData(data);
        }
      });
    }

    this.log('[TUYA-P2] ✅ Event listeners registered');
    this._tuyaListeners.clusterEvents = true;
  }

  /**
   * PRIORITY 4: Setup legacy TuyaEF00Manager
   */
  async _setupLegacyTuyaManager(zclNode) {
    this.log('[TUYA-P4] Setting up legacy TuyaEF00Manager...');

    try {
      const TuyaEF00Manager = require('../tuya/TuyaEF00Manager');

      this.tuyaEF00Manager = new TuyaEF00Manager(this);
      const initialized = await this.tuyaEF00Manager.initialize(zclNode);

      if (initialized) {
        // Register DP event handler
        if (typeof this.tuyaEF00Manager.on === 'function') {
          this.tuyaEF00Manager.on('dp', (dpId, value) => {
            this.log(`[TUYA-P4] 📥 DP${dpId} = ${value}`);
            this._registerTuyaHit();
            this._handleDP(dpId, value);
          });
        }

        this.log('[TUYA-P4] ✅ TuyaEF00Manager initialized');
        this._tuyaListeners.legacyManager = true;
      }
    } catch (e) {
      this.log('[TUYA-P4] TuyaEF00Manager not available:', e.message);
    }
  }

  /**
   * PRIORITY 3: Setup raw frame listener for 0xEF00 frames
   * v5.5.78: Enhanced to listen on multiple levels (zclNode, endpoint, device)
   */
  _setupRawFrameListener(endpoint) {
    this.log('[TUYA-P3] Setting up raw frame listener...');

    try {
      // ═══════════════════════════════════════════════════════════════════════
      // LEVEL 1: Listen on endpoint for 'frame' events
      // ═══════════════════════════════════════════════════════════════════════
      if (endpoint && typeof endpoint.on === 'function') {
        endpoint.on('frame', (frame) => {
          this.log(`[TUYA-P3] 📦 Endpoint frame: cluster=${frame?.cluster}, cmd=${frame?.command}`);
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
        this.log('[TUYA-P3] ✅ Endpoint frame listener registered');
      }

      // ═══════════════════════════════════════════════════════════════════════
      // LEVEL 2: Listen on zclNode for ALL frames (including unrouted ones)
      // ═══════════════════════════════════════════════════════════════════════
      if (this.zclNode && typeof this.zclNode.on === 'function') {
        this.zclNode.on('frame', (frame, endpoint) => {
          this.log(`[TUYA-P3] 📦 ZclNode frame: cluster=${frame?.cluster}, ep=${endpoint}`);
          if (frame.cluster === 0xEF00 || frame.cluster === 61184) {
            this.log('[TUYA-RAW] 📥 ZclNode frame:', JSON.stringify({
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
        this.log('[TUYA-P3] ✅ ZclNode frame listener registered');
      }

      // ═══════════════════════════════════════════════════════════════════════
      // LEVEL 3: Override handleFrame on the device if available
      // ═══════════════════════════════════════════════════════════════════════
      if (typeof this.handleFrame === 'function') {
        const originalHandleFrame = this.handleFrame.bind(this);
        this.handleFrame = (endpointId, clusterId, frame, meta) => {
          this.log(`[TUYA-P3] 📦 handleFrame: ep=${endpointId}, cluster=${clusterId}`);
          if (clusterId === 0xEF00 || clusterId === 61184) {
            this.log('[TUYA-RAW] 📥 handleFrame:', JSON.stringify({
              clusterId,
              frameHex: frame?.toString?.('hex')
            }));
            this._registerTuyaHit();
            if (frame && frame.length > 2) {
              this._parseTuyaRawFrame(frame);
            }
          }
          return originalHandleFrame(endpointId, clusterId, frame, meta);
        };
        this.log('[TUYA-P3] ✅ handleFrame override registered');
      }

      this._tuyaListeners.rawFrames = true;
    } catch (e) {
      this.log('[TUYA-P3] ⚠️ Raw frame listener failed:', e.message);
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

    // Call onWakeUp for battery devices on first data
    if (!this.mainsPowered && !this._wakeUpCalled) {
      this._wakeUpCalled = true;
      if (typeof this.onWakeUp === 'function') {
        this.homey.setTimeout(() => {
          this.onWakeUp().catch(e => this.log('[HYBRID] onWakeUp error:', e.message));
        }, 500); // Small delay to let initial data process
      }
    }
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
   * ═══════════════════════════════════════════════════════════════════════════
   * UTILITY METHODS
   * ═══════════════════════════════════════════════════════════════════════════
   */

  /**
   * Safe capability setter with error handling
   */
  async safeSetCapability(capability, value) {
    try {
      if (!this.hasCapability(capability)) {
        this.log(`[UTIL] Capability ${capability} not available`);
        return false;
      }
      await this.setCapabilityValue(capability, value);
      return true;
    } catch (e) {
      this.error(`[UTIL] Failed to set ${capability}:`, e.message);
      return false;
    }
  }

  /**
   * Get active listener count
   */
  getActiveListeners() {
    return this._tuyaListeners || {};
  }

  /**
   * Force request all DPs (for battery devices that wake up)
   */
  async requestAllDPs() {
    this.log('[TUYA-CMD] Requesting all DPs...');

    try {
      const endpoint = this.zclNode?.endpoints?.[1];
      const tuyaCluster = endpoint?.clusters?.tuya;

      if (tuyaCluster && typeof tuyaCluster.dataQuery === 'function') {
        await tuyaCluster.dataQuery();
        this.log('[TUYA-CMD] ✅ dataQuery sent');
        return true;
      }

      // Fallback: use TuyaEF00Manager
      if (this.tuyaEF00Manager && typeof this.tuyaEF00Manager.requestDPs === 'function') {
        await this.tuyaEF00Manager.requestDPs([]);
        return true;
      }
    } catch (e) {
      this.log('[TUYA-CMD] ⚠️ requestAllDPs failed:', e.message);
    }
    return false;
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

// Export with DP types and constants
TuyaHybridDevice.TUYA_DP_TYPE = TUYA_DP_TYPE;

module.exports = TuyaHybridDevice;
