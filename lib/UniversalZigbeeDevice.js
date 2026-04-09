'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const SmartDriverAdaptation = require('./managers/SmartDriverAdaptation');
const DiagnosticLogsCollector = require('./diagnostics/DiagnosticLogsCollector');
const SmartBatteryManager = require('./managers/SmartBatteryManager');
const SmartEnergyManager = require('./managers/SmartEnergyManager');
const UnknownClusterHandler = require('./clusters/UnknownClusterHandler');
const TuyaUniversalBridge = require('./TuyaUniversalBridge');
const { trackTx, trackRx } = require('./utils/UniversalThrottleManager');

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

    // 5. TRAFFIC MONITORING
    this._setupRawFrameFallback();
  }

  /**
   * Scan and bind clusters dynamically
   */
  async scanClusters() {
    try {
      await this.waitForZclNode(5000);
      const bound = UnknownClusterHandler.scanAndBind(this.zclNode, this);
      if (bound.length > 0) {
        this.log(`🔗 [SCAN] Bound ${bound.length} clusters dynamically`);
      }
    } catch (err) {
      this.log(`⚠️ [SCAN] Error: ${err.message}`);
    }
  }

  /**
   * Intelligent Adaptation — Uses SmartDriverAdaptation to bridge clusters to capabilities
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
       this.log(`⚠️ [MANAGERS] Init error: ${err.message}`);
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
    this.node.handleFrame = (endpointId, clusterId, frame, meta) => {
      let handled = false;
      
      // Standardized driver-level hook: onZigBeeMessage
      if (typeof this.onZigBeeMessage === 'function') {
        try {
          if (this.onZigBeeMessage(endpointId, clusterId, frame, meta) === true) {
            handled = true;
          }
        } catch (e) {
          this.log(`⚠️ [RX] Error calling onZigBeeMessage: ${e.message}`);
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
    this.log('⚙️ [UNIVERSAL] Configuring dynamic reporting & listeners...');
    
    for (const cap of realCapabilities.required) {
      if (!this.hasCapability(cap)) continue;
      
      try {
        // Dynamic mapping based on cluster analysis
        const mapping = this.smartAdaptation.getCapabilityMapping(cap);
        if (mapping && mapping.cluster) {
          this.log(`   🔗 Binding ${cap} to cluster ${mapping.cluster}`);
          
          // 1. Configure Reporting (SDK3 Standard)
          if (mapping.reportable) {
            await this.configureAttributeReporting([{
              endpoint: mapping.endpoint || 1,
              cluster: mapping.cluster,
              attribute: mapping.attribute,
              minInterval: 60,
              maxInterval: 3600,
              minChange: mapping.minChange || 1
            }]).catch(e => this.log(`⚠️ [REPORT] ${cap} config failed: ${e.message}`));
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
        this.error(`❌ [INIT] Failed to configure ${cap}: ${err.message}`);
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
      this.log(`⚠️ [CAP] Set ${capability}=${value} failed: ${err.message}`);
    }
    return false;
  }
}

module.exports = UniversalZigbeeDevice;
