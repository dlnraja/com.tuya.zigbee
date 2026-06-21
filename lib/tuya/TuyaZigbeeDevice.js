'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const DiagnosticLogsCollector = require('../diagnostics/DiagnosticLogsCollector');
const DiagnosticLogger = require('../diagnostics/DiagnosticLogger');
const { trackTx, trackRx } = require('../utils/UniversalThrottleManager');
const CapabilityMapCache = require('../utils/CapabilityMapCache');
const { assertZCLNode, assertClusterSpecification } = require('../util');

/**
 * TuyaZigbeeDevice - Base class for all Tuya Zigbee devices
 * Provides common functionality for Tuya devices
 * NOW WITH:
 * - 🤖 INTELLIGENT DRIVER ADAPTATION
 * - 📊 COMPREHENSIVE DIAGNOSTIC LOGS
 */

// Apply DiagnosticLogsCollector mixin to ZigBeeDevice
const ZigBeeDeviceWithDiagnostics = DiagnosticLogsCollector(ZigBeeDevice);

// Universal Button Management Elevation (v7.1.0)
const PhysicalButtonMixin = require('../mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../mixins/VirtualButtonMixin');

class TuyaZigbeeDevice extends PhysicalButtonMixin(VirtualButtonMixin(ZigBeeDeviceWithDiagnostics)) {

  constructor(...args) {
    super(...args);

    // 🛡️ DESTRUCTION GUARD (v8.5.0) - Prevents "Cannot access this.homey" crashes
    this._destroyed = false;

    // 📊 Structured diagnostic logger
    this._diagLogger = new DiagnosticLogger(this, 'TuyaZigbeeDevice');

    // 🌌 ANTIGRAVITY FAULT ISOLATOR
    this._antigravityIsolator = {
      mutedErrors: new Set([
        'TIMEOUT', 'MAC_NO_ACK', 'NWK_INVALID_REQUEST', 'APS_NOT_REGISTERED',
        'ZCL_STATUS_NOT_FOUND', 'UNSUPPORTED_ATTRIBUTE', 'INVALID_VALUE'
      ]),
      stats: { isolations: 0, lastIsolation: null }
    };

    // 🔗 PAIRING & NETWORK REJOIN (v9.1.0) - Fixes pairing failures and network drops
    this._pairingRetryState = {
      consecutiveFailures: 0,
      lastAttempt: null,
      lastSuccess: null,
      maxRetries: 5,
      backoffBaseMs: 2000,
      backoffMaxMs: 60000,
      rejoinAttempts: 0,
      maxRejoinAttempts: 3
    };
  }

  /**
   * 🌌 Antigravity Safe Invoke
   * Wraps an async call with fault isolation.
   */
  async _safeInvoke(fn, context = 'unknown', fallback = null) {
    try {
      return await fn();
    } catch (err) {
      const errorMsg = err.message || String(err);
      const isMuted = [...this._antigravityIsolator.mutedErrors].some(m => errorMsg.includes(m));

      if (isMuted) {
        this._antigravityIsolator.stats.isolations++;
        this._antigravityIsolator.stats.lastIsolation = new Date().toISOString();
        
        // Log to DiagnosticAPI for analysis but keep main logs clean
        if (this.safeApp?.diagnosticAPI) {
          this.safeApp?.diagnosticAPI.addLog('DEBUG', 'ANTIGRAVITY', `Isolated ${context}: ${errorMsg}`, this.getName());
        }
        return fallback;
      }

      // Non-muted error - log to main
      this.error(`[ANTIGRAVITY-BREAK] 🚨 Non-isolated error in ${context}:`, errorMsg);
      return fallback;
    }
  }

  /**
   * 🌌 Antigravity Guard for listeners
   * Returns an async function that wraps the provided handler.
   */
  _antigravityGuard(handler, context = 'listener') {
    return async (...args) => {
      try {
        return await handler(...args);
      } catch (err) {
        this._antigravityIsolator.stats.isolations++;
        const errorMsg = err.message || String(err);
        if (this.safeApp?.diagnosticAPI) {
          this.safeApp?.diagnosticAPI.addLog('WARN', 'ANTIGRAVITY', `Guarded ${context} caught error: ${errorMsg}`, this.getName());
        }
      }
    };
  }

  // 🏗️ L12-L14 Architectural Layer Getters
  get sessionManager() { return this.safeApp?.sessionManager; }
  get healthMonitor() { return this.safeApp?.healthMonitor; }
  get sanityFilter() { return this.safeApp?.sanityFilter; }

  /**
   * onNodeInit is called when the device is initialized
   */
  
  /** Safe app getter to prevent proxy crash */
  get safeApp() {
    try { if (!this.homey || this.homey.isDestroyed || this._destroyed) return null; return this.homey.app; } catch(e) { return null; }
  }

  /** 
   * 🛡️ Safe homey accessor - prevents "Cannot access this.homey" crash (v8.5.0)
   */
  get _safeHomey() {
    if (this._destroyed) return null;
    try { return this.homey; } catch(e) { return null; }
  }

  async onNodeInit({ zclNode } = {}) {
    // Assert zclNode is valid
    if (zclNode) {
      assertZCLNode(zclNode);
      this.zclNode = zclNode;
    }
    this.log('TuyaZigbeeDevice initialized');

    // Enable debug logging if needed
    this.enableDebug();

    // Print cluster information
    this.printNode();

    // 🤖 RUN INTELLIGENT DRIVER ADAPTATION
    await this.runIntelligentAdaptation().catch(err => this.error(`[INIT] ⚠️ runIntelligentAdaptation failed:`, err?.message || err));

    // 🔋 SMART BATTERY & ENERGY DETECTION
    await this.initSmartManagers().catch(err => this.error(`[INIT] ⚠️ initSmartManagers failed:`, err?.message || err));

    // 🌐 v5.12.2: UNIVERSAL BRIDGE - connects ALL DPs/clusters to flow cards
    await this.initUniversalBridge().catch(err => this.error(`[INIT] ⚠️ initUniversalBridge failed:`, err?.message || err));

    // 🔘 v7.1.0: UNIVERSAL BUTTON ARCHITECTURE
    // Automatically attempts to initialize physical/virtual button layers for ALL devices.
    // The mixins are designed to degrade gracefully if the device lacks button capabilities.
    if (typeof this.initPhysicalButtonDetection === 'function') {
      await this.initPhysicalButtonDetection(zclNode).catch(err => this.log(`[BUTTON-INIT] ⚠️ Physical error: ${err.message}`));
    }
    if (typeof this.initVirtualButtons === 'function') {
      await this.initVirtualButtons().catch(err => this.log(`[BUTTON-INIT] ⚠️ Virtual error: ${err.message}`));
    }

    // 🛡️ v5.13.0: UNIVERSAL TX/RX FALLBACK HANDLER
    this._setupRawFrameFallback();

    // v9.0.40: Defer heavy initialization to avoid blocking device startup
    // This improves device responsiveness during initialization
    this.homey.setTimeout(async () => {
      if (this._destroyed) return;
      try {
        // 🔗 v5.8.18: SCAN AND BIND UNKNOWN CLUSTERS
        await this.scanUnknownClusters().catch(err => this.error(`[INIT] ⚠️ scanUnknownClusters failed:`, err?.message || err));

        // 📡 v7.3: ENFORCE CLUSTER BINDINGS (ADVERTISEMENT MODE)
        await this.enforceClusterBindings().catch(err => this.error(`[INIT] ⚠️ enforceClusterBindings failed:`, err?.message || err));

        // L3: Send query_all to wake up TS0601 devices (Enchant pattern)
        if (this._protocolInfo?.isTuyaDP || this._protocolInfo?.protocol === 'HYBRID') {
          await this.tuyaEF00Manager?.queryAllDatapoints?.();
        }
      } catch (err) {
        this.error('[DEFERRED-INIT] Error:', err?.message || err);
      }
    }, 1000);

    // v9.0.40: Warm up capability map cache after full initialization
    CapabilityMapCache.warmup(this);
  }

