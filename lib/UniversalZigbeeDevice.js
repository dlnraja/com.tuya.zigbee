'use strict';
const { safeDivide, safeMultiply, safeParse } = require('./utils/tuyaUtils.js');


const { ZigBeeDevice } = require('homey-zigbeedriver');
const SmartDriverAdaptation = require('./managers/SmartDriverAdaptation');
const DiagnosticLogsCollector = require('./diagnostics/DiagnosticLogsCollector');
const SmartBatteryManager = require('./managers/SmartBatteryManager');
const SmartEnergyManager = require('./managers/SmartEnergyManager');
const UnknownClusterHandler = require('./clusters/UnknownClusterHandler');
const TuyaUniversalBridge = require('./TuyaUniversalBridge');
const { trackTx, trackRx } = require('./utils/UniversalThrottleManager');
const IntelligentFrameAnalyzer = require('./zigbee/IntelligentFrameAnalyzer');
const AdaptiveLightingManager = require('./managers/AdaptiveLightingManager');
const ManufacturerFeatureMapper = require('./zigbee/ManufacturerFeatureMapper');
const SmartGestureEngine = require('./zigbee/SmartGestureEngine');
const VirtualEnergyManager = require('./managers/VirtualEnergyManager');
const UniversalFlowCardManager = require('./managers/UniversalFlowCardManager');

// v7.0.51: Radio Sensing Calibration (Motion detection via LQI fluctuation)
const SENSING_THRESHOLD = 20; // LQI variation to trigger presence
const SENSING_WINDOW_SIZE = 5; // Samples to compare

// v7.0.23: Sequence correlation window for cross-protocol deduplication
const CORRELATION_WINDOW_MS = 1000;

/**
 * UniversalZigbeeDevice - The master class for ANY Zigbee device
 * Handlers: Native ZCL, Custom Clusters, and Tuya DP
 */

const ZigBeeDeviceWithDiagnostics = DiagnosticLogsCollector(ZigBeeDevice);

class UniversalZigbeeDevice extends ZigBeeDeviceWithDiagnostics {

  async onNodeInit() {
    this.log(`[UNIVERSAL] Initializing: ${this.getName()}`);

    // Standard Zigbee Info
    this.printNode();

    // 1. SCAN AND BIND ALL CLUSTERS (Standard & Manufacturer)
    await this.scanClusters();

    // 2. RUN INTELLIGENT ADAPTATION (Identification & Capability Mapping)
    await this.runIntelligentAdaptation();

    // 3. INIT SUB-MANAGERS
    await this.initManagers();

    // 4. SETUP PERMISSIVE DATA BRIDGE
    await this.initUniversalBridge();

    // 5. TRAFFIC MONITORING & DEEP INTERPRETATION
    this.frameAnalyzer = new IntelligentFrameAnalyzer(this);
    this._setupRawFrameFallback();

    // 6. BRAND HANDSHAKES (Exotic protocols)
    const { ExoticQuirkEngine } = require('./zigbee/ExoticQuirkEngine');
    await ExoticQuirkEngine.runHandshake(this).catch(e => this.log(` [QUIRK-INIT] Failed: ${e.message}`));

    // 7. HIGH-END FEATURES (Adaptive Lighting & Sensing)
    this.adaptiveLighting = new AdaptiveLightingManager(this);
    await this.adaptiveLighting.init();
    
    // 8. SMART GESTURES (Clicks, Holds, Multi-clicks)
    this.gestureEngine = new SmartGestureEngine(this);

    // 9. VIRTUAL ENERGY COMPENSATION (Algorithmic Monitoring)
    this.virtualEnergy = new VirtualEnergyManager(this);
    await this.virtualEnergy.init();

    // 10. UNIVERSAL FLOW CARDS (Smarter Triggers)
    this.flowCards = new UniversalFlowCardManager(this);
    await this.flowCards.init();

    // 11. HIGH-PERFORMANCE CACHE (Fast-path for frequent frames)
    this._decoderCache = new Map();
  }

