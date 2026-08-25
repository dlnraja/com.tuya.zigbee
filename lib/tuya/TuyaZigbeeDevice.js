'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { safeSetTimeout, safeClearTimeout, isDestroyed } = require('../utils/safe-timers');
const DiagnosticLogsCollector = require('../diagnostics/DiagnosticLogsCollector');
const DiagnosticLogger = require('../diagnostics/DiagnosticLogger');
const { trackTx, trackRx } = require('../utils/UniversalThrottleManager');
const CapabilityMapCache = require('../utils/CapabilityMapCache');
const DeviceTelemetryEstimator = require('../utils/DeviceTelemetryEstimator');
const RawFrameDeduplicator = require('../zigbee/RawFrameDeduplicator');
const { assertZCLNode, assertClusterSpecification } = require('../util');
const EnergyJumpGuard = require('./EnergyJumpGuard');
const { installDeviceIO, shouldSkipIasOnlyEf00Tx } = require('../io/DeviceIOFacade');
const EventDeduplicationLayer = require('../filter/EventDeduplicationLayer');

/**
 * TuyaZigbeeDevice - Base class for all Tuya Zigbee devices
 * Provides common functionality for Tuya devices
 * NOW WITH:
 * - 🤖 INTELLIGENT DRIVER ADAPTATION
 * - 📊 COMPREHENSIVE DIAGNOSTIC LOGS
 * - 🔌 P102 DeviceIOFacade (this.io) — unified DP/ZCL/raw/IAS I/O
 *
 * Phase 2–4 fusion (hooks on this.io): fuseBattery, fuseButton, fuseSos, fuseScene
 * — BatteryRouter/UnifiedBatteryHandler, Physical/VirtualButtonMixin, IAS ACE/Zone, MultistateInput.
 */

// Apply DiagnosticLogsCollector mixin to ZigBeeDevice
const ZigBeeDeviceWithDiagnostics = DiagnosticLogsCollector(ZigBeeDevice);

// Universal Button Management Elevation (v7.1.0)
const PhysicalButtonMixin = require('../mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../mixins/VirtualButtonMixin');
const { registerNamedButtonFallbacks } = require('../mixins/NamedButtonFallback');
const { createNetworkBreaker } = require('../utils/NetworkResilience');

let _enigmaReportBreaker;
function getEnigmaReportBreaker() {
  if (!_enigmaReportBreaker) {
    _enigmaReportBreaker = createNetworkBreaker('EnigmaIssueReport', {
      failureThreshold: 3,
      resetTimeout: 120000,
    });
  }
  return _enigmaReportBreaker;
}

class TuyaZigbeeDevice extends PhysicalButtonMixin(VirtualButtonMixin(ZigBeeDeviceWithDiagnostics)) {

  constructor(...args) {
    super(...args);

    // 🛡️ DESTRUCTION GUARD (v8.5.0) - Prevents "Cannot access this.homey" crashes
    this._destroyed = false;

    // 🛡️ Bound log/error helpers — NEVER assign to this.error/this.log.
    // Homey SDK3 marks them read-only; assignment throws
    // "Cannot assign to read only property 'error'" and kills device init
    // (Gmail crashes: ContactSensor / SosEmergency / WaterLeak / SoilSensor).
    // Use this._boundError / this._boundLog for .catch(...) callbacks so
    // unbound this never yields "reading '_destroyed'".
    try {
      this._boundError = typeof this.error === 'function'
        ? this.error.bind(this)
        : (...args) => { try { console.error(...args); } catch (_e) { /* noop */ } };
      this._boundLog = typeof this.log === 'function'
        ? this.log.bind(this)
        : (...args) => { try { console.log(...args); } catch (_e) { /* noop */ } };
    } catch (_e) {
      this._boundError = (...args) => { try { console.error(...args); } catch (__e) { /* noop */ } };
      this._boundLog = (...args) => { try { console.log(...args); } catch (__e) { /* noop */ } };
    }

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

    // 🔌 P102 Phase 1: Device I/O façade (safe methods; managers attach in onNodeInit)
    try {
      installDeviceIO(this);
    } catch (_e) {
      this.io = this.io || null;
    }
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
    try { if (!this.homey || this.homey.isDestroyed || this._destroyed) {return null;} return this.homey.app; } catch(e) { return null; }
  }

  /** 
   * 🛡️ Safe homey accessor - prevents "Cannot access this.homey" crash (v8.5.0)
   */
  get _safeHomey() {
    if (this._destroyed) {return null;}
    try { return this.homey; } catch(e) { return null; }
  }

  /**
   * 🔌 P102: Install/attach DeviceIOFacade + single protocol pick.
   * Safe for bases that skip super.onNodeInit (UnifiedSwitch/Sensor/…).
   * Never throws.
   */
  async _initDeviceIO(zclNode) {
    try {
      if (!this.io) {installDeviceIO(this);}
      this.io.attach(zclNode || this.zclNode);
      await this.io.pickProtocol(zclNode || this.zclNode).catch((err) => {
        this.log(`[IO] ⚠️ pickProtocol failed: ${err?.message || err}`);
      });
      return this.io;
    } catch (err) {
      this.log(`[IO] ⚠️ _initDeviceIO failed (non-fatal): ${err?.message || err}`);
      return this.io || null;
    }
  }

  /**
   * P102 Phase 2: deferred interview compensation (magic / EF00 / IAS / MCU / poll).
   * Never blocks pairing; never throws.
   */
  async _runIoInterviewCompensation(opts = {}) {
    try {
      if (!this.io || typeof this.io.runInterviewCompensation !== 'function') {return null;}
      return await this.io.runInterviewCompensation(opts);
    } catch (err) {
      this.log(`[IO] ⚠️ interview compensation failed: ${err?.message || err}`);
      return null;
    }
  }

  /**
   * P203 — If this device is known (sacred couple) to belong on another driver,
   * surface a clear Homey unavailable message so users re-pair instead of running
   * wrong-class logic forever (wall dimmer ↔ climate_sensor, etc.).
   */
  async _warnIfMisattributedDriver() {
    let registry;
    try {
      registry = require('../pairing/UserMisattributionRegistry');
    } catch {
      return;
    }
    const { getManufacturer, getModelId } = require('../helpers/DeviceDataHelper');
    const mfr = getManufacturer(this) || this.getSetting?.('zb_manufacturer_name') || this.getStoreValue?.('manufacturerName');
    const pid = getModelId(this) || this.getSetting?.('zb_model_id') || this.getStoreValue?.('modelId');
    const driverId = this.driver?.id;
    if (!mfr || !driverId) {return;}
    const forbidden = registry.isForbiddenDriver(mfr, pid, driverId)
      || registry.isForbiddenPlacement(mfr, driverId);
    if (!forbidden) {return;}
    const c = registry.lookup(mfr, pid) || registry.lookup(mfr, null);
    const target = c?.canonicalDriver || 'the correct driver';
    const msg = `Wrong driver (${driverId}). Remove device and re-add — expect ${target}.`;
    this.error(`[MISATTR] ${mfr}+${pid || '?'} → ${msg}`);
    try {
      await this.setWarning?.(msg);
    } catch { /* optional */ }
    try {
      await this.setUnavailable?.(msg);
    } catch { /* optional */ }
  }

