'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../utils/tuyaUtils.js');


const BaseUnifiedDevice = require('./BaseUnifiedDevice');
const { BoundCluster } = require('zigbee-clusters');
const BatteryCalculator = require('../battery/BatteryCalculator');
const { getAppVersionPrefixed } = require('../utils/AppVersion');
const { IntelligentDeviceLearner } = require('../IntelligentDeviceLearner');
const { GenesisOrchestrator } = require('../GenesisOrchestrator');
const AutonomousIntelligenceGate = require('../AutonomousIntelligenceGate');
const { ensureManufacturerSettings, getManufacturerName, getModelId, normalize } = require('../helpers/ManufacturerNameHelper');
const PowerSourceIntelligence = require('../helpers/PowerSourceIntelligence');

const { logUnknownDP, logUnknownClusterAttr } = require('../utils/UnknownDPLogger');
const { CLUSTERS } = require('../constants/ZigbeeConstants');

/**
 * 
 *             TUYA HYBRID DEVICE - Dynamic version from app.json                
 * 
 *                                                                               
 *   Base class for devices that support BOTH Zigbee standard AND Tuya DP       
 *                                                                               
 *   ARCHITECTURE (Athom SDK pattern):                                           
 *    
 *    1. TuyaSpecificCluster   Custom cluster CLUSTERS.TUYA_EF00 (Cluster.addCluster)    
 *    2. TuyaBoundCluster      BoundCluster for incoming DP commands         
 *    3. endpoint.bind()       Bind BoundCluster to receive data             
 *    4. cluster.on()          Event listeners as FALLBACK                   
 *    
 *                                                                               
 *   FALLBACK CHAIN (robustness):                                                
 *    
 *    Priority 1: BoundCluster.bind()  Official Athom pattern                
 *    Priority 2: cluster.on('response')  Community pattern                  
 *    Priority 3: endpoint.on('frame')  Raw frame fallback                   
 *    Priority 4: TuyaEF00Manager  Legacy manager                            
 *    
 *                                                                               
 * 
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

class TuyaUnifiedDevice extends BaseUnifiedDevice {

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
      dpIdState,
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
  get mainsPowered() { 
    if (this._mainsPowered !== undefined) return this._mainsPowered;
    return true; 
  }

  /**
   * Override: Max listeners
   */
  get maxListeners() { return 50; }

  async onNodeInit({ zclNode }) {
    // Prevent double init
    if (this._tuyaHybridInited) {
      this.log('[HYBRID]  Already initialized');
      return;
    }
    this._tuyaHybridInited = true;

    // v5.8.57: Ensure zb_manufacturer_name/zb_model_id settings populated
    await ensureManufacturerSettings(this).catch(() => {});

    this.zclNode = zclNode;
    this._zclNode = zclNode; // v5.5.93: Store for timer callbacks

    this.log('');
    this.log('');
    this.log(`          TUYA HYBRID DEVICE ${getAppVersionPrefixed()}`.padEnd(62) + '');
    this.log('');

    // 
    // v5.5.93: Z2M MAGIC PACKET - Read basic cluster FIRST to get device info
    // Source: https:
    // configureMagicPacket reads basic cluster attributes before anything else
    // 
    // v7.5.0: Use robust identification helper for case-less & sanitized matching
    manufacturer = getManufacturerName(this);
    modelId = getModelId(this);

    // Store normalized values for consistent pattern matching
    this._modelId = normalize(modelId);
    this._manufacturer = normalize(manufacturer);

    this.log(`[HYBRID] Model: ${this._modelId} (normalized)`);
    this.log(`[HYBRID] Manufacturer: ${this._manufacturer} (normalized)`);

    // 
    // v5.5.93: Z2M dataQuery - Send immediately to start device reporting
    // Source: https:
    // ALL Tuya TS0601 devices need this to start reporting data!
    // 
    await this._sendZ2MMagicPacket(zclNode);

    // v6.0: Intelligent Power Source Detection
    this.log('');
    this.log(' Detecting power source...');
    await PowerSourceIntelligence.applyCapabilities(this, zclNode);

    // Hybrid mode state
    this._hybridMode = {
      enabled: true,
      zigbeeActive: true,
      tuyaActive: true,
      decided: false,
      decidedMode,
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

    // v5.5.336: Initialize Intelligent Device Learner for autonomous capability discovery
    this._deviceLearner = new IntelligentDeviceLearner(this);
    await this._deviceLearner.initialize();

    // v5.15.0: Initialize Autonomous Intelligence Gate & Genesis Orchestrator
    this._intelGate = new AutonomousIntelligenceGate(this);
    this._orchestrator = new GenesisOrchestrator(this);
    
    // Resolve functional definition from orchestration layer
    const definition = this._orchestrator.getFunctionalDefinition();
    this.log(`[ORCHESTRATOR]  Sources: DB=${!!definition.mappings}, IsTuyaMCU=${definition.isTuyaMCU}`);
    
    // Apply orchestrated mappings (if any)
    if (definition.mappings && Object.keys(definition.mappings).length > 0) {
      this._orchestratedMappings = definition.mappings;
      this.log(`[ORCHESTRATOR]  Applied ${Object.keys(this._orchestratedMappings).length} mappings from truth engine.`);
    }

    this.log('[HYBRID]  Initialization complete');
  }

  /**
   * v5.5.196: Z2M-style queryOnDeviceAnnounce
   *
   * When a sleepy device wakes up and announces itself, immediately send
   * a dataQuery to request all DPs. This is CRITICAL for battery devices
   * like soil sensors and climate sensors that only wake periodically.
   *
   * Source: https://www.zigbee2mqtt.io / advanced/support-new-devices/02_support_new_tuya_devices.html
   * tuya.onEvent({queryOnDeviceAnnounce: true})
   */
  async onEndDeviceAnnounce() {
    this.log('[TUYA-WAKE] ');
    this.log('[TUYA-WAKE]  END DEVICE ANNOUNCE - Sleepy device woke up!');
    this.log('[TUYA-WAKE] ');

    // v5.5.196: Query ALL DPs immediately when device wakes
    try {
      await this._sendDataQueryOnWake();
    } catch (e) {
      this.log('[TUYA-WAKE]  dataQuery failed:', e.message);
    }

    // Call parent handler if exists
    if (super.onEndDeviceAnnounce) {
      await super.onEndDeviceAnnounce();
    }
  }

  /**
   * v5.5.196: Send dataQuery when device wakes up (Z2M style)
   * This triggers the device to report all its current values
   */
  async _sendDataQueryOnWake() {
    this.log('[TUYA-WAKE]  Sending dataQuery to request all DPs...');

    const endpoint = this.zclNode?.endpoints?.[1];
    if (!endpoint) {
      this.log('[TUYA-WAKE]  No endpoint 1');
      return;
    }

    // Find Tuya cluster
    const tuyaCluster = endpoint.clusters?.tuya
      || endpoint.clusters?.manuSpecificTuya
      || endpoint.clusters?.[CLUSTERS.TUYA_EF00]
      || endpoint.clusters?.[CLUSTERS.TUYA_EF00]; // Ensure number literal fallback

    if (tuyaCluster && typeof tuyaCluster.dataQuery === 'function') {
      try {
        await tuyaCluster.dataQuery({ seq: Date.now() % 65535 });
        this.log('[TUYA-WAKE]  dataQuery sent via cluster.dataQuery()');
        return;
      } catch (e) {
        // Try alternative method
      }
    }

    // Alternative: Send command directly
    if (tuyaCluster && typeof tuyaCluster.command === 'function') {
      try {
        await tuyaCluster.command('dataQuery', { seq: Date.now() % 65535 });
        this.log('[TUYA-WAKE]  dataQuery sent via cluster.command()');
        return;
      } catch (e) {
        // Try next method
      }
    }

    // Fallback: Request specific DPs from dpMappings
    const dpIds = Object.keys(this.dpMappings || {}).map(Number).filter(n => n > 0);
    if (dpIds.length > 0) {
      this.log(`[TUYA-WAKE]  Requesting specific DPs: ${dpIds.join(', ')}`);
      for (const dpId of dpIds) {
        await this.requestDP?.(dpId).catch(() => { });
        await new Promise(r => setTimeout(r, 100)); // Small delay between requests
      }
      this.log('[TUYA-WAKE]  DP requests sent');
    }
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
   * 
   * TUYA CLUSTER HANDLERS - MULTI-FALLBACK SYSTEM v5.5.48
   * 
   *
   * Fallback chain (all methods tried, first success wins):
   * 1. BoundCluster.bind() - Official Athom SDK pattern
   * 2. cluster.on('response'|'reporting') - Community pattern
   * 3. endpoint.on('frame') - Raw frame fallback
   * 4. TuyaEF00Manager - Legacy compatibility
   */
  async _setupTuyaClusterHandlers(zclNode) {
    this.log('[TUYA] ');
    this.log('[TUYA] Setting up MULTI-FALLBACK Tuya DP handlers...');
    this.log('[TUYA] ');

    const endpoint = zclNode?.endpoints?.[1];
    if (!endpoint) {
      this.log('[TUYA]  No endpoint 1');
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

    // 
    // PRIORITY 0: LOW-LEVEL NODE handleFrame (CRITICAL FOR TS0601)
    // Reference: https:
    // This is the ONLY reliable way to receive frames from clusters not
    // declared by the device during interview (like CLUSTERS.TUYA_EF00 on TS0601)
    // 
    try {
      await this._setupLowLevelNodeHandler();
    } catch (e) {
      this.log('[TUYA-P0] Low-level node handler failed:', e.message);
    }

    // 
    // PRIORITY 1: BoundCluster (Official Athom SDK pattern)
    // Reference: https:
    // 
    try {
      await this._setupTuyaBoundCluster(endpoint);
    } catch (e) {
      this.log('[TUYA-P1] BoundCluster failed:', e.message);
    }

    // 
    // PRIORITY 2: Cluster event listeners (Community pattern)
    // Pattern: zclNode.endpoints[1].clusters.tuya.on('response', ...)
    // 
    try {
      await this._setupTuyaClusterEvents(endpoint);
    } catch (e) {
      this.log('[TUYA-P2] Cluster events failed:', e.message);
    }

    // 
    // PRIORITY 3: Raw frame listener (Fallback)
    // 
    try {
      this._setupRawFrameListener(endpoint);
    } catch (e) {
      this.log('[TUYA-P3] Raw frames failed:', e.message);
    }

    // 
    // PRIORITY 4: Legacy TuyaEF00Manager (compatibility)
    // 
    try {
      await this._setupLegacyTuyaManager(zclNode);
    } catch (e) {
      this.log('[TUYA-P4] Legacy manager failed:', e.message);
    }

    // Log summary
    this.log('[TUYA] ');
    this.log('[TUYA] FALLBACK STATUS:');
    this.log(`[TUYA]   P0 LowLevelNode:   ${this._tuyaListeners.lowLevelNode ? '' : ''}`);
    this.log(`[TUYA]   P1 BoundCluster:   ${this._tuyaListeners.boundCluster ? '' : ''}`);
    this.log(`[TUYA]   P2 ClusterEvents:  ${this._tuyaListeners.clusterEvents ? '' : ''}`);
    this.log(`[TUYA]   P3 RawFrames:      ${this._tuyaListeners.rawFrames ? '' : ''}`);
    this.log(`[TUYA]   P4 LegacyManager:  ${this._tuyaListeners.legacyManager ? '' : ''}`);
    this.log('[TUYA] ');
  }

  /**
   * PRIORITY 0: Setup LOW-LEVEL NODE handleFrame
   *
   * v5.5.79: THE CRITICAL FIX FOR TS0601 DEVICES
   *
   * Per Athom SDK docs (https://apps.developer.homey.app / wireless/zigbee):
   * "override the handleFrame method on ZigBeeNode, this method is called
   * when a frame is received and if it is not overridden it will throw"
   *
   * This is the ONLY reliable way to receive frames from clusters that are
   * NOT declared by the device during Zigbee interview (like CLUSTERS.TUYA_EF00 on TS0601).
   *
   * The high-level zclNode API (BoundCluster, cluster.on()) only works for
   * clusters that the device announces. TS0601 devices do NOT announce CLUSTERS.TUYA_EF00.
   */
  async _setupLowLevelNodeHandler() {
    this.log('[TUYA-P0] Setting up LOW-LEVEL NODE handleFrame...');
    this.log('[TUYA-P0] This is the ONLY way to receive CLUSTERS.TUYA_EF00 frames from TS0601');

    try {
      // 
      // METHOD 1: Try this.node (direct reference from ZigBeeDevice)
      // 
      let node = this.node;
      if (node) {
        this.log('[TUYA-P0]  Found this.node directly');
      }

      // 
      // METHOD 2: Try homey.zigbee.getNode() (Athom API)
      // 
      if (!node && this.homey?.zigbee?.getNode) {
        node = await this.homey.zigbee.getNode(this);
        if (node) {
          this.log('[TUYA-P0]  Got ZigBeeNode via homey.zigbee.getNode()');
        }
      }

      // 
      // METHOD 3: Try getNode() on device (older SDK)
      // 
      if (!node && typeof this.getNode === 'function') {
        node = await this.getNode();
        if (node) {
          this.log('[TUYA-P0]  Got ZigBeeNode via this.getNode()');
        }
      }

      if (!node) {
        this.log('[TUYA-P0]  Could not get ZigBeeNode - trying alternative methods...');

        // Log what we have available for debugging
        this.log('[TUYA-P0] Available properties:', Object.keys(this).filter(k => !k.startsWith('_')).join(', '));

        // Check if zclNode has a node reference
        if (this.zclNode?.node) {
          node = this.zclNode.node;
          this.log('[TUYA-P0]  Found node via zclNode.node');
        }
      }

      if (!node) {
        this.log('[TUYA-P0]  Could not find ZigBeeNode via any method');
        return;
      }

      // Store reference for sending frames later
      this._zigbeeNode = node;

      // Log node info
      this.log(`[TUYA-P0] Node type: ${typeof node}`);
      this.log(`[TUYA-P0] Node has handleFrame: ${typeof node.handleFrame}`);
      this.log(`[TUYA-P0] Node has sendFrame: ${typeof node.sendFrame}`);

      // Override handleFrame to intercept ALL incoming frames
      const device = this;
      const originalHandleFrame = node.handleFrame?.bind(node);node.handleFrame = (endpointId, clusterId, frame, meta) => {
        // Log ALL frames for debugging (even non-Tuya)
        device.log(`[TUYA-P0]  FRAME: ep=${endpointId}, cluster=${clusterId} (0x${clusterId?.toString(16) || '?'}), len = ${frame?.length || 0}`);// Check for Tuya cluster CLUSTERS.TUYA_EF00 (CLUSTERS.TUYA_EF00 decimal)
        if (clusterId === CLUSTERS.TUYA_EF00 || clusterId === CLUSTERS.TUYA_EF00) {
          device.log('[TUYA-P0] ');
          device.log('[TUYA-P0]  TUYA CLUSTERS.TUYA_EF00 FRAME RECEIVED!');
          device.log(`[TUYA-P0] Endpoint: ${endpointId}`);
          device.log(`[TUYA-P0] Frame length: ${frame?.length || 0}`);
          if (frame) {
            device.log(`[TUYA-P0] Frame hex: ${frame.toString('hex')}`);
          }
          device.log('[TUYA-P0] ');

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

      this.log('[TUYA-P0]  handleFrame override installed');
      this._tuyaListeners.lowLevelNode = true;

    } catch (e) {
      this.log('[TUYA-P0]  Failed:', e.message);
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
       * v5.5.80: ALIGNED WITH JOHAN'S WORKING IMPLEMENTATION
       *
       * Method names MUST match TuyaSpecificCluster.COMMANDS:
       * - reporting (0x01)
       * - response (0x02)
       * - reportingConfiguration (0x06)
       *
       * Payload structure (Johan's format):
       * { status, transid, dp, datatype, length, data }
       */

      // Helper to log and process payload
      _handleTuyaPayload(cmdName, payload) {
        try {
          device.log(`[TUYA-BOUND]  ${cmdName} received`);

          // Log payload for debugging (Johan's structure)
          if (payload && typeof payload === 'object') {
            device.log(`[TUYA-BOUND] status=${payload.status}, transid=${payload.transid}`);
            device.log(`[TUYA-BOUND] dp=${payload.dp}, datatype=${payload.datatype}`);
            if (payload.data) {
              const dataHex = Buffer.isBuffer(payload.data) ? payload.data.toString('hex') : JSON.stringify(payload.data);
              device.log(`[TUYA-BOUND] data=${dataHex}`);
            }
          }

          device._registerTuyaHit();

          // v5.12.1: Compound frame detection for _TZE284_ devices
          // Some devices pack multiple DPs in one frame. The parser extracts the first DP header
          // but passes ALL remaining bytes in payload.data. Detect and split before parsing.
          if (payload && payload.dp !== undefined) {
            const data = payload.data;
            const declaredLen = payload.length;
            if (Buffer.isBuffer(data) && typeof declaredLen === 'number' && declaredLen > 0
                && data.length > declaredLen && data.length > 4) {
              device.log(`[TUYA-BOUND]  Compound frame: DP${payload.dp} declared=${declaredLen}B, buffer=${data.length}B`);
              const trimmedPayload = { ...payload, data: data.slice(0, declaredLen) };
              device._handleDP(payload.dp, device._parseDataValue(trimmedPayload));
              // Parse remaining bytes as additional TLV-encoded DPs
              const remaining = data.slice(declaredLen);
              if (remaining.length >= 4) {
                device._parseCompoundSubDPsInline(remaining);
              }
            } else {
              device._handleDP(payload.dp, device._parseDataValue(payload));
            }
          } else {
            device._processTuyaData(payload);
          }
        } catch (err) {
          device.log(`[TUYA-BOUND] Error handling ${cmdName}:`, err.message);
        }
      }

      /**
       * Report datapoint change (0x01) - device reports a change
       * Method name MUST be 'reporting' to match COMMANDS.reporting
       */
      reporting(payload) {
        this._handleTuyaPayload('reporting', payload);
      }

      /**
       * Response to query (0x02) - device responds to our request
       * Method name MUST be 'response' to match COMMANDS.response
       */
      response(payload) {
        this._handleTuyaPayload('response', payload);
      }

      /**
       * Reporting configuration (0x06)
       */
      reportingConfiguration(payload) {
        device.log('[TUYA-BOUND]  reportingConfiguration received');
        device._registerTuyaHit();
      }

      /**
       * MCU sync time (0x24) - device requests time
       * v5.5.960: Extract sequence number from payload and respond
       */
      mcuSyncTime(data) {
        device.log('[TUYA-BOUND]  mcuSyncTime received');
        device._registerTuyaHit();
        
        // Extract sequence number (often in payloadSize or first 2 bytes of payload)
        const seq = data?.payloadSize ?? (data?.payload?.length >= 2 ? data.payload.readUInt16BE(0) : 0);
        device._respondToTimeSync?.(seq);
      }
    }

    // Try to bind with different cluster names
    const clusterNames = ['tuya', 'tuyaSpecific', 'manuSpecificTuya', CLUSTERS.TUYA_EF00, CLUSTERS.TUYA_EF00];

    for (const name of clusterNames) {
      try {
        endpoint.bind(name, new TuyaInlineBoundCluster());
        this.log(`[TUYA-P1]  BoundCluster bound with name: ${name}`);
        this._tuyaListeners.boundCluster = true;
        return;
      } catch (e) {
        // Try next name
      }
    }

    this.log('[TUYA-P1]  Could not bind BoundCluster');
  }

  /**
   * PRIORITY 2: Setup cluster event listeners (Community pattern)
   */
  async _setupTuyaClusterEvents(endpoint) {
    this.log('[TUYA-P2] Setting up cluster event listeners...');

    // Find tuya cluster
    const tuyaCluster = endpoint.clusters?.tuya
      || endpoint.clusters?.tuyaSpecific
      || endpoint.clusters?.[CLUSTERS.TUYA_EF00]
      || endpoint.clusters?.[CLUSTERS.TUYA_EF00];

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
        this.log(`[TUYA-P2]  ${eventName} event:`, typeof data === 'object' ? JSON.stringify(data) : data);
        this._registerTuyaHit();

        if (eventName === 'dp' && args.length >= 1) {
          // dp event: (dpId, value, dpType)
          this._handleDP(data, args[0]);
        } else {
          this._processTuyaData(data);
        }
      });
    }

    this.log('[TUYA-P2]  Event listeners registered');
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
            this.log(`[TUYA-P4]  DP${dpId} = ${value}`);
            this._registerTuyaHit();
            this._handleDP(dpId, value);
      });
        }

        this.log('[TUYA-P4]  TuyaEF00Manager initialized');
        this._tuyaListeners.legacyManager = true;
      }
    } catch (e) {
      this.log('[TUYA-P4] TuyaEF00Manager not available:', e.message);
    }
  }

  /**
   * PRIORITY 3: Setup raw frame listener for CLUSTERS.TUYA_EF00 frames
   * v5.5.78: Enhanced to listen on multiple levels (zclNode, endpoint, device)
   */
  _setupRawFrameListener(endpoint) {
    this.log('[TUYA-P3] Setting up raw frame listener...');

    try {
      // 
      // LEVEL 1: Listen on endpoint for 'frame' events
      // 
      if (endpoint && typeof endpoint.on === 'function') {
        endpoint.on('frame', (frame) => {
          this.log(`[TUYA-P3]  Endpoint frame: cluster=${frame?.cluster}, cmd = ${frame?.command}`);if (frame.cluster === CLUSTERS.TUYA_EF00 || frame.cluster === CLUSTERS.TUYA_EF00) {
            this.log('[TUYA-RAW]  Raw frame:', JSON.stringify({
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
        this.log('[TUYA-P3]  Endpoint frame listener registered');
      }

      // 
      // LEVEL 2: Listen on zclNode for ALL frames (including unrouted ones)
      // 
      if (this.zclNode && typeof this.zclNode.on === 'function') {
        this.zclNode.on('frame', (frame, endpoint) => {
          this.log(`[TUYA-P3]  ZclNode frame: cluster=${frame?.cluster}, ep=${endpoint}`);
          if (frame.cluster === CLUSTERS.TUYA_EF00 || frame.cluster === CLUSTERS.TUYA_EF00) {
            this.log('[TUYA-RAW]  ZclNode frame:', JSON.stringify({
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
        this.log('[TUYA-P3]  ZclNode frame listener registered');
      }

      // 
      // LEVEL 3: Override handleFrame on the device if available
      // 
      if (typeof this.handleFrame === 'function') {
        const originalHandleFrame = this.handleFrame.bind(this);
        this.handleFrame = (endpointId, clusterId, frame, meta) => {
          this.log(`[TUYA-P3]  handleFrame: ep=${endpointId}, cluster=${clusterId}`);
          if (clusterId === CLUSTERS.TUYA_EF00 || clusterId === CLUSTERS.TUYA_EF00) {
            this.log('[TUYA-RAW]  handleFrame:', JSON.stringify({
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
        this.log('[TUYA-P3]  handleFrame override registered');
      }

      this._tuyaListeners.rawFrames = true;
    } catch (e) {
      this.log('[TUYA-P3]  Raw frame listener failed:', e.message);
    }
  }

  /**
   * 
   * v5.5.84: INTELLIGENT MULTI-FORMAT FRAME PARSER
   * 
   *
   * Supports ALL known Tuya frame formats from community research:
   * - Format A: [status:1][seq:1][cmd:1][status2:1][dpCount:1][DPs...] (header=5)
   * - Format B: [seq:2][DPs...] (header=2) - older devices
   * - Format C: [cmd:1][seq:1][DPs...] (header=2) - some TS0601
   * - Format D: [DPs only] (header=0) - pre-parsed payloads
   *
   * Sources: Z2M, ZHA, Johan Bendz, Zigbee2Tasmota, Tuya-convert
   */
  _parseTuyaRawFrame(buffer) {
    try {
      if (!buffer || buffer.length < 4) return;
      // v5.10.2: Handle non-DP ZCL commands
      const _fc = buffer[0] & 0x03, _cmd = buffer[2];
      if (_fc === 0x01 && _cmd === 0x11 && buffer.length >= 6) {
        const v = buffer[5], ma = (v >> 6) & 3, mi = (v >> 4) & 3, pa = v & 0xF;
        this.log(`[TUYA-PARSE]  MCU version: ${ma}.${mi}.${pa}`);
        try { this.setSettings({ mcu_version: `${ma}.${mi}.${pa}` }).catch(() => {}); } catch (e) {}
        return;
      }
      if (_fc === 0x00 && _cmd === 0x0B && buffer.length >= 5) {
        this.log(`[TUYA-PARSE]  Default Response: cmd=0x${buffer[3].toString(16)} status=${buffer[4]}`);
        return;
      }
      if (_cmd === 0x24) { this.log('[TUYA-PARSE]  Time sync (0x24)'); return; }

      const hex = buffer.toString('hex');
      this.log(`[TUYA-PARSE]  Frame len=${buffer.length}, hex=${hex}`);

      // Track discovered DPs for learning
      if (!this._discoveredDPs) this._discoveredDPs = new Set();

      // Try multiple parsing strategies and use the one that works
      const strategies = [
        { name: 'Format-A (header=5)', offset: 5 },  // Standard Tuya with full header
        { name: 'Format-B (header=4)', offset: 4 },  // Some devices skip dpCount
        { name: 'Format-C (header=3)', offset: 3 },  // Minimal header
        { name: 'Format-D (header=2)', offset: 2 },  // Sequence only
        { name: 'Format-E (header=0)', offset: 0 },  // Raw DP data
      ];

      let parsed = false;
      for (const strategy of strategies) {
        if (buffer.length <= strategy.offset + 4) continue;

        const result = this._tryParseDPs(buffer, strategy.offset, strategy.name);
        if (result.success && result.count > 0) {
          this.log(`[TUYA-PARSE]  ${strategy.name}: parsed ${result.count} DPs`);
          parsed = true;

          // Remember successful format for this device
          if (!this._preferredFormat || result.count > (this._lastParseCount || 0)) {
            this._preferredFormat = strategy;
            this._lastParseCount = result.count;
          }
          break;
        }
      }

      if (!parsed) {
        // Last resort: scan entire buffer for DP-like patterns
        this._scanForDPs(buffer);
      }

    } catch (e) {
      this.log('[TUYA-PARSE]  Error:', e.message);
    }
  }

  /**
   * Try to parse DPs from buffer at given offset
   */
  _tryParseDPs(buffer, offset, formatName) {
    const result = { success: false, count: 0 };

    try {
      while (offset + 4 <= buffer.length) {
        const dpId = buffer.readUInt8(offset);
        const dpType = buffer.readUInt8(offset + 1);
        const length = buffer.readUInt16BE(offset + 2);

        // Validate DP structure
        if (dpId === 0 || dpId > 200) break;  // Invalid DP ID
        if (dpType > 5) break;                 // Invalid type
        if (length > 255 || length === 0 && dpType !== TUYA_DP_TYPE.BOOL) break; // Invalid length
        if (offset + 4 + length > buffer.length) break;

        const dataSlice = buffer.slice(offset + 4, offset + 4 + length);
        const value = this._parseDataSlice(dpType, dataSlice, length);

        if (value !== null) {
          this.log(`[TUYA-DP]  DP${dpId} type=${dpType} len=${length}  ${value}`);
          this._handleDP(dpId, value);
          this._discoveredDPs.add(dpId);
          result.count++;
          result.success = true;
        }

        offset += 4 + length;
      }
    } catch (e) {
      // Parse failed at this offset
    }

    return result;
  }

  /**
   * Parse data slice based on Tuya data type
   * Supports all known Tuya data types from community research
   */
  _parseDataSlice(dpType, dataSlice, length) {
    try {
      switch (dpType) {
      case TUYA_DP_TYPE.RAW:      // 0x00 - Raw bytes
        return dataSlice;

      case TUYA_DP_TYPE.BOOL:     // 0x01 - Boolean
        return length > 0 ? dataSlice.readUInt8(0) === 1 : false;

      case TUYA_DP_TYPE.VALUE:    // 0x02 - 32-bit integer (big-endian)
        if (length === 4) return dataSlice.readInt32BE(0);
        if (length === 2) return dataSlice.readInt16BE(0);
        if (length === 1) return dataSlice.readInt8(0);
        return dataSlice.readIntBE(0, Math.min(length, 4));

      case TUYA_DP_TYPE.STRING:   // 0x03 - UTF-8 string
        return dataSlice.toString('utf8').replace(/\0/g, '');

      case TUYA_DP_TYPE.ENUM:     // 0x04 - Enum (8-bit)
        return dataSlice.readUInt8(0);

      case TUYA_DP_TYPE.BITMAP:   // 0x05 - Bitmap
        if (length === 1) return dataSlice.readUInt8(0);
        if (length === 2) return dataSlice.readUInt16BE(0);
        if (length === 4) return dataSlice.readUInt32BE(0);
        return dataSlice;

      default:
        return dataSlice;
      }
    } catch (e) {
      return null;
    }
  }

  /**
   * Scan buffer for DP-like patterns (last resort)
   * Useful for non-standard or corrupted frames
   */
  _scanForDPs(buffer) {
    this.log('[TUYA-SCAN]  Scanning for DP patterns...');

    for (let i = 0; i < buffer.length - 4; i++) {
      const dpId = buffer.readUInt8(i);
      const dpType = buffer.readUInt8(i + 1);
      const length = buffer.readUInt16BE(i + 2);

      // Check if this looks like a valid DP
      if (dpId >= 1 && dpId <= 200 &&
        dpType >= 0 && dpType <= 5 &&
        length >= 0 && length <= 32 &&
        i + 4 + length <= buffer.length) {

        const dataSlice = buffer.slice(i + 4, i + 4 + length);
        const value = this._parseDataSlice(dpType, dataSlice, length);

        if (value !== null) {
          this.log(`[TUYA-SCAN]  Found DP${dpId} at offset ${i}: ${value}`);
          this._handleDP(dpId, value);
          this._discoveredDPs.add(dpId);
          i += 3 + length; // Skip to next potential DP
        }
      }
    }
  }

  /**
   * v5.5.196: ENHANCED - Process Tuya data from cluster events
   *
   * Z2M-style dpValues handling:
   * The dpValues is an ARRAY of {dp, datatype, data} objects (not a buffer!)
   * This is the standard Tuya protocol format used by zigbee-herdsman-converters.
   *
   * Message types from Z2M:
   * - commandDataResponse (device responds to query)
   * - commandDataReport (device reports change)
   * - commandActiveStatusReport
   * - commandActiveStatusReportAlt
   */
  _processTuyaData(data) {
    if (!data) return;

    this.log('[TUYA-PROCESS] ');
    this.log('[TUYA-PROCESS]  Processing Tuya data...');
    this.log(`[TUYA-PROCESS] Data type: ${typeof data}`);
    this.log(`[TUYA-PROCESS] Data keys: ${Object.keys(data).join(', ')}`);

    // 
    // Z2M STYLE: dpValues is an ARRAY of {dp, datatype, data} objects
    // This is the CORRECT format from zigbee-herdsman manuSpecificTuya cluster
    // 
    if (data.dpValues && Array.isArray(data.dpValues)) {
      this.log(`[TUYA-PROCESS]  Z2M-style dpValues array with ${data.dpValues.length} DPs`);

      for (const dpValue of data.dpValues) {
        if (dpValue && dpValue.dp !== undefined) {
          const parsedValue = this._parseDataValue(dpValue);
          this.log(`[TUYA-PROCESS]  DP${dpValue.dp} type=${dpValue.datatype}  ${parsedValue}`);
          this._handleDP(dpValue.dp, parsedValue);
        }
      }
      return;
    }

    // 
    // FALLBACK: dpValues as Buffer (older/alternative format)
    // 
    if (data.dpValues && Buffer.isBuffer(data.dpValues)) {
      this.log('[TUYA-PROCESS]  dpValues as Buffer - parsing raw frame');
      this._parseTuyaRawFrame(Buffer.concat([Buffer.alloc(2), data.dpValues]));
      return;
    }

    // 
    // SINGLE DP: Direct dp/value format
    // 
    if (data.dp !== undefined) {
      const value = data.value ?? data.data ?? data.dpValue;
      this.log(`[TUYA-PROCESS]  Single DP${data.dp} = ${value}`);

      // If data has datatype, use parseDataValue
      if (data.datatype !== undefined) {
        const parsedValue = this._parseDataValue(data);
        this._handleDP(data.dp, parsedValue);
      } else {
        this._handleDP(data.dp, value);
      }
      return;
    }

    // 
    // LEGACY: datapoints array format
    // 
    if (data.datapoints && Array.isArray(data.datapoints)) {
      this.log(`[TUYA-PROCESS]  Legacy datapoints array with ${data.datapoints.length} DPs`);
      for (const dp of data.datapoints) {
        this._handleDP(dp.dp || dp.dpId, dp.value || dp.data);
      }
      return;
    }

    this.log('[TUYA-PROCESS]  Unknown data format:', JSON.stringify(data).slice(0, 200));
  }

  /**
   * v5.5.198: Z2M-style device availability tracking
   * Update last seen timestamp when any data is received
   */
  _updateLastSeen() {
    this._lastSeenTimestamp = Date.now();

    // Update device availability if it was marked unavailable
    if (this.getAvailable && !this.getAvailable()) {
      this.setAvailable().catch(() => { });
      this.log('[TUYA]  Device marked available (data received)');
    }
  }


  /**
   * v5.5.80: Parse data value from Johan's format
   * Converts { datatype, data } to a usable value
   * Based on Johan's getDataValue function
   *
   * @param {Object} dpValue - Payload with datatype and data
   * @returns {*} Parsed value
   */
  _parseDataValue(dpValue) {
    if (!dpValue || !dpValue.data) return null;

    const dataTypes = {
      raw: 0,     // Raw bytes
      bool: 1,    // Boolean (1 byte)
      value: 2,   // Integer (4 bytes big-endian)
      string: 3,  // String
      enum: 4,    // Enum (1 byte)
      bitmap: 5,  // Bitmap
    };

    const data = dpValue.data;
    const datatype = dpValue.datatype;

    try {
      switch (datatype) {
      case dataTypes.raw:
        return data;

      case dataTypes.bool:
        return Buffer.isBuffer(data) ? data[0] === 1 : Boolean(data);

      case dataTypes.value:
        // 4-byte big-endian integer
        if (Buffer.isBuffer(data)) {
          // v5.12.1: FIX compound frame corruption (_TZE284_aao3yzhs soil sensor 67109120Â°C)
          // When data.length > 4, the buffer contains compound sub-DPs after this DP's value.
          // Only read the first 4 bytes (or 2/1)  NEVER concatenate all bytes into one number.
          if (data.length >= 4) {
            return data.readUInt32BE(0);
          } else if (data.length === 2) {
            return data.readUInt16BE(0);
          } else if (data.length === 1) {
            return data.readUInt8(0);
          }
          // Fallback for 3-byte values only
          let value = 0;
          for (let i = 0; i < Math.min(data.length, 4); i++) {
            value = (value << 8) + data[i];
          }
          return value;
        }
        return data;

      case dataTypes.string:
        if (Buffer.isBuffer(data)) {
          return data.toString('utf8');
        }
        return String(data);

      case dataTypes.enum:
        return Buffer.isBuffer(data) ? data[0] : data;

      case dataTypes.bitmap:
        if (Buffer.isBuffer(data)) {
          if (data.length === 4) return data.readUInt32BE(0);
          if (data.length === 2) return data.readUInt16BE(0);
          return data[0];
        }
        return data;

      default:
        this.log(`[TUYA] Unknown datatype: ${datatype}`);
        return data;
      }
    } catch (err) {
      this.log(`[TUYA] Error parsing datatype ${datatype}:`, err.message);
      return data;
    }
  }

  /**
   * v5.12.1: Parse compound sub-DPs from remaining bytes of a multi-DP frame.
   * Format: [dp_id(1), datatype(1), length(2 BE), data(length)] repeated.
   * Used by _TZE284_ devices that pack multiple DPs in one frame.
   */
  _parseCompoundSubDPsInline(buffer) {
    let offset = 0;
    while (offset + 4 <= buffer.length) {
      const dpId = buffer.readUInt8(offset);
      const dpType = buffer.readUInt8(offset + 1);
      const dataLen = buffer.readUInt16BE(offset + 2);

      if (dpId === 0 || dpId > 200) break;
      if (dataLen > 64 || offset + 4 + dataLen > buffer.length) break;

      const dpData = buffer.slice(offset + 4, offset + 4 + dataLen);
      offset += 4 + dataLen;

      this.log(`[TUYA-COMPOUND]  Sub-DP${dpId}: type=${dpType}, len=${dataLen}, hex=${dpData.toString('hex')}`);
      const parsedValue = this._parseDataValue({ dp: dpId, datatype: dpType, data: dpData });
      this._handleDP(dpId, parsedValue);
    }
  }

  /**
   * 
   * v5.5.84: INTELLIGENT DP HANDLER WITH AUTO-DISCOVERY
   * 
   *
   * Features:
   * - Auto-discovers unknown DPs and tries to map them
   * - Universal fallback mappings for common DP patterns
   * - Learns device behavior over 15 minutes
   * - Supports safeDivide(exotic, custom) implementations
   */
  _handleDP(dpId, value) {
    // Track all received DPs for learning
    if (!this._receivedDPs) this._receivedDPs = {};
    this._receivedDPs[dpId] = { value, timestamp: Date.now(), count: (this._receivedDPs[dpId]?.count || 0) + 1 };

    // v5.5.336: Record DP for Intelligent Device Learner
    if (this._deviceLearner) {
      this._deviceLearner.recordDP(dpId, value, this._receivedDPs[dpId]);
    }

    // v5.15.0: Process DP through Intelligence Gate
    if (this._intelGate) {
      this._intelGate.process(dpId, value);
    }

    // Always process during learning phase (first 15 min) even if mode disabled
    const isLearningPhase = !this._hybridDecisionMade;

    // v5.5.193: Check forceActiveTuyaMode - battery devices NEED Tuya DPs even after learning phase
    const forceActive = this.forceActiveTuyaMode === true;

    if (!this._hybridMode.tuyaActive && !isLearningPhase && !forceActive) {
      this.log(`[TUYA-DP] Ignoring DP${dpId} - Tuya mode disabled`);
      return;
    }

    const mapping = this.dpMappings[dpId];
    const batteryConfig = this.batteryConfig;

    // 
    // BATTERY HANDLING - Special processing with BatteryCalculator
    // 
    if (dpId === batteryConfig.dpId || dpId === batteryConfig.dpIdState) {
      this._handleBatteryDP(dpId, value);
      return;
    }

    // 
    // EXPLICIT MAPPING - Use driver's dpMappings
    // 
    if (mapping) {
      if (!mapping.capability) {
        this.log(`[TUYA-DP] DP${dpId} = ${value} (setting: ${mapping.setting})`);
        return;
      }

      let finalValue = value;
      if (mapping.transform) {
        finalValue = mapping.transform(value);
      } else if (mapping.divisor) {
        finalValue = safeDivide(value, mapping.divisor);
      }

      this.log(`[TUYA-DP]  DP${dpId}  ${mapping.capability} = ${finalValue} (raw: ${value})`);

      if (this.hasCapability(mapping.capability)) {
        this._safeSetCapability(mapping.capability, finalValue).catch(err => {
          this.error(`Failed to set ${mapping.capability}:`, err.message);
      });
      }
      return;
    }

    // 
    // AUTO-DISCOVERY - Try universal DP patterns from community research
    // Sources: Z2M converters, ZHA quirks, Tuya documentation
    // 
    const autoMapping = this._getUniversalDPMapping(dpId, value);
    if (autoMapping) {
      let finalValue = autoMapping.transform ? autoMapping.transform(value) : value;
      this.log(`[TUYA-AUTO]  DP${dpId}  ${autoMapping.capability} = ${finalValue} (pattern: ${autoMapping.pattern})`);

      if (this.hasCapability(autoMapping.capability)) {
        this._safeSetCapability(autoMapping.capability, finalValue).catch(err => {
          this.error(`Failed to set ${autoMapping.capability}:`, err.message);
      });
      }
      return;
    }

    // v5.9.17: Rich unknown DP logging for future driver revisions
    logUnknownDP(this, dpId, value);
  }

  /**
   * Universal DP patterns from community research
   * These are common patterns found across many Tuya devices
   */
  _getUniversalDPMapping(dpId, value) {
    // Common DP patterns from Z2M, ZHA, and Tuya documentation
    const universalPatterns = {
      // Temperature (various DPs used by different devices)
      1: { capability: 'measure_temperature', transform: v =>v/10, pattern: 'temp-dp1' },
      5: { capability: 'measure_temperature', transform: v => v > 1000 ?v/100 :safeParse(v, 10), pattern: 'temp-dp5' },
      18: { capability: 'measure_temperature', transform: v =>v/10, pattern: 'temp-dp18' },
      24: { capability: 'measure_temperature', transform: v =>v/10, pattern: 'temp-dp24' },

      // Humidity
      2: { capability: 'measure_humidity', transform: v => v, pattern: 'humid-dp2' },
      3: { capability: 'measure_humidity', transform: v => v, pattern: 'humid-dp3' },
      19: { capability: 'measure_humidity', transform: v => v, pattern: 'humid-dp19' },

      // Battery
      14: { capability: 'measure_battery', transform: v => this._enumToBattery(v), pattern: 'batt-state' },
      15: { capability: 'measure_battery', transform: v => Math.min(100, Math.max(0, v)), pattern: 'batt-pct' },

      // On/Off
      6: { capability: 'onoff', transform: v => !!v, pattern: 'onoff-dp6' },

      // Illuminance
      7: { capability: 'measure_luminance', transform: v => v, pattern: 'lux-dp7' },
      12: { capability: 'measure_luminance', transform: v => v, pattern: 'lux-dp12' },

      // Motion
      101: { capability: 'alarm_motion', transform: v => !!v, pattern: 'motion' },

      // Contact
      102: { capability: 'alarm_contact', transform: v => !v, pattern: 'contact' },

      // Voltage (millivolts)
      21: { capability: 'measure_voltage', transform: v =>v/1000, pattern: 'voltage' },
    };

    // Check if we have capabilities and the DP matches a pattern
    const pattern = universalPatterns[dpId];
    if (pattern && this.hasCapability(pattern.capability)) {
      return pattern;
    }

    // Value-based detection for unknown DPs
    if (typeof value === 'number') {
      // Looks like temperature (-400 to 1000 = -40.0Â°C to 100.0Â°C)
      if (value >= -400 && value <= 1000 && this.hasCapability('measure_temperature')) {
        return { capability: 'measure_temperature', transform: v =>v/10, pattern: 'auto-temp' };
      }
      // Looks like humidity (0-100)
      if (value >= 0 && value <= 100 && this.hasCapability('measure_humidity')) {
        return { capability: 'measure_humidity', transform: v => v, pattern: 'auto-humid' };
      }
      // Looks like battery (0-100)
      if (value >= 0 && value <= 100 && this.hasCapability('measure_battery') && dpId >= 10) {
        return { capability: 'measure_battery', transform: v => v, pattern: 'auto-batt' };
      }
    }

    return null;
  }

  /**
   * Convert battery state enum to percentage
   */
  _enumToBattery(value) {
    const states = { 0: 10, 1: 50, 2: 100 }; // low, medium, high
    return states[value] ?? 50;
  }

  /**
   * 
   * BATTERY DP HANDLING - Ultra-precise with BatteryCalculator
   * 
   */
  _handleBatteryDP(dpId, value) {
    const config = this.batteryConfig;
    let percentage;

    this.log(`[BATTERY] DP${dpId} raw=${value}`);

    // Determine algorithm based on which DP we received
    if (dpId === config.dpIdState) {
      // Battery state enum (low / medium/high)
      percentage = BatteryCalculator.calculate(value, {
        algorithm: BatteryCalculator.ALGORITHM.ENUM_3,
      });
      this.log(`[BATTERY] State enum: ${value}  ${percentage}%`);
    } else if (dpId === config.dpId) {
      // Battery percentage/voltage
      percentage = BatteryCalculator.calculate(value, {
        algorithm: config.algorithm,
        chemistry: config.chemistry,
        voltageMin: config.voltageMin,
        voltageMax: config.voltageMax,
      });
      this.log(`[BATTERY] ${config.algorithm}: ${value}  ${percentage}% (chemistry: ${config.chemistry})`);
    }

    if (percentage !== null && this.hasCapability('measure_battery')) {
      // v5.8.70: Anti-flood  skip same-value + min 5min interval
      const prev = this.getCapabilityValue('measure_battery');
      const rounded = Math.round(percentage);
      if (prev !== null && prev === rounded) return;
      const now = Date.now();
      if (!this._battLastUpdate) this._battLastUpdate = 0;
      if (prev !== null && (now - this._battLastUpdate) < 300000 && Math.abs(rounded - prev) < 2) return;
      this._battLastUpdate = now;

      this._safeSetCapability('measure_battery', parseFloat(rounded)).catch(err => {
        this.error('Failed to set battery:', err.message);
      });
      this.setStoreValue('last_battery_percentage', rounded).catch(() => {});

      if (BatteryCalculator.isLow(rounded)) {
        this.log(`[BATTERY]  Low battery: ${rounded}%`);
        if (this.hasCapability('alarm_battery')) {
          this._safeSetCapability('alarm_battery', true).catch(() => { });
        }
      }
    }
  }

  /**
   * 
   * v5.5.84: UNIVERSAL ZIGBEE CLUSTER HANDLERS
   * 
   *
   * Auto-discovers and listens to ALL standard ZCL clusters
   * Supports: temperatureMeasurement, relativeHumidity, illuminanceMeasurement,
   *           powerConfiguration, occupancySensing, iasZone, etc.
   */
  async _setupZigbeeClusterHandlers(zclNode) {
    this.log('[ZCL-UNIVERSAL] Setting up UNIVERSAL Zigbee cluster handlers...');

    // Universal cluster mappings (cluster name  capability + transform)
    const universalClusters = {
      // Temperature
      temperatureMeasurement: {
        attribute: 'measuredValue',
        capability: 'measure_temperature',
        transform: v => safeParse(v, 100)  // ZCL uses 0.01Â°C units
      },
      // Humidity
      relativeHumidity: {
        attribute: 'measuredValue',
        capability: 'measure_humidity',
        transform: v => safeParse(v, 100)  // ZCL uses 0.01% units
      },
      // Illuminance
      illuminanceMeasurement: {
        attribute: 'measuredValue',
        capability: 'measure_luminance',
        transform: v => Math.round(Math.pow(10, (v - 1) / 10000))  // ZCL formula
      },
      // Battery
      powerConfiguration: {
        attribute: 'batteryPercentageRemaining',
        capability: 'measure_battery',
        transform: v => Math.min(100, Math.round(safeParse(v))) // ZCL uses 0.5% units
      },
      // Motion (occupancy)
      occupancySensing: {
        attribute: 'occupancy',
        capability: 'alarm_motion',
        transform: v => !!(v & 1)
      },
      // Contact (IAS Zone)
      iasZone: {
        attribute: 'zoneStatus',
        capability: 'alarm_contact',
        transform: v => !!(v & 1)
      },
      // Pressure
      pressureMeasurement: {
        attribute: 'measuredValue',
        capability: 'measure_pressure',
        transform: v => safeParse(v, 10)  // hPa
      },
      // CO2
      carbonDioxideMeasurement: {
        attribute: 'measuredValue',
        capability: 'measure_co2',
        transform: v => v
      },
      // PM2.5
      pm25Measurement: {
        attribute: 'measuredValue',
        capability: 'measure_pm25',
        transform: v => v
      },
      // TVOC
      tvocMeasurement: {
        attribute: 'measuredValue',
        capability: 'measure_voc',
        transform: v => v
      },
      // On/Off
      onOff: {
        attribute: 'onOff',
        capability: 'onoff',
        transform: v => !!v
      },
      // Analog input (generic)
      analogInput: {
        attribute: 'presentValue',
        capability,  // Will try to match
        transform: v => v
      },
    };

    // First, setup driver-defined handlers
    const handlers = this.clusterHandlers || {};

    // Then, auto-discover ALL clusters on ALL endpoints
    for (const [epId, endpoint] of Object.entries(zclNode.endpoints || {})) {
      const availableClusters = Object.keys(endpoint.clusters || {});
      this.log(`[ZCL-UNIVERSAL] EP${epId} clusters: ${availableClusters.join(', ') || 'none'}`);

      for (const clusterName of availableClusters) {
        const cluster = endpoint.clusters[clusterName];
        if (!cluster || typeof cluster.on !== 'function') continue;

        // Check for driver-specific handler
        const driverHandler = handlers[clusterName];

        // Check for universal handler
        const universalHandler = universalClusters[clusterName];

        if (driverHandler || universalHandler) {
          this._setupClusterListener(cluster, clusterName, epId, driverHandler, universalHandler);
        } else {
          // Generic listener for unknown clusters - log all attributes
          this._setupGenericClusterListener(cluster, clusterName, epId);
        }
      }
    }
  }

  /**
   * Setup listener for a specific cluster
   */
  _setupClusterListener(cluster, clusterName, epId, driverHandler, universalHandler) {
    try {
      // Listen to attribute reports
      cluster.on('attr', (attrName, value) => {
        this.log(`[ZCL]  ${clusterName}.${attrName} = ${value}`);
        this._registerZigbeeHit();

        // v5.5.336: Record ZCL for Intelligent Device Learner
        if (this._deviceLearner) {
          this._deviceLearner.recordZCL(cluster.ID, clusterName, attrName, value);
        }

        // Driver-specific handler takes priority
        if (driverHandler?.attributeReport) {
          if (this._hybridMode.zigbeeActive || !this._hybridDecisionMade) {
            driverHandler.attributeReport.call(this, { [attrName]: value });
          }
          return;
        }

        // Universal handler
        if (universalHandler && universalHandler.capability) {
          if (attrName === universalHandler.attribute || !universalHandler.attribute) {
            const finalValue = universalHandler.transform(value);
            this.log(`[ZCL-AUTO]  ${clusterName}.${attrName}  ${universalHandler.capability} = ${finalValue}`);

            if (this.hasCapability(universalHandler.capability)) {
              this._safeSetCapability(universalHandler.capability, finalValue).catch(err => {
                this.error(`[ZCL] Failed to set ${universalHandler.capability}:`, err.message);
      });
            }
          }
        }
      });

      // Also listen to 'report' events (some clusters use this)
      cluster.on('report', (data) => {
        this.log(`[ZCL]  ${clusterName} report:`, JSON.stringify(data));
        this._registerZigbeeHit();
      });

      this.log(`[ZCL-UNIVERSAL]  ${clusterName} listener on EP${epId}`);
    } catch (e) {
      this.log(`[ZCL-UNIVERSAL]  ${clusterName} setup failed:`, e.message);
    }
  }

  /**
   * Generic listener for unknown clusters
   */
  _setupGenericClusterListener(cluster, clusterName, epId) {
    try {
      cluster.on('attr', (attrName, value) => {
        this.log(`[ZCL-GENERIC]  ${clusterName}.${attrName} = ${value}`);
        this._registerZigbeeHit();

        // v5.5.336: Record ZCL for Intelligent Device Learner
        if (this._deviceLearner) {
          this._deviceLearner.recordZCL(cluster.ID, clusterName, attrName, value);
        }

        // Track for learning
        if (!this._discoveredZclAttrs) this._discoveredZclAttrs = {};
        this._discoveredZclAttrs[`${clusterName}.${attrName}`] = value;

        // v5.9.17: Rich unknown cluster attr logging
        logUnknownClusterAttr(this, clusterName, attrName, value, epId);
      });
      this.log(`[ZCL-GENERIC]  Watching ${clusterName} on EP${epId}`);
    } catch (e) {
      // Ignore errors for generic listeners
    }
  }

  /**
   * 
   * HYBRID MODE MANAGEMENT
   * 
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
    const DURATION_MS =safeMultiply(15, 60) * 1000;

    this._hybridTimeout = this.homey.setTimeout(() => {
      this._finalizeHybridMode();
    }, DURATION_MS);

    this.log('[HYBRID]  Mode decision scheduled in 15 minutes');
  }

  _finalizeHybridMode() {
    const mode = this._hybridMode;

    this.log('[HYBRID] ');
    this.log('[HYBRID]  HYBRID MODE DECISION (15 min elapsed)');
    this.log(`[HYBRID] Tuya hits: ${mode.tuyaHits}`);
    this.log(`[HYBRID] Zigbee hits: ${mode.zigbeeHits}`);

    // v5.5.193: Check forceActiveTuyaMode - battery devices MUST keep Tuya active
    const forceActive = this.forceActiveTuyaMode === true;
    if (forceActive) {
      this.log('[HYBRID]  forceActiveTuyaMode=true - Tuya will ALWAYS remain active');
    }
    this.log('[HYBRID] ');

    if (mode.tuyaHits > 0 && mode.zigbeeHits === 0) {
      mode.zigbeeActive = false;
      mode.decided = true;
      mode.decidedMode = 'tuya';
      this.log('[HYBRID]  Decision: TUYA ONLY');
    } else if (mode.zigbeeHits > 0 && mode.tuyaHits === 0 && !forceActive) {
      // v5.5.193: Only disable Tuya if forceActiveTuyaMode is NOT set
      mode.tuyaActive = false;
      mode.decided = true;
      mode.decidedMode = 'zigbee';
      this.log('[HYBRID]  Decision: ZIGBEE ONLY');
    } else if (mode.zigbeeHits > 0 && mode.tuyaHits === 0 && forceActive) {
      // v5.5.193: Keep Tuya active due to forceActiveTuyaMode
      mode.decided = true;
      mode.decidedMode = 'hybrid-forced';
      this.log('[HYBRID]  Decision: KEEP TUYA ACTIVE (forceActiveTuyaMode)');
    } else if (mode.tuyaHits > 0 && mode.zigbeeHits > 0) {
      mode.decided = true;
      mode.decidedMode = 'hybrid';
      this.log('[HYBRID]  Decision: KEEP HYBRID (both active)');
    } else {
      // v5.5.193: If no data received but forceActive, keep Tuya mode
      if (forceActive) {
        mode.tuyaActive = true;
        mode.decidedMode = 'hybrid-forced';
        this.log('[HYBRID]  No data but forceActiveTuyaMode - keeping Tuya active');
      } else {
        this.log('[HYBRID]  No data received - keeping hybrid mode');
      }
    }

    // Save decision
    this.setStoreValue('hybrid_mode', mode.decidedMode).catch(() => { });
  }

  /**
   * 
   * TUYA BOUND CLUSTER (tuyaBoundCluster equivalent) - COMMANDS
   * 
   */
  async sendTuyaDP(dpId, value, dpType = TUYA_DP_TYPE.VALUE) {
    this.log(`[TUYA-CMD] Sending DP${dpId} = ${value} (type: ${dpType})`);

    const endpoint = this.zclNode?.endpoints?.[1];
    const tuyaCluster = endpoint?.clusters?.tuya;

    if (!tuyaCluster) {
      this.log('[TUYA-CMD]  Tuya cluster not available');
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
        this.log('[TUYA-CMD]  DP sent successfully');
        return true;
      }
    } catch (e) {
      this.log('[TUYA-CMD]  Send failed:', e.message);
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
   * 
   * Z2M MAGIC PACKET - v5.5.93
   * Source: https://github.com / Koenkk/zigbee-herdsman-converters / blob/master / src/lib / tuya.ts
   * 
   */

  /**
   * v5.5.93: Send Z2M Magic Packet to wake up Tuya devices
   * This is equivalent to Z2M's configureMagicPacket + dataQuery
   * ALL Tuya TS0601 devices need this to start reporting data!
   */
  async _sendZ2MMagicPacket(zclNode) {
    try {
      const endpoint = zclNode?.endpoints?.[1];
      if (!endpoint) {
        this.log('[Z2M-MAGIC]  No endpoint 1');
        return;
      }

      // Get Tuya cluster (CLUSTERS.TUYA_EF00)
      const tuyaCluster = endpoint.clusters?.tuya ||
        endpoint.clusters?.[CLUSTERS.TUYA_EF00] ||
        endpoint.clusters?.['manuSpecificTuya'] ||
        endpoint.clusters?.[CLUSTERS.TUYA_EF00];

      this.log('[Z2M-MAGIC]  Sending Tuya Magic Packet (Z2M style)...');

      if (tuyaCluster) {
        // Step 1: MCU Version Request (0x10) - optional but helps
        if (typeof tuyaCluster.mcuVersionRequest === 'function') {
          try {
            await tuyaCluster.mcuVersionRequest({ data: Buffer.from([0x00, 0x02]) });
            this.log('[Z2M-MAGIC]  MCU Version Request sent');
          } catch (e) {
            this.log('[Z2M-MAGIC] MCU Version Request failed:', e.message);
          }
        }

        await new Promise(r => setTimeout(r, 100));

        // Step 2: Data Query (0x03) - CRITICAL for starting reports
        if (typeof tuyaCluster.dataQuery === 'function') {
          try {
            await tuyaCluster.dataQuery({ seq: Date.now() % 65535 });
            this.log('[Z2M-MAGIC]  Data Query sent');
          } catch (e) {
            this.log('[Z2M-MAGIC] Data Query failed:', e.message);
          }
        } else if (typeof tuyaCluster.command === 'function') {
          // Fallback: send via command method
          try {
            await tuyaCluster.command('dataQuery', { seq: Date.now() % 65535 });
            this.log('[Z2M-MAGIC]  Data Query sent via command()');
          } catch (e) {
            this.log('[Z2M-MAGIC] Data Query command failed:', e.message);
          }
        }
      } else {
        this.log('[Z2M-MAGIC]  No Tuya cluster found - device may not be TS0601');
      }

      this.log('[Z2M-MAGIC]  Magic Packet sequence complete');
    } catch (err) {
      this.log('[Z2M-MAGIC]  Error:', err.message);
    }
  }

  /**
   * 
   * UTILITY METHODS
   * 
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
      await this._safeSetCapability(capability, value);
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
        this.log('[TUYA-CMD]  dataQuery sent');
        return true;
      }

      // Fallback: use TuyaEF00Manager
      if (this.tuyaEF00Manager && typeof this.tuyaEF00Manager.requestDPs === 'function') {
        await this.tuyaEF00Manager.requestDPs([]);
        return true;
      }
    } catch (e) {
      this.log('[TUYA-CMD]  requestAllDPs failed:', e.message);
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

  /**
   * Respond to Tuya time sync request
   * v5.10.4: Standardized response with sequence number echo
   */
  async _respondToTimeSync(sequenceNumber = 0) {
    if (this._isSyncingTime) return;
    this._isSyncingTime = true;
    
    try {
      this.log(`[TIME-SYNC]  Responding to request with seq=${sequenceNumber}`);
      const { syncDeviceTimeTuya } = require('../tuya/TuyaTimeSync');
      await syncDeviceTimeTuya(this, { sequenceNumber });
    } catch (e) {
      this.log('[TIME-SYNC]  Response failed:', e.message);
    } finally {
      this._isSyncingTime = false;
    }
  }
}

// Export with DP types and constants
TuyaUnifiedDevice.TUYA_DP_TYPE = TUYA_DP_TYPE;

module.exports = TuyaUnifiedDevice;