  /**
   * Scan and bind clusters dynamically
   */
  async scanClusters() {
    try {
      await this.waitForZclNode(5000);
      const bound = UnknownClusterHandler.scanAndBind(this.zclNode, this);
      if (bound.length > 0) {
        this.log(` [SCAN] Bound ${bound.length} clusters dynamically`);
      }
    } catch (err) {
      this.log(` [SCAN] Error: ${err.message}`);
    }
  }

  /**
   * Intelligent Adaptation  Uses SmartDriverAdaptation to bridge clusters to capabilities
   */
  async runIntelligentAdaptation() {
    try {
      await this.waitForZclNode();
      this.smartAdaptation = new SmartDriverAdaptation(this);
      const result = await this.smartAdaptation.analyzeAndAdapt();
      this.log('[ADAPT] Result:', result.success ? 'SUCCESS' : 'PARTIAL');
      
      // NEW: Trigger dynamic capability configuration for Universal driver
      if (result.success && result.realCapabilities) {
        await this.autoConfigureCapabilities(result.realCapabilities);
      }
    } catch (err) {
      this.error('[ADAPT] Failed:', err.message);
    }
  }

  async initManagers() {
    try {
      this.smartBattery = new SmartBatteryManager(this);
      await this.smartBattery.init();

      this.smartEnergy = new SmartEnergyManager(this);
      await this.smartEnergy.init();
    } catch (err) {
       this.log(` [MANAGERS] Init error: ${err.message}`);
    }
  }

  async initUniversalBridge() {
    try {
      this._universalBridge = new TuyaUniversalBridge(this);
      await this._universalBridge.init();
    } catch (e) {
      this.log('[BRIDGE] Init error: ' + e.message);
    }
  }

  _setupRawFrameFallback() {
    if (!this.node || this.node._rawFrameFallbackInjected) return;
    
    const originalHandleFrame = this.node.handleFrame;
    this.node.handleFrame = async (endpointId, clusterId, frame, meta) => {
      let handled = false;
      
      // 1. DEEP INTERPRETATION (Handle everything RAW)
      if (this.frameAnalyzer) {
        try {
          const decoded = await this.frameAnalyzer.parse(endpointId, clusterId, frame, meta);
          if (decoded) {
             // 1.0 FAST-PATH CACHING
             const cacheKey = `${decoded.clusterId}_${decoded.commandId}`;
             if (this._decoderCache.has(cacheKey)) {
                const handler = this._decoderCache.get(cacheKey);
                if (handler === 'SKIP') return;
             }

             // 1.1 CROSS-PROTOCOL CORRELATION (Prevent duplicate triggers)
             const correlationKey = `${decoded.type}_${decoded.seqNum}_${decoded.endpoint}`;
             if (this._isDuplicateCorrelation(correlationKey)) return;

             // 1.2 RADIO SENSING (Presence via RF interference)
             if (meta && meta.lqi) this._processRadioSensing(meta.lqi);

             // 1.3 DYNAMIC ENRICHMENT (Discovery in real-time)
             await this._dynamicallyEnrichCapabilities(decoded);
             
             // 1.5 SMART GESTURE DETECTION (Clicks/Holds)
             if (decoded.commandName === 'onOff' || decoded.isClick) {
                this.gestureEngine.process('zcl', decoded.commandName === 'onOff' ? 'click' : decoded.type, decoded.seqNum);
             }

             this.emit('zigbee_message', decoded);
          }
        } catch (e) {
          this.log(` [DEEP-PARSER] Error: ${e.message}`);
        }
      }

      // 2. Standard driver-level hook: onZigBeeMessage
      if (typeof this.onZigBeeMessage === 'function') {
        try {
          // Track activity for persistence logic
          if (typeof decoded !== 'undefined' && decoded.attributes) {
             decoded.attributes.forEach(attr => this._trackCapabilityActivity(attr));
          }
          
          if (this.onZigBeeMessage(endpointId, clusterId, frame, meta) === true) {
            handled = true;
          }
        } catch (e) {
          this.log(` [RX] Error calling onZigBeeMessage: ${e.message}`);
        }
      }

      this.trackIncomingReport();
      if (handled) return;

      if (typeof originalHandleFrame === 'function') {
        return originalHandleFrame.call(this.node, endpointId, clusterId, frame, meta);
      }
    };
    this.node._rawFrameFallbackInjected = true;
  }