  // ─── Intelligent Driver Hot-Swap API (Strategy 1–4) ─────────────────────

  /**
   * Add a capability at runtime via the IntelligentDriverHotSwap engine.
   * Safe: only adds standard Homey caps above confidence threshold.
   * Persisted in device store — survives restarts.
   *
   * @param {string} capabilityId
   * @param {number} confidence - 0.0 to 1.0 (default 1.0)
   * @param {object} [opts] - optional setCapabilityOptions
   */
  async hotSwapCapability(capabilityId, confidence = 1.0, opts = null) {
    if (this.hotSwap) {
      return this.hotSwap.hotSwapAddCapability(capabilityId, confidence, opts);
    }
    // Fallback: direct SDK3 call (no confidence guard)
    if (!this.hasCapability(capabilityId)) {
      return this.addCapability(capabilityId).catch(err =>
        this.log?.(`[HOT-SWAP] fallback addCapability(${capabilityId}) failed: ${err.message}`)
      );
    }
  }

  /**
   * Apply an alternative driver DP profile at runtime (Strategy 4).
   * Merges the target driver's dpMappings and capabilities into this device.
   *
   * @param {string} targetDriverId - e.g. 'soil_sensor', 'presence_sensor_radar'
   * @param {number} confidence - 0.0 to 1.0
   */
  async hotSwapProfile(targetDriverId, confidence = 0.9) {
    if (this.hotSwap) {
      return this.hotSwap.applyDriverProfile(targetDriverId, confidence);
    }
    this.log?.(`[HOT-SWAP] hotSwapProfile called but hotSwap not initialized — call after onNodeInit`);
  }

  /**
   * Get current hot-swap status for diagnostics / settings display.
   */
  getHotSwapStatus() {
    return this.hotSwap?.getStatus?.() || { unavailable: true };
  }

  async onNodeInit({ zclNode } = {}) {
    // Assert zclNode is valid
    if (zclNode) {
      assertZCLNode(zclNode);
      this.zclNode = zclNode;
    }
    this.log('TuyaZigbeeDevice initialized');

    // P203: runtime misattribution guard (Gmail diag f20dc4f0 — wall dimmer stuck on climate_sensor)
    await this._warnIfMisattributedDriver().catch(() => {});

    // P2218: soft-realign incomplete mfr/pid — heuristic only, never invent sacred lock
    try {
      const { realignIncompleteIdentity } = require('../helpers/UnknownCaseRealigner');
      realignIncompleteIdentity(this);
    } catch (_e) { /* optional */ }

    // P2222: fleet-wide Homey-gap compensations (battery normalize, IAS, bidir, unknowns)
    try {
      const { ensureDeviceCompensations } = require('../resilience/HomeyGapCompensator');
      ensureDeviceCompensations(this);
    } catch (_e) { /* optional */ }

    // 🔌 P102: ensure I/O façade + single protocol pick (bases consume protocol + channels)
    await this._initDeviceIO(zclNode || this.zclNode);

    // Enable debug logging if needed
    this.enableDebug();

    // Print cluster information
    this.printNode();

    // 🤖 RUN INTELLIGENT DRIVER ADAPTATION
    await this.runIntelligentAdaptation().catch(err => this.error(`[INIT] ⚠️ runIntelligentAdaptation failed:`, err?.message || err));

    // 🔋 SMART BATTERY & ENERGY DETECTION
    await this.initSmartManagers().catch(err => this.error(`[INIT] ⚠️ initSmartManagers failed:`, err?.message || err));

    this.telemetryEstimator = DeviceTelemetryEstimator.attach(this);
    if (typeof this.telemetryEstimator?.refresh === 'function') {
      await Promise.resolve(this.telemetryEstimator.refresh('tuya-node-init'))
        .catch(err => this.log(`[TELEMETRY] init refresh failed: ${err.message}`));
    }

    // 🌐 v5.12.2: UNIVERSAL BRIDGE - connects ALL DPs/clusters to flow cards
    await this.initUniversalBridge().catch(err => this.error(`[INIT] ⚠️ initUniversalBridge failed:`, err?.message || err));

    // 🧩 P206: soft-attach proprietary protocol layers (optimizer / router / EF00 time)
    // Unified* bases often wire these themselves; bare lineages (lights/IR/DIY/TSC) need them here.
    try {
      const { bootstrapUniversalLayers } = require('../layers/UniversalLayerBootstrap');
      await bootstrapUniversalLayers(this, zclNode || this.zclNode);
    } catch (err) {
      this.log(`[LAYERS] ⚠️ bootstrap skipped: ${err?.message || err}`);
    }

    // 🔘 v7.1.0: UNIVERSAL BUTTON ARCHITECTURE
    // Automatically attempts to initialize physical/virtual button layers for ALL devices.
    // The mixins are designed to degrade gracefully if the device lacks button capabilities.
    if (typeof this.initPhysicalButtonDetection === 'function') {
      await this.initPhysicalButtonDetection(zclNode).catch(err => this.log(`[BUTTON-INIT] ⚠️ Physical error: ${err.message}`));
    }
    if (typeof this.initVirtualButtons === 'function') {
      await this.initVirtualButtons().catch(err => this.log(`[BUTTON-INIT] ⚠️ Virtual error: ${err.message}`));
    }

    // 🔘 v9.0.410 (P92.114): UNIVERSAL button.N UI listeners
    // ~270 drivers declare button.N capabilities (pressable in the Homey UI)
    // but only 2 bases ever registered listeners — every UI press logged
    // "Missing Capability Listener: Button N" and did nothing. Register them
    // centrally: press → toggle the matching gang when possible, else log.
    // Promise.resolve: sync overrides (or undefined return) must not throw "reading 'catch'".
    await Promise.resolve(this._registerButtonCapabilityListeners()).catch(err => this.log(`[BUTTON-INIT] ⚠️ UI listeners error: ${err.message}`));

    // 🛡️ v5.13.0: UNIVERSAL TX/RX FALLBACK HANDLER
    this._setupRawFrameFallback();

    // v9.0.40: Defer heavy initialization to avoid blocking device startup
    // This improves device responsiveness during initialization
    // v10.6.0: jitter 1-11s — at boot with ~50 devices, the identical 1000ms
    // deferral fired all binds/queries in the same second (ZDO storm).
    safeSetTimeout(this, async () => {
      if (this._destroyed) {return;}
      try {
        // 🔌 P102 Phase 2: magic / EF00 / IAS / MCU / reporting poll
        await this._runIoInterviewCompensation({
          pollFallback: true,
          mcu: true,
        }).catch(err => this.log(`[IO] ⚠️ interview compensation: ${err?.message || err}`));

        // 🔗 v5.8.18: SCAN AND BIND UNKNOWN CLUSTERS
        await this.scanUnknownClusters().catch(err => this.error(`[INIT] ⚠️ scanUnknownClusters failed:`, err?.message || err));

        // 📡 v7.3: ENFORCE CLUSTER BINDINGS (ADVERTISEMENT MODE)
        await this.enforceClusterBindings().catch(err => this.error(`[INIT] ⚠️ enforceClusterBindings failed:`, err?.message || err));

        // L3: Send query_all to wake up TS0601 devices (Enchant pattern)
        if ((this._protocolInfo?.isTuyaDP || this._protocolInfo?.protocol === 'HYBRID')
          && !shouldSkipIasOnlyEf00Tx(this)) {
          if (this.io?.queryAllDPs) {
            await this.io.queryAllDPs();
          } else if (this.tuyaEF00Manager?.queryAllDatapoints) {
            await this.tuyaEF00Manager.queryAllDatapoints();
          } else if (this.tuyaEF00Manager?.requestAllDPs) {
            await this.tuyaEF00Manager.requestAllDPs();
          }
        }

        // P102 Phase 4: exotic profile hooks (E00x read, IR subscribe) — opt-in via store/settings
        if (this.getStoreValue?.('io_exotic_hooks') || this.getSetting?.('io_exotic_hooks')) {
          await this.io?.subscribeIrBinder?.().catch(() => {});
          await this.io?.writeE00x?.('switchMode', this.getSetting?.('switch_mode_external') ?? undefined).catch(() => {});
        }
      } catch (err) {
        this.error('[DEFERRED-INIT] Error:', err?.message || err);
      }
    }, 1000 + Math.floor(Math.random() * 10000));

    // v9.0.40: Warm up capability map cache after full initialization
    CapabilityMapCache.warmup(this);
  }