  /**
   * 🛡️ UNIVERSAL RAW FRAME HANDLER
   * Intercepts unhandled ZigBee frames before Homey SDK routing
   * v5.13.2: Standardized as onZigBeeMessage (uppercase B) for driver-level hooks
   */
  _setupRawFrameFallback() {
    if (!this.node) {
      this._diagLogger.warn('Cannot setup raw frame fallback: node not available');
      return;
    }

    // Check if handleFrame is already hijacked to prevent infinite loop
    if (this.node._rawFrameFallbackInjected) {
      this._diagLogger.verbose('Raw frame fallback already injected, skipping');
      return;
    }

    // L0: Duplicate frame debounce cache (5s window)
    if (!this._frameDedupCache) this._frameDedupCache = new Map();
    if (!this._frameDedupCount) this._frameDedupCount = 0;

    this._diagLogger.info('Setting up Universal Raw Frame Fallback v5.13.2');
    const originalHandleFrame = this.node.handleFrame;

    this.node.handleFrame = (endpointId, clusterId, frame, meta) => {
      // L0: Duplicate frame filtering
      const cacheKey = `${endpointId}:${clusterId}:${meta?.cmdId || 0}:${frame?.slice?.(0, 4)?.toString('hex') || 'na'}`;
      const now = Date.now();
      const lastSeen = this._frameDedupCache.get(cacheKey);
      if (lastSeen && (now - lastSeen) < 5000) return; // 5s debounce
      this._frameDedupCache.set(cacheKey, now);
      // v9.1.2: Cleanup old entries every 100 frames AND when map exceeds 500 entries
      if (this._frameDedupCount++ % 100 === 0 || this._frameDedupCache.size > 500) {
        for (const [k, v] of this._frameDedupCache) {
          if (now - v > 10000) this._frameDedupCache.delete(k);
        }
        // Emergency: if still too large, clear half (oldest)
        if (this._frameDedupCache.size > 500) {
          const keys = [...this._frameDedupCache.keys()];
          for (let i = 0; i < Math.floor(keys.length / 2); i++) {
            this._frameDedupCache.delete(keys[i]);
          }
        }
      }

      let handled = false;

      // Log frame reception for verbose diagnostics
      this._diagLogger.frameReceived({
        endpointId,
        clusterId,
        frame: frame?.data || frame,
        meta
      });

      // 1. Standardized driver-level hook: onZigBeeMessage (uppercase B)
      if (typeof this.onZigBeeMessage === 'function') {
        try {
          if (this.onZigBeeMessage(endpointId, clusterId, frame, meta) === true) {
            handled = true;
          }
        } catch (e) {
          this._diagLogger.operationFailed('onZigBeeMessage handler', e, {
            endpointId,
            clusterId
          });
        }
      }

      // 2. Legacy driver-level hook: onZigbeeMessage (lowercase b)
      if (!handled && typeof this.onZigbeeMessage === 'function') {
        try {
          if (this.onZigbeeMessage(endpointId, clusterId, frame, meta) === true) {
            handled = true;
          }
        } catch (e) {
          this._diagLogger.operationFailed('onZigbeeMessage handler (legacy)', e, {
            endpointId,
            clusterId
          });
        }
      }

      // 3. Track RX statistics universally
      this.trackIncomingReport();

      // If handled by specific driver, do not pass to SDK
      if (handled) {return;}

      // 4. Fallback to default Homey SDK native routing
      if (typeof originalHandleFrame === 'function') {
        return originalHandleFrame.call(this.node, endpointId, clusterId, frame, meta);
      }
    };

    this.node._rawFrameFallbackInjected = true;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // v9.1.0: PAIRING RETRY & NETWORK REJOIN (Issue #1: Pairing Failures)
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Handle device announce - triggered when device rejoins network
   * Provides reconnection logic for devices that drop off
   * v9.0.40: Enhanced with attribute reporting re-configuration
   */
  async onEndDeviceAnnounce() {
    this.log('[PAIRING] Device announce received - device rejoining network');

    // Reset rejoin counter on successful rejoin
    this._pairingRetryState.rejoinAttempts = 0;
    this._pairingRetryState.lastSuccess = Date.now();

    // Re-bind clusters if needed
    if (this.zclNode) {
      await this.enforceClusterBindings().catch(err =>
        this.log(`[PAIRING] Re-bind after announce failed: ${err.message}`)
      );
    }

    // v9.0.40: Re-configure attribute reporting for battery devices
    // This ensures sensors continue to report after waking up
    if (this.zclNode?.endpoints) {
      try {
        await this._reconfigureAttributeReporting();
      } catch (err) {
        this.log(`[PAIRING] Attribute reporting re-configuration failed: ${err.message}`);
      }
    }

    // Trigger health status update
    if (this.safeApp?.healthMonitor) {
      this.safeApp.healthMonitor.recordCheckIn(this.getData().id);
    }

    // v9.0.40: Query all datapoints for Tuya DP devices after rejoin
    if (this._protocolInfo?.isTuyaDP || this._protocolInfo?.protocol === 'HYBRID') {
      this.homey.setTimeout(async () => { if (this._destroyed) return; try {
          await this.tuyaEF00Manager?.queryAllDatapoints?.();
          this.log('[PAIRING] Queried all datapoints after rejoin');
        } catch (err) {
          this.log(`[PAIRING] Query datapoints after rejoin failed: ${err.message}`);
        } }, 2000);
    }
  }

  /**
   * Re-configure attribute reporting after device rejoin
   * v9.0.40: Ensures sensors continue to report properly
   */
  async _reconfigureAttributeReporting() {
    if (!this.zclNode?.endpoints) return;

    const reportingConfigs = [];

    // Temperature sensor
    if (this.hasCapability('measure_temperature')) {
      const ep = this.zclNode.endpoints[1];
      const cluster = ep?.clusters?.temperatureMeasurement || ep?.clusters?.msTemperatureMeasurement;
      if (cluster) {
        reportingConfigs.push({
          cluster: 'temperatureMeasurement',
          attributeName: 'measuredValue',
          minInterval: 60,
          maxInterval: 600,
          minChange: 10,
        });
      }
    }

    // Humidity sensor
    if (this.hasCapability('measure_humidity')) {
      const ep = this.zclNode.endpoints[1];
      const cluster = ep?.clusters?.relativeHumidity;
      if (cluster) {
        reportingConfigs.push({
          cluster: 'relativeHumidity',
          attributeName: 'measuredValue',
          minInterval: 60,
          maxInterval: 600,
          minChange: 10,
        });
      }
    }

    // Battery
    if (this.hasCapability('measure_battery')) {
      const ep = this.zclNode.endpoints[1];
      const cluster = ep?.clusters?.powerConfiguration;
      if (cluster) {
        reportingConfigs.push({
          cluster: 'powerConfiguration',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 300,
          maxInterval: 3600,
          minChange: 1,
        });
      }
    }

    // On/Off
    if (this.hasCapability('onoff')) {
      const ep = this.zclNode.endpoints[1];
      const cluster = ep?.clusters?.onOff;
      if (cluster) {
        reportingConfigs.push({
          cluster: 'onOff',
          attributeName: 'onOff',
          minInterval: 0,
          maxInterval: 600,
          minChange: 1,
        });
      }
    }

    // Apply reporting configurations
    if (reportingConfigs.length > 0) {
      this.log(`[PAIRING] Re-configuring ${reportingConfigs.length} attribute reports`);
      for (const config of reportingConfigs) {
        try {
          const ep = this.zclNode.endpoints[1];
          const cluster = ep?.clusters?.[config.cluster];
          if (cluster?.configureReporting) {
            await cluster.configureReporting({
              attribute: config.attributeName,
              minimumReportInterval: config.minInterval,
              maximumReportInterval: config.maxInterval,
              reportableChange: config.minChange,
            });
            this.log(`[PAIRING] ✅ Re-configured ${config.cluster}.${config.attributeName}`);
          }
        } catch (err) {
          this.log(`[PAIRING] ⚠️ Failed to re-configure ${config.cluster}: ${err.message}`);
        }
      }
    }
  }

  /**
   * Handle device offline event - proactive reconnection
   * Called when Zigbee layer detects device is unresponsive
   */
  async onDeviceOffline() {
    if (this._destroyed) return;

    const state = this._pairingRetryState;
    state.consecutiveFailures++;

    this.log(`[PAIRING] Device offline detected (failure #${state.consecutiveFailures})`);

    // Don't retry if we've exceeded max attempts
    if (state.consecutiveFailures > state.maxRetries) {
      this.error(`[PAIRING] Max reconnection attempts (${state.maxRetries}) exceeded`);
      await this._notifyPairingFailure();
      return;
    }

    // Calculate exponential backoff
    const backoffMs = Math.min(
      state.backoffBaseMs * Math.pow(2, state.consecutiveFailures - 1),
      state.backoffMaxMs
    );

    this.log(`[PAIRING] Scheduling reconnection attempt in ${backoffMs}ms`);

    this.homey.setTimeout(async () => {
      if (this._destroyed) return;
      await this._attemptReconnection();
    }, backoffMs);
  }

  /**
   * Attempt to reconnect to device
   */
  async _attemptReconnection() {
    if (this._destroyed) return;

    const state = this._pairingRetryState;
    state.lastAttempt = Date.now();

    this.log(`[PAIRING] Attempting reconnection (attempt ${state.consecutiveFailures}/${state.maxRetries})`);

    try {
      // Strategy 1: Try to ping device via ZCL
      if (this.zclNode?.endpoints?.[1]) {
        const endpoint = this.zclNode.endpoints[1];
        if (endpoint.clusters?.genBasic) {
          await endpoint.clusters.genBasic.readAttributes(['zclVersion']);
          this.log('[PAIRING] Device responded to ZCL ping');
          state.consecutiveFailures = 0;
          state.lastSuccess = Date.now();
          return;
        }
      }

      // Strategy 2: Request network rejoin
      state.rejoinAttempts++;
      if (state.rejoinAttempts <= state.maxRejoinAttempts) {
        this.log(`[PAIRING] Requesting network rejoin (${state.rejoinAttempts}/${state.maxRejoinAttempts})`);
        // The SDK handles rejoin internally, we just need to wait
        await new Promise(resolve => this.homey.setTimeout(resolve, 5000));
      }

    } catch (err) {
      this.log(`[PAIRING] Reconnection attempt failed: ${err.message}`);
      state.consecutiveFailures++;

      // Schedule next attempt if not exceeded
      if (state.consecutiveFailures <= state.maxRetries) {
        const backoffMs = Math.min(
          state.backoffBaseMs * Math.pow(2, state.consecutiveFailures - 1),
          state.backoffMaxMs
        );
        this.homey.setTimeout(() => { if (this._destroyed) return; this._attemptReconnection(); }, backoffMs);
      } else {
        await this._notifyPairingFailure();
      }
    }
  }

  /**
   * Notify user about persistent pairing failure
   */
  async _notifyPairingFailure() {
    try {
      if (this.safeApp) {
        await this.homey.notifications.createNotification({
          excerpt: `[${this.getName()}] Device disconnected and could not reconnect. Please check battery or re-pair.`
        });
      }
    } catch (e) { /* notification failed, non-critical */ }
  }

  /**
   * Record successful communication - resets failure counters
   */
  _recordPairingSuccess() {
    this._pairingRetryState.consecutiveFailures = 0;
    this._pairingRetryState.rejoinAttempts = 0;
    this._pairingRetryState.lastSuccess = Date.now();
  }

  /**
   * 🤖 INTELLIGENT DRIVER ADAPTATION
   * Détecte automatiquement si le driver est correct et s'adapte
   */
  async runIntelligentAdaptation() {
    // Vérifier si l'adaptation est activée (par défaut: OUI)
    const enableSmartAdaptation = this.getSetting('enable_smart_adaptation');
    if (enableSmartAdaptation === false) {
      this.log('⏩ [SMART ADAPT] Disabled by user setting');
      return;
    }

    this.log('🤖 [SMART ADAPT] Starting intelligent driver adaptation...');

    try {
      // Attendre que le ZCL node soit prêt
      await this.waitForZclNode();

      // Créer l'instance d'adaptation avec base de données intelligente
      const identificationDatabase = this.safeApp?.identificationDatabase || null;
      const SmartDriverAdaptation = require('../managers/SmartDriverAdaptation');
      this.smartAdaptation = new SmartDriverAdaptation(this, identificationDatabase);

      // Exécuter l'analyse et l'adaptation
      const adaptResult = await this.smartAdaptation.analyzeAndAdapt();

      // Sauvegarder le résultat
      this.smartAdaptationResult = adaptResult;

      // Générer le rapport
      const adaptReport = this.smartAdaptation.generateReport(adaptResult);
      this.log(adaptReport);

      // Vérifier si une migration de driver est recommandée
      if (adaptResult.success && adaptResult.deviceInfo) {
        await this.checkDriverMigration(adaptResult);
      }

      // Sauvegarder le rapport dans les settings
      try {
        await this.setSettings({
          smart_adaptation_report: adaptReport,
          smart_adaptation_date: new Date().toISOString(),
          smart_adaptation_success: adaptResult.success
        });
      } catch (err) {
        // Ignore si settings non disponibles
        this.log('⚠️  [SMART ADAPT] Could not save report to settings');
      }

      this.log('✅ [SMART ADAPT] Intelligent adaptation complete');

    } catch (err) {
      this.error('❌ [SMART ADAPT] Failed:', err.message);
      this.error('   Stack:', err.stack);
    }
  }

  /**
   * Vérifie si une migration de driver est nécessaire
   */
  async checkDriverMigration(adaptResult) {
    try {
      this.log('🔍 [MIGRATION] Checking if driver migration is needed...');

      // Créer le manager de migration avec base de données intelligente
      const identificationDatabase = this.safeApp?.identificationDatabase || null;
      const DriverMigrationManager = require('../managers/DriverMigrationManager');
      const migrationManager = new DriverMigrationManager(this.homey, identificationDatabase);

      // Déterminer le meilleur driver
      const bestDriver = migrationManager.determineBestDriver(
        adaptResult.deviceInfo,
        adaptResult.clusterAnalysis || {}
      );

      // Vérifier si migration nécessaire
      const needsMigration = migrationManager.needsMigration(
        this.driver.id,
        bestDriver.driverId,
        bestDriver.confidence
      );

      // Générer le rapport
      const migrationReport = migrationManager.generateMigrationReport(
        this.driver.id,
        bestDriver,
        needsMigration
      );

      this.log(migrationReport);

      // Si migration nécessaire, créer une notification
      if (needsMigration) {
        this.log('⚠️  [MIGRATION] Driver migration RECOMMENDED!');
        await migrationManager.createMigrationNotification(this, bestDriver);

        // Sauvegarder dans settings
        try {
          await this.setSettings({
            recommended_driver: bestDriver.driverId,
            migration_confidence: bestDriver.confidence,
            migration_reasons: bestDriver.reason.join('; ')
          });
        } catch (err) {
          // Ignore
        }
      } else {
        this.log('✅ [MIGRATION] Driver is CORRECT - No migration needed');
      }

    } catch (err) {
      this.error('❌ [MIGRATION] Failed to check migration:', err.message);
    }
  }

  /**
   * 🔗 v5.8.18: Scan and bind unknown/manufacturer-specific clusters
   */
  async scanUnknownClusters() {
    try {
      await this.waitForZclNode(5000);
      const UnknownClusterHandler = require('../clusters/UnknownClusterHandler');
      const bound = UnknownClusterHandler.scanAndBind(this.zclNode, this);
      if (bound.length > 0) {
        this.log(`🔗 [UNKNOWN] Bound ${bound.length} dynamic clusters:`, bound.map(b => `0x${b.cid.toString(16)}`).join(', '));
      }
      this.unknownClustersBound = bound;
    } catch (err) {
      this.log(`⚠️ [UNKNOWN] Scan error: ${err.message}`);
    }
  }

  /**
   * 📡 v7.3: ENFORCE CLUSTER BINDINGS (ADVERTISEMENT MODE)
   * Tuya devices often refuse to push updates (UDP-like advertisement) 
   * unless they are explicitly bound.
   */
  async enforceClusterBindings() {
    try {
      await this.waitForZclNode(5000);
      if (!this.zclNode?.endpoints) return;

      const TARGET_CLUSTERS = [
        0xEF00, 'tuya', 'manuSpecificTuya', // Tuya DP
        0x0500, 'iasZone',                  // Sensors
        0x0006, 'onOff', 'genOnOff',        // Switches
        0x0008, 'levelControl',             // Dimmers
        0x0B04, 'haElectricalMeasurement',  // Energy
        0x0702, 'seMetering'                // Energy
      ];

      for (const [epId, endpoint] of Object.entries(this.zclNode.endpoints)) {
        if (!endpoint?.clusters) continue;
        
        for (const [clusterName, cluster] of Object.entries(endpoint.clusters)) {
          if (typeof cluster.bind === 'function') {
            const isTarget = TARGET_CLUSTERS.some(t => 
              t === clusterName || 
              (typeof t === 'string' && clusterName.toLowerCase() === t.toLowerCase()) || 
              t === cluster.ID
            );
            
            if (isTarget) {
              await cluster.bind().then(() => {
                this.log(`🔗 [BIND] Successfully enforced bind on EP${epId} Cluster ${clusterName}`);
              }).catch(err => {
                this.log(`⚠️ [BIND] Failed bind on EP${epId} Cluster ${clusterName}: ${err?.message}`);
              });
            }
          }
        }
      }
    } catch (err) {
      this.log(`⚠️ [BIND] Enforce Cluster Bindings failed: ${err?.message}`);
    }
  }

  /**
   * Get emitter for a dynamically bound cluster
   */
  getClusterEmitter(clusterId) {
    const UnknownClusterHandler = require('../clusters/UnknownClusterHandler');
    return UnknownClusterHandler.getEmitter(clusterId);
  }

  /**
   * Attend que le ZCL node soit prêt
   */
  async waitForZclNode(maxWaitMs = 10000) {
    const startTime = Date.now();

    while (!this.zclNode && Date.now() - startTime < maxWaitMs) {
      await new Promise(resolve => this.homey.setTimeout(resolve, 500));
    }

    if (!this.zclNode) {
      throw new Error(`ZCL Node not ready after ${maxWaitMs}ms`);
    }

    return this.zclNode;
  }

  /**
   * 📦 OTA UPDATE HANDLER (Maintenance Action UI)
   */
  async onMaintenanceAction(action) {
    if (action && action.id === 'ota_check') {
      return await this._checkOtaRoutine();
    }
    // Fallback for SDK3 signature changes
    if (typeof action === 'string' && action === 'ota_check') {
      return await this._checkOtaRoutine();
    }
  }

  async _checkOtaRoutine() {
    this.log('🛡️ [OTA] Maintenance Action Check Initiated from Device View');
    try {
      const update = await this.safeApp?.otaManager?.checkUpdate(this);
      
      if (update && update.available) {
        await this.homey.notifications.createNotification({
          excerpt: `[${this.getName()}] OTA Firmware Update v${update.newVersion} is available! Please pair to Tuya or Z2M to flash.`
        });
        return `A new firmware (v${update.newVersion}) is available! Check your Homey timeline for details.`;
      } else {
        return '✅ Your device is on the latest Tuya firmware.';
      }
    } catch(err) {
      this.error('[OTA] Maintenance failed:', err.message);
      return `Error checking OTA: ${err.message}`;
    }
  }


  /**
   * Force une nouvelle adaptation (appelable manuellement)
   */
  async forceSmartAdaptation() {
    this.log('🔄 [SMART ADAPT] Forcing re-adaptation...');
    return await this.runIntelligentAdaptation();
  }

  /**
   * Retourne le résultat de l'adaptation
   */
  getSmartAdaptationResult() {
    return this.smartAdaptationResult || null;
  }

  /**
   * 🔋⚡ SMART BATTERY & ENERGY MANAGERS
   * Auto-detect and manage battery/energy capabilities
   */
  async initSmartManagers() {
    try {
      // Initialize Smart Battery Manager
      const SmartBatteryManager = require('../managers/SmartBatteryManager');
      this.smartBattery = new SmartBatteryManager(this);
      await this.smartBattery.init();

      // Initialize Smart Energy Manager
      const SmartEnergyManager = require('../managers/SmartEnergyManager');
      this.smartEnergy = new SmartEnergyManager(this);
      await this.smartEnergy.init();

      // v7.3: Smart Doorlock Handler
      const SmartDoorlockHandler = require('../dynamic/SmartDoorlockHandler');
      this.smartDoorlock = new SmartDoorlockHandler(this);

      // v7.3: Smart Biorhythm (Philips Sunlight) Handler
      const SmartBiorhythmHandler = require('../dynamic/SmartBiorhythmHandler');
      this.smartBiorhythm = new SmartBiorhythmHandler(this);
      await this.smartBiorhythm.init();

      // v7.3: Universal Smart Features Handler
      const UniversalSmartFeaturesHandler = require('../dynamic/UniversalSmartFeaturesHandler');
      this.smartFeatures = new UniversalSmartFeaturesHandler(this);
      await this.smartFeatures.init();

      this.log('✅ [SMART] Battery, Energy, Doorlock, Biorhythm & Features managers initialized');
    } catch (err) {
      this.log(`⚠️ [SMART] Manager init error: ${err.message}`);
    }
  }

  async initUniversalBridge() {
    try {
      const TuyaUniversalBridge = require('../TuyaUniversalBridge');
      this._universalBridge = new TuyaUniversalBridge(this);
      await this._universalBridge.init();
      this.log('[BRIDGE] Universal bridge initialized');
    } catch (e) {
      this.log(`[BRIDGE] Init error: ${  e.message}`);
    }
  }

  /**
   * Handle Tuya DP for battery/energy (call from DP handlers)
   */
  async handleSmartDP(dpId, value) {
    let handled = false;
    
    if (this.smartBattery) {
      handled = await this.smartBattery.handleDP(dpId, value) || handled;
    }
    
    if (this.smartEnergy) {
      handled = await this.smartEnergy.handleDP(dpId, value) || handled;
    }

    if (this.smartDoorlock) {
      handled = await this.smartDoorlock.handleDP(dpId, value) || handled;
    }

    if (this.smartBiorhythm) {
      handled = await this.smartBiorhythm.handleDP(dpId, value) || handled;
    }

    if (this.smartFeatures) {
      handled = await this.smartFeatures.handleDP(dpId, value, typeof value) || handled;
    }
    
    return handled;
  }

  /**
   * onDeleted is called when the user deleted the device
   */
  async onDeleted() {
    this.log('TuyaZigbeeDevice has been deleted');
    // v9.1.2: Set _destroyed EARLY to prevent async callbacks from
    // attempting to use the device during teardown (race condition fix)
    this._destroyed = true;
    // v9.0.40: Release capability map cache on device deletion
    CapabilityMapCache.invalidate(this);
    await this._destroyDevice();
  }

  /**
   * onUninit is called when the device is being uninitialized
   */
  async onUninit() {
    this.log('TuyaZigbeeDevice has been uninitialized');
    this._destroyed = true;
    // v9.0.40: Release capability map cache on device uninit
    CapabilityMapCache.invalidate(this);
    if (this._appCommandTimeout) {
      clearTimeout(this._appCommandTimeout);
    }
    if (this._deviceTimeout) {
      clearTimeout(this._deviceTimeout);
    }
    if (this._timeSyncInterval) {
      this.homey.clearInterval(this._timeSyncInterval);
    }
    // v9.1.2: Clear dedup cache to release memory
    if (this._frameDedupCache) {
      this._frameDedupCache.clear();
      this._frameDedupCache = null;
    }
    if (super.onUninit) {
      await super.onUninit();
    }
  }

  /**
   * enableDebug - Enable debug logging for this device
   */
  enableDebug() {
    // Can be overridden in child classes
  }

  /**
   * parseTuyaBatteryValue - Parse Tuya battery value (0-100 or 0-200)
   */
  parseTuyaBatteryValue(value) {
    if (typeof value !== 'number') {return null;}

    // Tuya devices report battery in 0-100 or 0-200 scale
    const percentage = value <= 100 ? value : value / 2;
    return Math.max(0, Math.min(100, Math.round(percentage)));
  }

  /**
   * registerBatteryCapability - Register battery capability with proper reporting
   */
  async registerBatteryCapability(options = {}) {
    const {
      cluster = 'genPowerCfg',
      attribute = 'batteryPercentageRemaining',
      minInterval = 300,
      maxInterval = 3600,
      minChange = 2
    } = options;

    try {
      await this.registerCapability('measure_battery', cluster, {
        get: attribute,
        report: attribute,
        reportOpts: {
          configureAttributeReporting: {
            minInterval,
            maxInterval,
            minChange
          }
        },
        getOpts: {
          getOnStart: true,
          getOnOnline: true
        },
        reportParser: value => {
          return this.parseTuyaBatteryValue(value);
        }
      });

      this.log('Battery capability registered successfully');
    } catch (err) {
      this.error('Error registering battery capability:', err);
    }
  }

  /**
   * registerOnOffCapability - Register onOff capability
   */
  async registerOnOffCapability() {
    try {
      await this.registerCapability('onoff', 'genOnOff', {
        getOpts: {
          getOnStart: true,
          getOnOnline: true
        }
      });

      this.log('OnOff capability registered successfully');
    } catch (err) {
      this.error('Error registering onoff capability:', err);
    }
  }

  /**
   * registerTemperatureCapability - Register temperature capability
   */
  async registerTemperatureCapability() {
    try {
      await this.registerCapability('measure_temperature', 'msTemperatureMeasurement', {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => this.smartDivisorDetect(value, { min: -30, max: 100 }),
        getOpts: {
          getOnStart: true
        }
      });

      this.log('Temperature capability registered successfully');
    } catch (err) {
      this.error('Error registering temperature capability:', err);
    }
  }

  /**
   * registerHumidityCapability - Register humidity capability
   */
  async registerHumidityCapability() {
    try {
      await this.registerCapability('measure_humidity', 'msRelativeHumidity', {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => this.smartDivisorDetect(value, { min: 0, max: 100 }),
        getOpts: {
          getOnStart: true
        }
      });

      this.log('Humidity capability registered successfully');
    } catch (err) {
      this.error('Error registering humidity capability:', err);
    }
  }

  /**
   * registerLuminanceCapability - Register luminance capability with proper LUX conversion
   */
  async registerLuminanceCapability() {
    try {
      await this.registerCapability('measure_luminance', 'msIlluminanceMeasurement', {
        get: 'measuredValue',
        report: 'measuredValue',
        getOpts: {
          getOnStart: true
        },
        reportParser: value => {
          this.log('Luminance raw value:', value);
          // Convert from illuminance to lux
          const lux = value > 0 ? Math.pow(10, (value - 1) / 10000) : 0;
          this.log('Luminance lux:', lux);
          return Math.round(lux);
        }
      });

      this.log('Luminance capability registered successfully');
    } catch (err) {
      this.error('Error registering luminance capability:', err);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v5.8.31: DEFENSIVE HELPERS (forum/GitHub user problem analysis)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * safeRegisterCapability - Prevents "Missing Capability Listener" crashes
   * Falls back to no-op listener if cluster registration fails
   */
  async safeRegisterCapability(capability, cluster, opts = {}) {
    try {
      if (!this.hasCapability(capability)) {
        await this.addCapability(capability).catch(() => {});
      }
      if (cluster) {
        await this.registerCapability(capability, cluster, opts);
        this.log(`✅ [SAFE-REG] ${capability} via ${cluster}`);
        return true;
      }
    } catch (err) {
      this.log(`⚠️ [SAFE-REG] ${capability} cluster fail: ${err.message}`);
    }
    // Fallback: no-op listener
    try {
      if (this.hasCapability(capability)) {
        this.registerCapabilityListener(capability, async (value) => {
          this.log(`[SAFE-REG] ${capability} = ${value} (fallback)`);
          this.emit(`capability:${capability}`, value);
        });
        return true;
      }
    } catch (e) { /* already registered */ }
    return false;
  }

  /**
   * ensureCapabilityListeners - Register safety listeners for all settable capabilities
   * Prevents "Missing Capability Listener: onoff" errors (FrankP IR remote)
   */
  async ensureCapabilityListeners() {
    const settable = ['onoff', 'dim', 'target_', 'thermostat_', 'windowcoverings_', 'volume_', 'button', 'locked'];
    for (const cap of this.getCapabilities()) {
      if (settable.some(s => cap.startsWith(s)) && !this._capabilityListeners?.[cap]) {
        try {
          this.registerCapabilityListener(cap, async (value) => {
            this.log(`[ENSURE-CAP] ${cap} = ${value} (safety)`);
            this.emit(`capability:${cap}`, value);
          });
        } catch (e) { /* already registered */ }
      }
    }
  }

  /**
   * retryIASEnrollment - Retry IAS Zone enrollment with multiple strategies
   * Fixes contact/water sensors stuck at alarm:no (blutch32, Lasse_K)
   */
  async retryIASEnrollment(maxRetries = 3) {
    const iasCluster = this.zclNode?.endpoints?.[1]?.clusters?.iasZone;
    if (!iasCluster) {return false;}

    for (let i = 1; i <= maxRetries; i++) {
      try {
        this.log(`[IAS-RETRY] Attempt ${i}/${maxRetries}`);
        // Strategy 1: Write CIE address
        try {
          await iasCluster.writeAttributes({ iasCieAddr: this.homey.zigbee?.address || '0x0000000000000000' });
        } catch (e) { this.log(`[IAS-RETRY] CIE write: ${e.message}`); }

        // Strategy 2: Send enroll response
        try {
          await iasCluster.enrollResponse({ enrollResponseCode: 0, zoneId: 1 });
          this.log('[IAS-RETRY] enrollResponse sent');
        } catch (e) { this.log(`[IAS-RETRY] enrollResponse: ${e.message}`); }

        // Strategy 3: Read zone status to verify
        await new Promise(r => this.homey.setTimeout(r, 2000));
        try {
          const status = await iasCluster.readAttributes(['zoneStatus', 'zoneState']);
          this.log(`[IAS-RETRY] zoneState=${status.zoneState}, zoneStatus=${status.zoneStatus}`);
          if (status.zoneState === 1) { this.log('[IAS-RETRY] ✅ Enrolled!'); return true; }
        } catch (e) { this.log(`[IAS-RETRY] read: ${e.message}`); }

        await new Promise(r => this.homey.setTimeout(r, 3000));
      } catch (err) {
        this.log(`[IAS-RETRY] Attempt ${i} error: ${err.message}`);
      }
    }
    this.log('[IAS-RETRY] ⚠️ Enrollment failed after retries');
    return false;
  }

  /**
   * smartDivisorDetect - Auto-detect correct divisor based on value range
   * Fixes humidity showing 9% instead of 90% (Peter_van_Werkhoven)
   */
  smartDivisorDetect(value, expectedRange = { min: 0, max: 100 }) {
    if (typeof value !== 'number' || value === 0) {return value;}
    const { min, max } = expectedRange;
    // If value/100 is in range, use ÷100
    if (value / 100 >= min && value / 100 <= max) {return value / 100;}
    // If value/10 is in range, use ÷10
    if (value / 10 >= min && value / 10 <= max) {return value / 10;}
    // If value already in range, return as-is
    if (value >= min && value <= max) {return value;}
    // If value*10 is in range, use ×10
    if (value * 10 >= min && value * 10 <= max) {return value * 10;}
    return value;
  }

  /**
   * safeAddCapability - Add capability only if missing, with error guard
   */
  async safeAddCapability(capability) {
    if (!this.hasCapability(capability)) {
      try {
        await this.addCapability(capability);
        this.log(`✅ [CAP] Added ${capability}`);
        return true;
      } catch (err) {
        this.log(`⚠️ [CAP] Cannot add ${capability}: ${err.message}`);
      }
    }
    return false;
  }

  /**
   * v5.13.1: TX tracking wrapper for outgoing commands
   */
  canSendCommand(commandType = 'command') {
    const result = trackTx(this.getData().id, commandType);
    if (!result.allowed) {
      this.log(`⚠️ [TX] Blocked: ${result.reason}`);
    }
    return result.allowed;
  }

  /**
   * v5.13.1: RX tracking for incoming reports
   */
  trackIncomingReport() {
    const deviceId = this.getData().id;
    const modelId = this.getSettings().zb_model_id || null;

    // L13: Record health check-in
    if (this.safeApp?.healthMonitor) {
      this.safeApp?.healthMonitor.recordCheckIn(deviceId, modelId);
    }

    // v9.1.0: Record successful communication for pairing retry logic
    this._recordPairingSuccess();

    const result = trackRx(deviceId);
    if (result.exceeded) {
      this.log(`⚠️ [RX] High traffic: ${result.count}/min`);
    }
    return result;
  }

  /**
   * v5.13.5: Override setCapabilityValue to enforce L14 SanityFilter globally
   */
  async setCapabilityValue(capability, value) {
    return this.safeSetCapabilityValue(capability, value);
  }

  /**
   * safeSetCapabilityValue - Set capability value with existence check and SanityFilter
   * v5.13.6: Integrated advanced telemetry logic (anti-flood, calibration, generic flows)
   */
  async safeSetCapabilityValue(capability, value) {
    try {
      // 1. Sanity Check - Block bizarre values (radar noise, sleepy jumps)
      if (this._blockBizarreValue(capability, value)) {return false;}

      // 2. Calibration - Apply offsets from settings
      const calibratedValue = this._applyCalibration(capability, value);

      // 3. Capability Guard - Add if missing
      if (!this.hasCapability(capability)) {
        await this.addCapability(capability).catch(() => {});
      }
      
      if (this.hasCapability(capability)) {
        const previousValue = this.getCapabilityValue(capability);
        const now = Date.now();
        
        // 4. Anti-Flood Throttling & Significant Change Detection
        if (!this._capUpdateTracker) {this._capUpdateTracker = {};}
        const tracker = this._capUpdateTracker[capability];

        // v5.13.6: authoritative throttle windows (ms)
        const THROTTLE = {
          'measure_battery': 300000, 'alarm_battery': 300000,
          'measure_temperature': 30000, 'measure_humidity': 30000,
          'measure_luminance': 10000, 'alarm_motion': 2000,
          'alarm_contact': 2000, 'onoff': 500, 'dim': 500
        };
        const throttleMs = THROTTLE[capability] || 5000;

        // v5.13.6: significant change thresholds (bypass throttle)
        const SIGNIFICANT = {
          'measure_battery': 2, 'measure_temperature': 0.3, 
          'measure_humidity': 2, 'measure_luminance': 50
        };
        const sigThreshold = SIGNIFICANT[capability];

        if (tracker) {
          const elapsed = now - tracker.time;
          const valueChanged = previousValue !== calibratedValue;
          const sigChange = sigThreshold && typeof calibratedValue === 'number' && typeof previousValue === 'number'
            ? Math.abs(calibratedValue - previousValue) >= sigThreshold : false;

          // Skip if: same value OR within throttle window without significant change
          // Exception: Boolean changes (alarms) ALWAYS bypass throttle if state changed
          const isBooleanChange = typeof calibratedValue === 'boolean' && valueChanged;
          if (!valueChanged) {return true;} // No change, skip
          if (elapsed < throttleMs && !sigChange && !isBooleanChange) {return true;} // Throttled
        }

        this._capUpdateTracker[capability] = { time: now, value: calibratedValue };

        // 5. L14: Apply SanityFilter (ROC/EMA)
        let filteredValue = calibratedValue;
        if (this.sanityFilter && typeof calibratedValue === 'number') {
          filteredValue = this.sanityFilter.filter(this.getData().id, capability, calibratedValue);
        }

        // 6. SDK3 Reporting
        await super.setCapabilityValue(capability, filteredValue);

        // 7. Generic Flow Triggers
        await this._triggerCustomFlowsIfNeeded(capability, filteredValue, previousValue);
        
        return true;
      }
    } catch (err) {
      this.log(`⚠️ [CAP] Set ${capability}=${value} failed: ${err.message}`);
    }
    return false;
  }

  /**
   * v5.13.6: Block bizarre values (radar noise floor, sleepy device battery artifacts)
   */
  _blockBizarreValue(capability, value) {
    if (typeof value !== 'number') {return false;}
    
    // Radar/Presence noise floor protection
    const driverId = this.driver.id;
    const isPresenceRadar = driverId.includes('presence') || driverId.includes('radar') || driverId.includes('mmwave');
    
    if (isPresenceRadar && (capability === 'measure_temperature' || capability === 'measure_humidity')) {
      this.log(`[SANITY] 🚫 Blocked ${capability} on radar device (ghost data)`);
      return true;
    }

    // Battery jump protection (0% artifact)
    if (capability === 'measure_battery') {
      const prev = this.getCapabilityValue('measure_battery');
      if (prev !== null && value === 0 && prev > 20) {
        this.log(`[SANITY] 🚫 Blocked battery 0% drop (sleep artifact)`);
        return true;
      }
    }

    // Extreme range protection
    if (capability === 'measure_temperature' && (value < -40 || value > 85)) {return true;}
    if (capability === 'measure_humidity' && (value < 0 || value > 100)) {return true;}

    return false;
  }

  /**
   * v5.13.6: Apply calibration offsets from settings
   */
  _applyCalibration(capability, value) {
    if (typeof value !== 'number') {return value;}
    const settings = this.getSettings();

    if (capability.includes('temperature')) {
      const offset = parseFloat(settings.temperature_calibration) || 0;
      return offset !== 0 ? Math.round((value + offset) * 10) / 10 : value;
    }
    if (capability.includes('humidity')) {
      const offset = parseFloat(settings.humidity_calibration) || 0;
      return offset !== 0 ? Math.round(value + offset) : value;
    }
    return value;
  }

  /**
   * v5.13.6: Generic Flow Triggering for standard capabilities
   */
  async _triggerCustomFlowsIfNeeded(capability, value, previousValue) {
    if (value === previousValue) {return;}

    try {
      const driverId = this.driver.id;
      let cardId = null;

      // Map standard capabilities to possible flow cards
      if (capability === 'alarm_motion' && value === true) {cardId = 'alarm_motion_true';}
      else if (capability === 'alarm_contact') {cardId = value ? 'contact_opened' : 'contact_closed';}
      else if (capability === 'alarm_smoke' && value === true) {cardId = 'smoke_detected';}
      else if (capability === 'alarm_water' && value === true) {cardId = 'water_leak_detected';}

      if (cardId) {
        this._diagLogger.verbose('Triggering custom flow', { capability, cardId, value, previousValue });
        // Try specific card first, then generic
        await this.triggerFlowCard(`${driverId}_${cardId}`).catch(() => {
          return this.triggerFlowCard(cardId);
        }).catch((e) => {
          this._diagLogger.verbose('Flow card not found (expected if not defined)', { cardId, error: e.message });
        });
      }

      // v9.2.0: Generic capability change trigger (Device Capabilities inspired)
      // This fires the capability_value_changed_generic flow card for ANY capability change
      try {
        const app = this.homey?.app;
        if (app?.featureFlowCards?.triggerCapabilityChanged) {
          const deviceId = this.getData?.()?.id || this.getId?.();
          app.featureFlowCards.triggerCapabilityChanged(deviceId, capability, value, previousValue);
        }
      } catch (_e) { /* non-critical */ }

    } catch (e) {
      this._diagLogger.operationFailed('_triggerCustomFlowsIfNeeded', e, { capability, value });
    }
  }

  /**
   * triggerFlowCard - Safe helper to trigger a device flow card using modern SDKv3 API
   * Follows strict SDK3 patterns for device-specific triggers.
   *
   * @param {string} cardId - Flow trigger card ID
   * @param {Object} [tokens={}] - Dynamic flow tokens
   * @param {Object} [state={}] - Flow card state
   * @returns {Promise<boolean>} - True if triggered successfully
   */
  async triggerFlowCard(cardId, tokens = {}, state = {}) {
    // v8.5.0: Guard against destroyed device
    if (this._destroyed) {
      this._diagLogger.verbose('Skipping flow trigger: device destroyed', { cardId });
      return false;
    }

    this._diagLogger.info('Triggering flow card', { cardId, tokens: Object.keys(tokens) });
    try {
      let card = null;
      const flow = this._safeHomey?.flow;

      // 1. Try modern SDKv3 getDeviceTriggerCard
      if (flow && typeof flow.getDeviceTriggerCard === 'function') {
        try {
          card = flow.getDeviceTriggerCard(cardId);
        } catch (e) {
          this._diagLogger.verbose('Card not found as device trigger', { cardId, error: e.message });
        }
      }

      // 2. Deprecated fallback removed in v7.5.31 to follow SDK3 strictly
      if (!card) {
          this._diagLogger.verbose('Card not found in driver or app', { cardId });
      }

      if (card && typeof card.trigger === 'function') {
        await card.trigger(this, tokens, state);
        this._diagLogger.verbose('Flow card triggered successfully', { cardId });
        return true;
      } else {
        this._diagLogger.warn('Flow card not found or trigger not a function', { cardId });
      }
    } catch (err) {
      this._diagLogger.operationFailed(`triggerFlowCard(${cardId})`, err, { tokens, state });
    }
    return false;
  }

  /**
   * v8.5.0: Safe setCapabilityValue with destruction guard
   * Prevents "Cannot access this.homey" crash after onDeleted/onUninit
   */
  async _safeSetCapability(capability, value) {
    if (this._destroyed) {
      this._diagLogger.verbose('Skipping setCapabilityValue: device destroyed', { capability, value });
      return this;
    }
    try {
      await this.setCapabilityValue(capability, value);
      this._diagLogger.capabilityChange(capability, value, undefined);
    } catch (err) {
      if (!this._destroyed) {
        this._diagLogger.operationFailed(`setCapabilityValue(${capability})`, err, { value });
      }
    }
    return this;
  }

  /**
   * v8.5.0: Cleanup method for onDeleted/onUninit
   * Call this at the START of onDeleted or onUninit in device classes
   */
  async _destroyDevice() {
    if (this._destroyed) return;
    this._destroyed = true;

    this._diagLogger.info('Device cleanup started');

    // Clear all listeners and timers
    this._antigravityIsolator.stats = { isolations: 0, lastIsolation: null };

    // Clean up any registered intervals/timeouts
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
      this._pollInterval = null;
    }
    if (this._appCommandTimeout) {
      clearTimeout(this._appCommandTimeout);
      this._appCommandTimeout = null;
    }
    if (this._metricsSyncInterval) {
      clearInterval(this._metricsSyncInterval);
      this._metricsSyncInterval = null;
    }

    // Clean up smart adaptation
    if (this.smartAdaptation && typeof this.smartAdaptation.destroy === 'function') {
      try {
        this.smartAdaptation.destroy();
      } catch (e) {
        this._diagLogger.warn('Error destroying smart adaptation', { error: e.message });
      }
    }

    // Export logs before cleanup if verbose logging was enabled
    if (this._isVerboseEnabled && this._diagLogger) {
      const logCount = this._diagLogger.getStats().total;
      if (logCount > 0) {
        this.log(`[DESTROY] Exporting ${logCount} diagnostic log entries`);
      }
    }

    this._diagLogger.info('Device cleanup completed');
    this.log('[DESTROY] Device resources cleaned up');
  }

  /**
   * Get diagnostic logger instance for use by subclasses
   * @returns {DiagnosticLogger}
   */
  get diagLogger() {
    return this._diagLogger;
  }

  /**
   * Export all diagnostic logs for this device
   * @returns {string}
   */
  exportDiagnosticLogs() {
    return this._diagLogger.exportLogs();
  }

  /**
   * Get diagnostic log statistics
   * @returns {Object}
   */
  getDiagnosticLogStats() {
    return this._diagLogger.getStats();
  }

}

module.exports = TuyaZigbeeDevice;