  /**
   * Wait for ZCL node to be ready
   */
  async waitForZclNode(maxWaitMs = 15000) {
    const startTime = Date.now();
    while (!this.zclNode && Date.now() - startTime < maxWaitMs) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (!this.zclNode) throw new Error(`ZCL Node not ready after ${maxWaitMs}ms`);
    return this.zclNode;
  }

  /**
   * Traffic counters
   */
  trackIncomingReport() {
    trackRx(this.getData().id);
  }

  /**
   * Auto-configure reporting and listeners for all detected capabilities
   */
  async autoConfigureCapabilities(realCapabilities) {
    this.log(' [UNIVERSAL] Configuring dynamic reporting & listeners...');
    
    for (const cap of realCapabilities.required) {
      if (!this.hasCapability(cap)) continue;
      
      try {
        // Dynamic mapping based on cluster analysis
        const mapping = this.smartAdaptation.getCapabilityMapping(cap);
        if (mapping && mapping.cluster) {
          this.log(`    Binding ${cap} to cluster ${mapping.cluster}`);
          
          // 1. Configure Reporting (SDK3 Standard)
          if (mapping.reportable) {
            const clusterObj = this.getSafeCluster(mapping.cluster, mapping.endpoint || 1);
            if (clusterObj) {
              await this.configureAttributeReporting([{
                endpoint: mapping.endpoint || 1,
                cluster: mapping.cluster,
                attribute: mapping.attribute,
                minInterval: 60,
                maxInterval: 3600,
                minChange: mapping.minChange || 1
              }]).catch(e => this.log(` [REPORT] ${cap} config failed: ${e.message}`));
            } else {
              this.log(` [REPORT] Skip ${cap} - cluster ${mapping.cluster} not found (raw check failed)`);
            }
          }
          
          // 2. Register Report Listener
          this.registerCapabilityListener(cap, async (value) => {
            if (mapping.setCommand) {
              return await mapping.setCommand(value);
            }
            return value;
          });
          
          // 3. Setup incoming data handler
          if (mapping.cluster && mapping.attribute) {
             // Handle via onZigBeeMessage or built-in handlers
          }
        }
      } catch (err) {
        this.error(` [INIT] Failed to configure ${cap}: ${err.message}`);
      }
    }
  }

  // Capability Helpers
  async safeSetCapabilityValue(capability, value) {
    try {
      if (!this.hasCapability(capability)) {
        await this.addCapability(capability).catch(() => {});
      }
      if (this.hasCapability(capability)) {
        await this.setCapabilityValue(capability, value);
        return true;
      }
    } catch (err) {
      this.log(` [CAP] Set ${capability}=${value} failed: ${err.message}`);
    }
    return false;
  }

  /**
   * getSafeCluster - Defensive cluster retrieval with raw ID fallback
   */
  getSafeCluster(clusterId, endpointId = 1) {
    const { getSafeCluster: utilGetSafeCluster } = require('./Util');
    return utilGetSafeCluster(this, clusterId, endpointId);
  }

  /**
   * sendRawFrame - Directly send a native Zigbee frame (Buffer) to an safeDivide(endpoint, cluster)
   */
  async sendRawFrame(endpointId, clusterId, frame) {
    try {
      if (!this.node) throw new Error('Zigbee node not available');
      const data = Buffer.from(frame);
      this.log(`[TX-RAW] EP=${endpointId} CL=0x${clusterId.toString(16)} DATA=${data.toString('hex')}`);
      return await this.node.sendFrame(endpointId, clusterId, data);
    } catch (e) {
      this.error(` [TX-RAW] Failed: ${e.message}`);
      return false;
    }
  }

  _isDuplicateCorrelation(key) {
    this._recentCorrelations = this._recentCorrelations || new Map();
    const now = Date.now();
    if (this._recentCorrelations.has(key)) {
      if (now - this._recentCorrelations.get(key) < CORRELATION_WINDOW_MS) return true;
    }
    this._recentCorrelations.set(key, now);
    
    // Cleanup old entries periodically
    if (this._recentCorrelations.size > 50) {
      for (const [k, ts] of this._recentCorrelations.entries()) {
        if (now - ts > CORRELATION_WINDOW_MS) this._recentCorrelations.delete(k);
      }
    }
    return false;
  }