  /**
   * Low-level control write: ZCL named → raw numeric → Tuya DP.
   * On UNSUPPORTED_CLUSTER, cascades without surfacing a Homey red banner
   * when a parallel protocol succeeds (CapabilityCommandRouter).
   */
  async writeCapabilitySmart(capability, value, opts = {}) {
    const { writeCapabilityWithFallbacks } = require('../zigbee/CapabilityCommandRouter');
    return writeCapabilityWithFallbacks(this, capability, value, {
      parallelDiscover: true,
      ...opts,
    });
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

    // L0: Exact-payload duplicate filtering. Never dedupe by a short prefix:
    // Tuya MCU devices often resend a full state map where only a later DP changed.
    if (!this._rawFrameDeduplicator) {
      this._rawFrameDeduplicator = new RawFrameDeduplicator({
        defaultWindowMs: 500,
        tuyaWindowMs: 750,
        maxCacheSize: 500,
      });
    }

    this._diagLogger.info('Setting up Universal Raw Frame Fallback v5.13.2');
    const originalHandleFrame = this.node.handleFrame;

    this.node.handleFrame = (endpointId, clusterId, frame, meta) => {
      // v9.0.401 (P92.104): mark availability on every incoming frame.
      // Cheap, non-blocking, guarded — the manager is created in app.js.
      try {
        const availMgr = this.homey.app && this.homey.app.availabilityManager;
        if (availMgr) {
          const devId = (typeof this.getData === 'function' && this.getData() && this.getData().id) || this.id;
          if (devId) { availMgr.markSeen(devId); }
        }
      } catch (_e) { /* non-critical */ }

      const duplicate = this._rawFrameDeduplicator.shouldSuppress(endpointId, clusterId, frame, meta);
      if (duplicate.suppress) {
        this.trackIncomingReport();
        if (!this._rawFrameDuplicateCount) {this._rawFrameDuplicateCount = 0;}
        this._rawFrameDuplicateCount += 1;
        if (this._rawFrameDuplicateCount <= 5 || this._rawFrameDuplicateCount % 100 === 0) {
          this.log(`[L0] Suppressed exact duplicate raw frame #${this._rawFrameDuplicateCount}: EP${endpointId} cluster=0x${Number(clusterId).toString(16).padStart(4, '0')} age=${duplicate.age}ms`);
        }
        return;
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
      // v10.8.0: RX flood SHEDDING (z2m BHT-006 / TS0601 200-msg-min lessons).
      // When a device floods (> rxPerMinute), we shed NON-safety processing
      // for the rest of the window instead of just logging — the flood
      // otherwise burns CPU and spams flow triggers. Safety-critical IAS
      // clusters (0x0500/0x0501: SOS, tamper, motion alarms) are NEVER shed.
      const rxResult = this.trackIncomingReport();
      // P208: inventaire RX path (DP / ZCL / bound / IAS / raw) for cross-layer stats
      try {
        this.protocolRxTx?.noteRx?.(clusterId, { endpointId });
      } catch (_e) { /* soft */ }
      if (rxResult.exceeded && clusterId !== 0x0500 && clusterId !== 0x0501) {
        if (!this._rxShedLogCount) {this._rxShedLogCount = 0;}
        this._rxShedLogCount++;
        if (this._rxShedLogCount <= 3 || this._rxShedLogCount % 60 === 0) {
          this.log(`⚠️ [RX-SHED] Flood protection: shedding frame (${rxResult.count}/min, cluster 0x${Number(clusterId).toString(16)})`);
        }
        // v10.9.0: user-facing flood alert — once per device per day. A
        // flooding device is a firmware-level problem the user should know
        // about (z2m #17833 class), not just a log line.
        const lastAlert = this.getStoreValue?.('last_flood_alert_at') || 0;
        if (Date.now() - lastAlert > 86400000) {
          // v10.17.1 FIX: handleFrame is NOT async — fire-and-forget instead
          // of await (CI syntax check caught the invalid await).
          Promise.resolve(this.setStoreValue?.('last_flood_alert_at', Date.now())).catch(() => {});
          this.homey.notifications.createNotification({
            excerpt: `⚠️ ${this.getName()} is flooding the Zigbee network (${rxResult.count} msg/min) — known Tuya firmware bug class. Reports are being rate-limited automatically.`
          }).catch(() => {});
        }
        return;
      }

      // If handled by specific driver, do not pass to SDK
      if (handled) {return;}

      // 4. Fallback to default Homey SDK native routing
      // v9.0.79: Track unhandled frames for debugging "device pairs but no data"
      if (typeof originalHandleFrame === 'function') {
        const result = originalHandleFrame.call(this.node, endpointId, clusterId, frame, meta);
        // Log unhandled frames periodically (not every frame to avoid spam)
        if (!this._unhandledFrameCount) {this._unhandledFrameCount = 0;}
        this._unhandledFrameCount++;
        if (this._unhandledFrameCount <= 5 || this._unhandledFrameCount % 100 === 0) {
          this.log(`[L0] ⚠️ Unhandled frame #${this._unhandledFrameCount}: EP${endpointId} cluster=0x${clusterId.toString(16).padStart(4,'0')} cmd=${frame?.cmdId || '?'}`);
        }
        return result;
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

    try {
      const avail = this.homey?.app?.availabilityManager;
      if (avail && typeof avail.noteBootDump === 'function') {
        avail.noteBootDump(this);
      }
    } catch (_e) { /* optional */ }

    // Reset rejoin counter on successful rejoin
    this._pairingRetryState.rejoinAttempts = 0;
    this._pairingRetryState.lastSuccess = Date.now();

    // v10.6.0: re-send the Tuya "magic packet" on rejoin — Tuya chips LOSE
    // their enchanted state after a power cut (documented cross-platform:
    // z2m configureMagicPacket must be re-applied when the device comes back,
    // otherwise it silently stops reporting). One-shot genBasic read,
    // best-effort, cheap.
    safeSetTimeout(this, async () => {
      if (this._destroyed) {return;}
      try {
        const basic = this.zclNode?.endpoints?.[1]?.clusters?.basic;
        if (basic && typeof basic.readAttributes === 'function') {
          await basic.readAttributes([
            'manufacturerName', 'zclVersion', 'appVersion',
            'modelId', 'powerSource', 0xfffe
          ]).then(() => this.log('[PAIRING] ✨ Magic packet re-sent after announce')).catch(() => {});
        }
      } catch { /* best-effort */ }
    }, 500);

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
    if ((this._protocolInfo?.isTuyaDP || this._protocolInfo?.protocol === 'HYBRID')
      && !shouldSkipIasOnlyEf00Tx(this)) {
      safeSetTimeout(this, async () => { if (this._destroyed) {return;} try {
          if (this.io?.queryAllDPs) {
            await this.io.queryAllDPs();
          } else if (this.tuyaEF00Manager?.queryAllDatapoints) {
            await this.tuyaEF00Manager.queryAllDatapoints();
          } else if (this.tuyaEF00Manager?.requestAllDPs) {
            await this.tuyaEF00Manager.requestAllDPs();
          }
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
    if (!this.zclNode?.endpoints) {return;}

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
    if (this._destroyed) {return;}

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
    // v10.6.0: add ±25% jitter — without it, several offline devices retry
    // in perfect lockstep and congest the radio at the same instant.
    const backoffMs = Math.round(Math.min(
      state.backoffBaseMs * Math.pow(2, state.consecutiveFailures - 1),
      state.backoffMaxMs
    ) * (0.75 + Math.random() * 0.5));

    this.log(`[PAIRING] Scheduling reconnection attempt in ${backoffMs}ms`);

    safeSetTimeout(this, async () => {
      if (this._destroyed) {return;}
      await this._attemptReconnection();
    }, backoffMs);
  }

  /**
   * Attempt to reconnect to device
   */
  async _attemptReconnection() {
    if (this._destroyed) {return;}

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
        await new Promise(resolve => safeSetTimeout(this, resolve, 5000));
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
        safeSetTimeout(this, () => { if (this._destroyed) {return;} this._attemptReconnection(); }, backoffMs);
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
   * P102: prefers this.io.scanUnknownClusters when façade is installed.
   */
  async scanUnknownClusters() {
    try {
      await this.waitForZclNode(5000);
      if (this.io?.scanUnknownClusters) {
        const bound = await this.io.scanUnknownClusters(this.zclNode);
        if (bound.length > 0) {
          this.log(`🔗 [UNKNOWN] Bound ${bound.length} dynamic clusters:`, bound.map(b => `0x${b.cid.toString(16)}`).join(', '));
        }
        return bound;
      }
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
      if (!this.zclNode?.endpoints) {return;}

      const TARGET_CLUSTERS = [
        0xEF00, 'tuya', 'manuSpecificTuya', // Tuya DP
        0x0500, 'iasZone',                  // Sensors
        0x0006, 'onOff', 'genOnOff',        // Switches
        0x0008, 'levelControl',             // Dimmers
        0x0B04, 'haElectricalMeasurement',  // Energy
        0x0702, 'seMetering'                // Energy
      ];

      for (const [epId, endpoint] of Object.entries(this.zclNode.endpoints)) {
        if (!endpoint?.clusters) {continue;}
        
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
      await new Promise(resolve => safeSetTimeout(this, resolve, 500));
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
    // v10.9.0: TUYA REVIVE — one-tap recovery for unresponsive devices
    if ((action && action.id === 'tuya_revive') || action === 'tuya_revive') {
      return await this._tuyaReviveRoutine();
    }
    // v10.13.0 (P92.78): ENIGMA REPORT — opt-in, user-triggered only.
    // Generates a ready-to-paste GitHub issue for unknown/unsupported
    // device data. NO automatic telemetry: nothing ever leaves the device
    // unless the USER explicitly runs this action and pastes the report.
    if ((action && action.id === 'generate_issue_report') || action === 'generate_issue_report') {
      return await this._generateIssueReport();
    }
  }

  /**
   * v10.13.0 (P92.78): compile everything a maintainer needs to support an
   * unknown/misbehaving device — interview data + unknown DP summary —
   * into a ready-to-paste GitHub issue markdown. Opt-in by design.
   */
  async _generateIssueReport() {
    const mfr = this.getSetting?.('zb_manufacturer_name') || 'unknown';
    const mdl = this.getSetting?.('zb_model_id') || 'unknown';
    const driverId = this.driver?.id || 'unknown';
    const appVersion = this.homey.app?.manifest?.version || '?';

    // Unknown DPs collected by UnknownDPLogger from the store
    const unknownDps = [];
    try {
      const keys = this.getStoreKeys?.() || [];
      for (const k of keys) {
        if (!k.startsWith('_unknown_dp_')) {continue;}
        const e = this.getStoreValue?.(k);
        if (e) {unknownDps.push(`| DP${k.slice(12)} | ${e.t || '?'} | ${JSON.stringify(e.v)} | ${e.c || 1}x |`);}
      }
    } catch { /* store keys unavailable */ }

    // Interview data from zclNode (best-effort)
    let interview = '(available in Homey Developer Tools → Zigbee → device interview)';
    try {
      const eps = this.zclNode?.endpoints || {};
      const lines = [];
      for (const [epId, ep] of Object.entries(eps)) {
        const clusters = Object.keys(ep.clusters || {}).join(', ');
        lines.push(`EP${epId}: clusters [${clusters}]`);
      }
      if (lines.length) {interview = lines.join('\n');}
    } catch { /* no node */ }

    const md = [
      `## Device Support Request (auto-generated, user-triggered)`,
      ``,
      `**manufacturerName**: \`${mfr}\``,
      `**modelId**: \`${mdl}\``,
      `**Paired with driver**: \`${driverId}\` (app v${appVersion})`,
      ``,
      `### Endpoints / clusters`,
      '```',
      interview,
      '```',
      ``,
      unknownDps.length
        ? `### Unknown DPs observed\n| DP | Type | Last value | Count |\n|---|---|---|---|\n${unknownDps.join('\n')}`
        : `### Unknown DPs observed\n(none recorded)`,
      ``,
      `### What doesn't work`,
      `(describe here)`,
      ``,
      `### Diagnostics`,
      `(optional: Homey app diagnostics report ID)`
    ].join('\n');

    await Promise.resolve(this.setStoreValue?.('last_issue_report_md', md)).catch(() => {});
    this.log('[ENIGMA] 📋 Rapport GitHub prêt à copier (store: last_issue_report_md)');
    this.log('\n' + md);

    // v10.15.0 (P92.83): OPTIONAL proxy channel — only when the USER has
    // explicitly configured `issue_report_endpoint` in the app settings
    // (default: empty = zero network egress, local-only as before).
    const endpoint = this.homey.app?.homey?.settings?.get?.('issue_report_endpoint')
      || this.homey.settings?.get?.('issue_report_endpoint');
    let posted = null;
    if (endpoint && /^https:\/\/[\w.-]+\.workers\.dev\/?$/.test(endpoint)) {
      try {
        const https = require('https');
        const body = JSON.stringify({
          mfr, model: mdl, driver: driverId,
          appVersion,
          logs: unknownDps.slice(0, 10)
        });
        const breaker = getEnigmaReportBreaker();
        if (!breaker.isAvailable) {
          this.log('[ENIGMA] proxy skip — circuit breaker open');
        } else {
          posted = await breaker.exec(() => new Promise((resolve) => {
            const url = new URL(endpoint.replace(/\/$/, '') + '/report');
            const MAX_RESPONSE = 65536;
            const req = https.request(url, {
              method: 'POST',
              headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) },
              timeout: 10000
            }, (res) => {
              let data = '';
              let received = 0;
              res.on('data', (c) => {
                received += c.length;
                if (received <= MAX_RESPONSE) data += c;
              });
              res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch { resolve(null); }
              });
            });
            req.on('error', () => resolve(null));
            req.on('timeout', () => { req.destroy(); resolve(null); });
            req.write(body);
            req.end();
          }));
        }
        if (posted?.ok) {
          this.log(`[ENIGMA] 📤 Rapport envoyé via proxy → issue #${posted.issue}`);
        }
      } catch (err) {
        this.log(`[ENIGMA] envoi proxy impossible (${err.message}) — rapport local conservé`);
      }
    }

    await this.homey.notifications.createNotification({
      excerpt: posted?.ok
        ? `${this.getName()}: rapport envoyé automatiquement (issue #${posted.issue}).`
        : `${this.getName()}: rapport de support généré — copiez-le depuis les logs de l'app (section [ENIGMA]) et collez-le dans une issue GitHub dlnraja/com.tuya.zigbee.`
    }).catch(() => {});
    return { success: true, report: md, posted: posted?.ok ? posted.issue : null };
  }

  /**
   * v10.9.0: Tuya Revive — full recovery sequence for devices that stopped
   * responding: magic packet (re-enchant after power loss), cluster re-bind,
   * DP re-query, scene-mode re-apply, battery read. Each step best-effort.
   */
  async _tuyaReviveRoutine() {
    this.log('🔧 [REVIVE] Tuya Revive initiated from Device View');
    const steps = [];
    const run = async (name, fn) => {
      try {
        await fn();
        steps.push(`✅ ${name}`);
        this.log(`[REVIVE] ✅ ${name}`);
      } catch (err) {
        steps.push(`⚠️ ${name}: ${err.message}`);
        this.log(`[REVIVE] ⚠️ ${name}: ${err.message}`);
      }
    };

    await run('Magic packet (re-enchant)', async () => {
      const basic = this.zclNode?.endpoints?.[1]?.clusters?.basic;
      if (!basic?.readAttributes) {throw new Error('no basic cluster');}
      await basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
    });
    await run('Cluster re-bind', async () => {
      await this.enforceClusterBindings();
    });
    await run('DP re-query', async () => {
      if ((this._protocolInfo?.isTuyaDP || this._protocolInfo?.protocol === 'HYBRID')
        && !shouldSkipIasOnlyEf00Tx(this)) {
        if (this.io?.queryAllDPs) {
          await this.io.queryAllDPs();
        } else if (this.tuyaEF00Manager?.queryAllDatapoints) {
          await this.tuyaEF00Manager.queryAllDatapoints();
        } else if (this.tuyaEF00Manager?.requestAllDPs) {
          await this.tuyaEF00Manager.requestAllDPs();
        }
      }
    });
    await run('Scene mode re-apply', async () => {
      if (typeof this._universalSceneModeSwitch === 'function') {
        await this._universalSceneModeSwitch();
      }
    });
    await run('Battery read', async () => {
      const power = this.zclNode?.endpoints?.[1]?.clusters?.genPowerCfg || this.zclNode?.endpoints?.[1]?.clusters?.powerConfiguration;
      if (power?.readAttributes) {
        const attrs = await power.readAttributes(['batteryPercentageRemaining', 'batteryVoltage']).catch(() => null);
        if (attrs) {this.log('[REVIVE] battery attrs:', JSON.stringify(attrs));}
      }
    });

    const succeeded = steps.filter(s => s.startsWith('✅')).length;
    const summary = `Tuya Revive: ${succeeded}/5 steps OK`;
    this.log(`🔧 [REVIVE] ${summary} — ${steps.join(' | ')}`);
    await this.homey.notifications.createNotification({
      excerpt: `${this.getName()}: ${summary}`
    }).catch(() => {});
    return { success: succeeded > 0, steps };
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

    // P2218: unknown / imprecise DP — soft realign (log + store), never guess TX
    if (!handled) {
      try {
        const { realignUnknownDp } = require('../helpers/UnknownCaseRealigner');
        realignUnknownDp(this, dpId, value, typeof value);
      } catch (_e) { /* optional enrichment helper */ }
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
    this.telemetryEstimator?.destroy?.();
    try { this.smartEnergy?.destroy?.(); } catch (_e) { /* noop */ }
    try { this._eventDedup?.destroy?.(); } catch (_e) { /* noop */ }
    this._eventDedup = null;
    // v9.0.40: Release capability map cache on device deletion
    CapabilityMapCache.invalidate(this);
    await this._destroyDevice();
    // v9.0.349: Call parent onDeleted so ZigBeeDevice removes node/zclNode
    // listeners — otherwise late frames hit a disposed device and Homey core
    // crashes with "Cannot read properties of null (reading '_onDeleted')"
    if (super.onDeleted) {
      await super.onDeleted();
    }
  }

  /**
   * onUninit is called when the device is being uninitialized
   */
  async onUninit() {
    this.log('TuyaZigbeeDevice has been uninitialized');
    this._destroyed = true;
    this.telemetryEstimator?.destroy?.();
    try { this.smartEnergy?.destroy?.(); } catch (_e) { /* noop */ }
    try { this._eventDedup?.destroy?.(); } catch (_e) { /* noop */ }
    this._eventDedup = null;
    CapabilityMapCache.invalidate(this);
    // App restart/update uses onUninit, not onDeleted — timers and frame
    // hooks must tear down here or plugs stay stuck unavailable.
    await this._destroyDevice();
    if (this._appCommandTimeout) {
      clearTimeout(this._appCommandTimeout);
    }
    if (this._deviceTimeout) {
      clearTimeout(this._deviceTimeout);
    }
    if (this._timeSyncInterval) {
      this.homey.clearInterval(this._timeSyncInterval);
    }
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
        reportParser: value => this._parseZclScaledValue(value),
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
        reportParser: value => this._parseZclScaledValue(value),
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
   * v9.0.366: coordinator IEEE via IEEEAdvancedEnrollment (NEVER write the
   * zero address — a zeroed IAS_CIE_Address actively breaks enrollment),
   * early-exit when already enrolled.
   */
  async retryIASEnrollment(maxRetries = 3) {
    const iasCluster = this.zclNode?.endpoints?.[1]?.clusters?.iasZone;
    if (!iasCluster) {return false;}

    // Early exit: nothing to do if already enrolled
    try {
      const st = await iasCluster.readAttributes(['zoneState']).catch(() => null);
      if (st && (st.zoneState === 'enrolled' || st.zoneState === 1)) {
        this.log('[IAS-RETRY] Already enrolled');
        return true;
      }
    } catch { /* read failed, continue with strategies */ }

    // Coordinator IEEE (no fake/zero fallback)
    let cie = null;
    let sleepyMisses = 0;
    try {
      const IEEEAdvancedEnrollment = require('../managers/IEEEAdvancedEnrollment');
      cie = await new IEEEAdvancedEnrollment(this).getCoordinatorIeeeAddress();
    } catch (e) { this.log(`[IAS-RETRY] coordinator IEEE: ${e.message}`); }

    for (let i = 1; i <= maxRetries; i++) {
      try {
        if (this._destroyed) {return false;}
        this.log(`[IAS-RETRY] Attempt ${i}/${maxRetries}`);
        // Strategy 1: Write CIE address (only with a REAL coordinator address)
        // Attr MUST be iasCIEAddress (camelCase Homey/zigbee-clusters) — never
        // iasCieAddr / zero IEEE (breaks enrollment; forum #2134 Peter).
        if (cie) {
          try {
            await iasCluster.writeAttributes({ iasCIEAddress: cie });
          } catch (e) { this.log(`[IAS-RETRY] CIE write: ${e.message}`); }
        }

        // Strategy 2: Send enroll response (zoneId 10 = Homey/Peter pattern)
        try {
          const enroll = typeof iasCluster.zoneEnrollResponse === 'function'
            ? iasCluster.zoneEnrollResponse.bind(iasCluster)
            : (typeof iasCluster.enrollResponse === 'function' ? iasCluster.enrollResponse.bind(iasCluster) : null);
          if (enroll) {
            await enroll({ enrollResponseCode: 0, zoneId: 10 });
            this.log('[IAS-RETRY] zoneEnrollResponse sent (zoneId: 10)');
          }
        } catch (e) {
          this.log(`[IAS-RETRY] zoneEnrollResponse: ${e.message}`);
          // P203: sleepy/offline devices (Gmail OOM 9.0.537) — stop retry storm early
          if (/reageert niet|does not respond|not respond|n'?est pas aliment|not powered|no response|ECONNRESET|ETIMEDOUT/i.test(String(e.message || ''))) {
            sleepyMisses += 1;
            if (sleepyMisses >= 2) {
              this.log('[IAS-RETRY] Aborting — device offline/sleepy (avoid retry OOM)');
              return false;
            }
          }
        }

        // Strategy 3: Read zone status to verify
        await new Promise(r => safeSetTimeout(this, r, 2000));
        try {
          const status = await iasCluster.readAttributes(['zoneStatus', 'zoneState']);
          this.log(`[IAS-RETRY] zoneState=${status.zoneState}, zoneStatus=${status.zoneStatus}`);
          if (status.zoneState === 1 || status.zoneState === 'enrolled') { this.log('[IAS-RETRY] ✅ Enrolled!'); return true; }
        } catch (e) {
          this.log(`[IAS-RETRY] read: ${e.message}`);
          if (/reageert niet|does not respond|not respond|n'?est pas aliment|not powered|no response|ECONNRESET|ETIMEDOUT/i.test(String(e.message || ''))) {
            sleepyMisses += 1;
            if (sleepyMisses >= 2) {
              this.log('[IAS-RETRY] Aborting — device offline/sleepy (avoid retry OOM)');
              return false;
            }
          }
        }

        await new Promise(r => safeSetTimeout(this, r, 3000));
      } catch (err) {
        this.log(`[IAS-RETRY] Attempt ${i} error: ${err.message}`);
      }
    }
    this.log('[IAS-RETRY] ⚠️ Enrollment failed after retries');
    return false;
  }

  /**
   * _parseZclScaledValue - ZCL spec-exact parser for measuredValue attributes
   * (temperature & humidity are ALWAYS signed int16 in 0.01 units per ZCL spec).
   * v9.0.371: replaces the duplicated ad-hoc "smartDivisorDetect" heuristic —
   * Tuya DP scaling lives in lib/managers/SmartDivisorManager.js, ZCL scaling
   * is fixed by specification, no guessing needed.
   */
  _parseZclScaledValue(value) {
    if (typeof value !== 'number' || isNaN(value)) {return value;}
    return Math.round((value / 100) * 10) / 10;
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
    // v10.10.0: cumulative Tx counter in store (diagnostics) — throttled.
    this._txTotal = (this._txTotal || 0) + 1;
    if (this._txTotal % 25 === 0) {
      Promise.resolve(this.setStoreValue?.('stats_tx_total', this._txTotal)).catch(() => {});
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
    // v10.10.0: cumulative Rx counter in store (diagnostics/UX) — throttled
    // write every 25 events to avoid store churn.
    this._rxTotal = (this._rxTotal || 0) + 1;
    if (this._rxTotal % 25 === 0) {
      Promise.resolve(this.setStoreValue?.('stats_rx_total', this._rxTotal)).catch(() => {});
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
   * v9.0.388: Gardes _destroyed centrales sur add/removeCapability —
   * empêche les crashs quand un callback différé tire après onDeleted.
   */
  async addCapability(capability) {
    if (this._destroyed) {
      this.log?.(`[GUARD] addCapability(${capability}) après destroy — ignoré`);
      return;
    }
    return super.addCapability(capability);
  }

  async removeCapability(capability) {
    if (this._destroyed) {
      this.log?.(`[GUARD] removeCapability(${capability}) après destroy — ignoré`);
      return;
    }
    return super.removeCapability(capability);
  }

  /**
   * safeSetCapabilityValue - Set capability value with existence check and SanityFilter
   * v5.13.6: Integrated advanced telemetry logic (anti-flood, calibration, generic flows)
   * P207: optional meta.source records into CrossLayer SmartCap / ReceptionManager
   * @param {string} capability
   * @param {*} value
   * @param {{ source?: string, confidence?: number }} [meta]
   */
  async safeSetCapabilityValue(capability, value, meta) {
    // v9.0.388: garde _destroyed CENTRALE — couvre tous les chemins d'appel
    // (raw setCapabilityValue → override → ici). Empêche les crashs
    // "Cannot read properties of null" quand un callback tire après onDeleted.
    if (this._destroyed) {
      this.log?.(`[GUARD] setCapabilityValue(${capability}) après destroy — ignoré`);
      return false;
    }

    // P207/P211: multi-source bookkeeping + cross-layer fusion gate when source tagged
    try {
      if (meta && typeof meta === 'object' && meta.source) {
        let fusion;
        try { fusion = require('../layers/LayerSignalFusion'); } catch (_e) { fusion = null; }
        if (fusion) {
          const gate = fusion.decide(this, capability, value, meta.source, {
            confidence: meta.confidence ?? 0.85,
          });
          if (gate.commit === false) {
            // Echo / phantom / priority-hold — still learn SoftCap, no Homey spam
            this.receptionManager?.receive?.(capability, value, meta.source);
            const sc = this._smartCapabilities?.[capability];
            if (sc) {
              const src = fusion.normalizeSource(meta.source);
              if (!sc.validator.sources.has(src)) {
                sc.validator.addSource(src, { priority: 5, weight: 0.25, ttl: 120000 });
              }
              sc.record(src, value, meta.confidence ?? 0.85);
            }
            return true;
          }
        }
        this.receptionManager?.receive?.(capability, value, meta.source);
        const sc = this._smartCapabilities?.[capability];
        if (sc) {
          if (!sc.validator.sources.has(meta.source)) {
            sc.validator.addSource(meta.source, { priority: 5, weight: 0.25, ttl: 120000 });
          }
          sc.record(meta.source, value, meta.confidence ?? 0.85);
        }
        if (this.protocolOptimizer?.registerHit) {
          const src = String(meta.source);
          const proto = (src === 'tuya-dp' || src === 'dp') ? 'tuya'
            : src === 'ias' ? 'ias'
              : (src === 'raw' || src === 'raw_frame') ? 'raw' : 'zcl';
          this.protocolOptimizer.registerHit(proto, capability, value, capability);
        }
      }
    } catch (_e) { /* fail-open */ }

    // Historical restore: EventDedup (stable-v5 era) — 1 physical action = 1 Homey event
    // for hybrid ZCL+DP devices that report the same change twice.
    // P211: longer window + soft numeric compare (was 300ms exact-only).
    try {
      if (!this._eventDedup && EventDeduplicationLayer) {
        this._eventDedup = new EventDeduplicationLayer({
          windowMs: 1200,
          softNumeric: true,
          homey: this.homey,
        });
      }
      if (this._eventDedup) {
        const id = this.getData?.()?.id || this.getData?.()?.ieeeAddress || 'unknown';
        if (!this._eventDedup.shouldProcess(id, capability, value)) {
          return true;
        }
      }
    } catch (_e) { /* fail-open */ }

    // Forum #2092/#2093: defensive cumulative energy jump correction (÷100 vs ÷1000 families)
    // Also covers meter_power.exported / import aliases used by DIN rail meters.
    if (typeof capability === 'string' && capability.startsWith('meter_power')) {
      value = EnergyJumpGuard.check(this, value);
    }
    try {
      // 1. Sanity Check - Block bizarre values (radar noise, sleepy jumps)
      if (this._blockBizarreValue(capability, value)) {return false;}

      // 2. Calibration - Apply offsets from settings
      const calibratedValue = this._applyCalibration(capability, value);

      // 3. Capability Guard - Add if missing
      // Route through hotSwap (budget + computed-cap guard + coherence) when available.
      // Computed caps (meter_*) are Homey-integrated — never add from a device report.
      if (!this.hasCapability(capability)) {
        if (this.hotSwap) {
          await this.hotSwap.hotSwapAddCapability(capability, 0.85).catch(() => {});
        } else {
          // Fallback: guard against meter_* computed caps before raw addCapability
          const COMPUTED = new Set(['meter_gas', 'meter_power', 'meter_rain', 'meter_water']);
          if (!COMPUTED.has(capability)) {
            await this.addCapability(capability).catch(() => {});
          }
        }
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

        await DeviceTelemetryEstimator.record(this, capability, filteredValue, { previousValue }).catch(() => {});
        
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
  /**
   * v9.0.410 (P92.114): UNIVERSAL button.N UI listeners.
   * Pressing button.N in the Homey UI toggles the matching gang when the
   * device exposes onoff.gangN (or onoff for gang 1), and is a safe no-op
   * log otherwise — this kills "Missing Capability Listener: Button N" on
   * every driver. Shared flag with ButtonDevice/UnifiedSwitchBase versions
   * so registration happens exactly once whichever runs first.
   */
  async _registerButtonCapabilityListeners() {
    if (this._buttonCapListenersRegistered) { return; }
    this._buttonCapListenersRegistered = true;
    const caps = (typeof this.getCapabilities === 'function' && this.getCapabilities()) || [];
    for (const cap of caps) {
      const m = /^button\.(\d+)$/.exec(cap);
      if (!m) { continue; }
      const gang = parseInt(m[1], 10);
      try {
        this.registerCapabilityListener(cap, async () => {
          this.log(`[BUTTON-UI] ${cap} pressed (virtual)`);
          const now = Date.now();
          // v9.0.411 (P92.115): bidirectional vision — shared virtual/physical dedup.
          // A UI press is DROPPED when a physical press just happened (<2s),
          // otherwise the gang would toggle twice (same pattern as ButtonDevice).
          if (!this._virtualPhysicalDedup) {
            this._virtualPhysicalDedup = { lastVirtualPress: {}, lastPhysicalPress: {}, dedupWindow: 2000 };
          }
          const lastPhysical = this._virtualPhysicalDedup.lastPhysicalPress[gang] || 0;
          if (now - lastPhysical < this._virtualPhysicalDedup.dedupWindow) {
            this.log(`[DEDUP] Skipping virtual press (physical ${now - lastPhysical}ms ago)`);
            return true;
          }
          this._virtualPhysicalDedup.lastVirtualPress[gang] = now;
          try {
            const gangCap = this.hasCapability(`onoff.gang${gang}`) ? `onoff.gang${gang}`
              : (this.hasCapability(`onoff.${gang}`) ? `onoff.${gang}`
                : (gang === 1 && this.hasCapability('onoff') ? 'onoff' : null));

            // WHY (P2235): button-class remotes — never route UI into onoff TX
            // even if a phantom onoff capability is still present.
            const { isSceneRemoteDevice } = require('../utils/scene-remote-classify');
            const isSceneRemote = isSceneRemoteDevice(this);

            if (gangCap && !isSceneRemote && typeof this._handleVirtualToggle === 'function') {
              // Switch/dimmer UI — VirtualButtonMixin: markAppCommand + protocol + anti-spam
              await this._handleVirtualToggle(gang);
              if (typeof this.triggerButtonPress === 'function') {
                await this.triggerButtonPress(gang, 'single', 1, { source: 'virtual' }).catch(() => {});
              }
            } else if (gangCap && !isSceneRemote) {
              const current = this.getCapabilityValue(gangCap) === true;
              const next = !current;
              // WHY: stamp before TX so PhysicalButtonMixin ignores echo (ghost multi-gang)
              if (typeof this.markAppCommand === 'function') {
                this.markAppCommand(gang, next);
              } else if (typeof this.markAppCommandAll === 'function') {
                this.markAppCommandAll();
              }
              if (typeof this._setGangOnOff === 'function') {
                await this._setGangOnOff(gang, next);
              } else if (typeof this._safeSetCapability === 'function') {
                await this._safeSetCapability(gangCap, next);
              } else if (typeof this.safeSetCapabilityValue === 'function') {
                await this.safeSetCapabilityValue(gangCap, next, { source: 'ui' });
              } else if (typeof this.setCapabilityValue === 'function') {
                await this.setCapabilityValue(gangCap, next).catch(() => {});
              }
              if (typeof this.triggerButtonPress === 'function') {
                await this.triggerButtonPress(gang, 'single', 1, { source: 'virtual' }).catch(() => {});
              }
            } else {
              // Scene remotes (button.N only, or phantom onoff stripped path)
              if (typeof this.triggerButtonPress === 'function') {
                await this.triggerButtonPress(gang, 'single', 1, { source: 'virtual' }).catch(() => {});
              } else if (typeof this._triggerPhysicalFlow === 'function') {
                await this._triggerPhysicalFlow(gang, 'single', { source: 'virtual', _internalTrigger: true }).catch(() => {});
              }
            }
          } catch (e) { this.log('[BUTTON-UI] action failed:', e.message); }
          return true;
        });
      } catch (e) {
        this.log(`[BUTTON-UI] could not register ${cap}: ${e.message}`);
      }
    }

    // v9.0.411 (P92.119): named maintenance buttons (button.toggle,
    // button.identify, button.push, button.feed, ...). Rich versions
    // (VirtualButtonMixin, pet_feeder) always win — see NamedButtonFallback.
    try {
      registerNamedButtonFallbacks(this);
    } catch (e) {
      this.log(`[BUTTON-UI] named-button fallback error: ${e.message}`);
    }
  }


  async triggerFlowCard(cardId, tokens = {}, state = {}) {
    // v8.5.0: Guard against destroyed device
    if (this._destroyed) {
      this._diagLogger.verbose('Skipping flow trigger: device destroyed', { cardId });
      return false;
    }

    // v9.0.402 (P92.105): sensor suppression — muted motion/presence cards
    // do not fire while the device is suppressed (Hue-style "suppress sensor").
    try {
      const supMgr = this.homey.app && this.homey.app.sensorSuppressionManager;
      if (supMgr && supMgr.isSuppressibleCard(cardId)) {
        const devId = (typeof this.getData === 'function' && this.getData() && this.getData().id) || this.id;
        if (devId && supMgr.isSuppressed(devId)) {
          this.log(`[SUPPRESS] flow ${cardId} muted (sensor suppressed)`);
          return false;
        }
        // v9.0.408 (P92.110): motion cascade — linked lights follow motion
        // (only when the sensor is NOT suppressed, consistent with flows).
        const cascMgr = this.homey.app && this.homey.app.motionCascadeManager;
        if (devId && cascMgr && cascMgr.isLinked(devId)) {
          cascMgr.onMotion(devId).catch(() => {});
        }
      }
    } catch (_e) { /* non-critical */ }

    // Do not query SDK3 for speculative fallback IDs absent from the manifest.
    // Homey reports those lookups as invalid Flow IDs even when caught here.
    try {
      const { collectDeclaredFlowIds, findDeclaredCI } = require('../flow/FlowCardHeuristics');
      const declared = collectDeclaredFlowIds(this.homey);
      if (declared.size) {
        const hit = findDeclaredCI(declared, cardId);
        if (!hit) {
          this._diagLogger.verbose('Skipping undeclared flow card', { cardId });
          return false;
        }
        cardId = hit;
      }
    } catch (_e) {
      const declaredTriggers = this.homey?.manifest?.flow?.triggers;
      if (Array.isArray(declaredTriggers)) {
        const isDeclared = declaredTriggers.some((entry) =>
          typeof entry === 'string' ? entry === cardId : entry?.id === cardId
        );
        if (!isDeclared) {
          this._diagLogger.verbose('Skipping undeclared flow card', { cardId });
          return false;
        }
      }
    }

    this._diagLogger.info('Triggering flow card', { cardId, tokens: Object.keys(tokens) });
    try {
      let card = null;
      const flow = this._safeHomey?.flow;
      const { safeGetFlowCard, isNoopFlowCard } = require('../io/HomeyCompensationLayer');
      try {
        const { collectDeclaredFlowIds } = require('../flow/FlowCardHeuristics');
        const declared = collectDeclaredFlowIds(this.homey);
        card = safeGetFlowCard(this.homey, cardId, 'trigger', declared.size ? declared : null);
        if (isNoopFlowCard(card)) {card = null;}
      } catch (_e) {
        if (flow && typeof flow.getDeviceTriggerCard === 'function') {
          try {
            card = flow.getDeviceTriggerCard(cardId);
          } catch (e) {
            this._diagLogger.verbose('Card not found as device trigger', { cardId, error: e.message });
          }
        }
      }

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
    // v10.6.0 FIX: the guard used `this._destroyed`, but onDeleted sets
    // `_destroyed = true` BEFORE calling us (race-condition fix v9.1.2) —
    // so cleanup NEVER ran since v9.1.2 (dead code, timers leaked on every
    // device delete). Use a dedicated idempotence flag instead.
    if (this._destroyDeviceDone) {return;}
    this._destroyDeviceDone = true;
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

    // Clean up hot-swap engine
    if (this.hotSwap && typeof this.hotSwap.onDestroy === 'function') {
      try { this.hotSwap.onDestroy(); } catch { /* non-blocking */ }
      this.hotSwap = null;
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