  /**
   * _processRadioSensing - Analyze LQI fluctuations for presence detection
   */
  _processRadioSensing(lqi) {
    if (!this.getSetting('zigbee_sensing_enabled')) return;
    
    this._lqiBuffer = this._lqiBuffer || [];
    this._lqiBuffer.push(lqi);
    if (this._lqiBuffer.length > SENSING_WINDOW_SIZE) this._lqiBuffer.shift();
    
    if (this._lqiBuffer.length === SENSING_WINDOW_SIZE) {
       const avg = this._lqiBuffer.reduce((a, b) => a + b,0, SENSING_WINDOW_SIZE);
       const diff = Math.abs(lqi - avg);
       
       if (diff > SENSING_THRESHOLD) {
          if (!this.hasCapability('sensor_presence')) {
             this.log(` [SENSING] RF interference detected - Adding Presence Capability`);
             this.addCapability('sensor_presence').catch(() => {});
          }
          this.setCapabilityValue('sensor_presence', true).catch(() => {});
          
          // Auto-reset presence after 1 minute of stable LQI
          if (this._sensingTimer) clearTimeout(this._sensingTimer);
          this._sensingTimer = setTimeout(() => {
             this.setCapabilityValue('sensor_presence', false).catch(() => {});
          }, 60000);
       }
    }
  }

  /**
   * _trackCapabilityActivity - Update last-seen timestamp for persistence
   */
  _trackCapabilityActivity(decodedAttr) {
     this._capActivity = this._capActivity || new Map();
     this._capActivity.set(decodedAttr.idHex || decodedAttr.id, Date.now());
  }

  /**
   * _cleanupStaleCapabilities - Remove capabilities with no data for long periods
   */
  async _cleanupStaleCapabilities() {
    const STALE_PERIOD =safeMultiply(7, 24) * 60 * 60 * 1000; // 7 days
    const now = Date.now();
    this._capActivity = this._capActivity || new Map();
    
    // This would ideally check against the mappings in _dynamicallyEnrichCapabilities
    // For now, it tracks activity per cluster attribute ID
  }

  /**
   * _dynamicallyEnrichCapabilities - Add capabilities in real-time based on discovered data
   */
  async _dynamicallyEnrichCapabilities(decoded) {
    try {
      // Logic inspired by z2m: if we see an unknown cluster reporting data, add the matched capability
      const mappings = {
        'onOff': 'onoff',
        'levelControl': 'dim',
        'msTemperatureMeasurement': 'measure_temperature',
        'msRelativeHumidity': 'measure_humidity',
        'msIlluminanceMeasurement': 'measure_luminance',
        'ssIasZone': 'alarm_contact',
        'genPowerCfg': 'measure_battery',
        'legrand_mode': 'legrand_mode' // Discovered custom
      };

      const clusterSelector = decoded.clusterHex || `0x${decoded.clusterId?.toString(16)}`;const targetCap = mappings[decoded.commandName] || mappings[clusterSelector];
      
      if (targetCap && !this.hasCapability(targetCap)) {
        this.log(` [ENRICH] Discovered missing capability: ${targetCap} (via ${clusterSelector})`);
        await this.addCapability(targetCap).catch(() => {});
      }
    } catch (e) {}
  }

  /**
   * --- FLOW CARD DYNAMIC HANDLERS ---
   * Implements support for all new features (Adaptive Lighting, Quirk Handshakes, etc.)
   */
  async onFlowActionSetAdaptiveLighting(args) {
    if (this.adaptiveLighting) {
      if (args.enabled) this.adaptiveLighting.start();
      else this.adaptiveLighting.stop();
      return true;
    }
    return false;
  }

  async onFlowActionRunQuirkHandshake() {
    return await ExoticQuirkEngine.runHandshake(this);
  }
}

module.exports = UniversalZigbeeDevice;



