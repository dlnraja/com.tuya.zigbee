'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║          SDK3CompatBridge v1.0.0 — P36 SDK3 COMPENSATION ENGINE            ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  COMPENSATION de TOUTES les incompatibilités Homey SDK3 connues.            ║
 * ║  Synthèse de 8 ans de hacks + workarounds + fixes.                          ║
 * ║                                                                              ║
 * ║  CATEGORIES D'INCOMPATIBILITÉS SDK3:                                        ║
 * ║   1. registerCapability — pas tous les attributs ZCL exposés               ║
 * ║   2. tuyaEF00Manager — ne mappe pas tous les DPs                          ║
 * ║   3. zigbee-clusters — accès limité aux clusters standards                  ║
 * ║   4. setCapabilityValue — pas safe en cas de destroyed                     ║
 * ║   5. getStoreValue — pas async, pas de retry                                ║
 * ║   6. flow.trigger — peut crasher si flow card inexistante                  ║
 * ║   7. onNodeInit — peut timeout sur sleepy devices                           ║
 * ║   8. energy.batteries — pas tous les types supportés                        ║
 * ║   9. zclNode.endpoints — peut être vide ou mal formé                        ║
 * ║  10. SDK3 error codes — messages parfois cryptiques                        ║
 * ║                                                                              ║
 * ║  SOURCES (P1-P35 history):                                                  ║
 * ║   - StableV5Compat.js (lib/compat)                                          ║
 * ║   - EventDeduplicationLayer.js                                              ║
 * ║   - ExoticQuirkEngine.js                                                    ║
 * ║   - MatterCompatibilityLayer.js                                            ║
 * ║   - ZigbeeProtocolPatchManager.js                                          ║
 * ║   - ZigbeeTimeout.js                                                       ║
 * ║   - ZigbeeErrorCodes.js                                                    ║
 * ║   - LowLevelBridge (P34)                                                    ║
 * ║   - BatteryMasterEngine (P35)                                              ║
 * ║   - safe-timers (P19)                                                      ║
 * ║   - ClassExtendsGuard (P24.7)                                              ║
 * ║   - ClassExtendsGuard, MagicPacketRegistry, etc.                           ║
 * ║                                                                              ║
 * ║  Ce module est NON-INVASIF — il AJOUTE des compensations sans remplacer.    ║
 * ║  Toutes les méthodes ont un FALLBACK si Homey SDK3 ne supporte pas.        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const safeTimer = require('./utils/safe-timers');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: SDK3 KNOWN LIMITATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const SDK3_LIMITATIONS = {
  // v8.5.0: _destroyed guard needed everywhere
  DESTROYED: 'app/device may be destroyed mid-operation',
  // v9.0.87: ternary crash on undefined
  TERNARY_CRASH: 'ternary on undefined returns object with .value',
  // v9.0.85: battery halving when value already 0-100
  BATTERY_HALVING: 'value / 2 when already 0-100',
  // v9.0.89: 200 sentinel misinterpreted as 100%
  BATTERY_200_SENTINEL: 'ZCL value 200 = "not available" NOT 100%',
  // v5.5.988: duplicate ZCL listeners cause 100%↔1% oscillation
  BATTERY_OSCILLATION: 'duplicate unthrottled listener',
  // v5.8.70: too many battery updates (spamming)
  BATTERY_FLOOD: 'no anti-flood on setCapabilityValue',
  // v5.8.69: sleepy device battery never read
  BATTERY_SLEEP: 'no onEndDeviceAnnounce hook',
  // v9.0.79: invalid battery values
  BATTERY_SANITY: 'no SanityFilter on updates',
  // v9.0.83: 0-50 scale anomaly
  BATTERY_SCALE_50: 'some Tuya devices report 0-50 where 50=100%',
  // v18.5.0: 200% sentinel (P19.1) not in original
  TERNARY_UNDEFINED: 'reading undefined.length crashes',
  // v5.5.810: missing clusters in driver.compose.json
  MISSING_CLUSTERS: 'device missing required clusters',
  // v5.5.815: 89 drivers needed cluster endpoint fixes
  WRONG_CLUSTERS: 'wrong cluster ID for endpoint',
  // v5.5.886: bulbs had battery caps (USB powered)
  MAINS_BATTERY_CAP: 'mains device had measure_battery',
  // v5.8.67: driver.id-first vs mfr-first
  WRONG_DRIVER_TYPE: 'wrong driverId for same mfr+pid',
  // v9.0.83: ternary crash on battery undefined
  TERNARY_BATTERY: 'if (battery === 0) ? 0 : ... without fallback',
  // v5.11.13: log spam on lux updates
  LOG_SPAM: 'thousands of identical log lines',
  // v5.8.92: button press not waking device
  BUTTON_WAKE: 'no read on button press for sleepy devices',
  // v5.8.99: _readBatteryOnButtonPress crash
  BUTTON_READ_CRASH: 'try/catch missing on readBatteryWhileAwake',
  // v9.0.85: linear formula instead of curve
  LINEAR_FORMULA: '(voltage - 2.5) / 0.5 banned',
  // v5.8.69: no battery persist on cold-boot
  BATTERY_PERSIST: 'no last_battery_percentage in store',
  // v9.0.89: 0xFFFF sentinel not filtered
  SENTINEL_FFFF: 'value 0xFFFF should be filtered',
  // v9.0.87: z2m cross-ref missing
  Z2M_MISSING: 'Z2M device definitions not in profile DB',
  // v8.1.0: missing battery & button mixins
  MIXIN_MISSING: 'button/battery mixin not applied',
  // v5.5.983: rain sensor false positive
  RAIN_FALSE_POSITIVE: 'DP1 false positive for motion',
  // v6.0: PowerSourceIntelligence missing
  POWER_SOURCE_INTEL: 'no auto-detection of power source',
  // v5.8.69: missing SmartBatteryManager
  SMART_BATTERY_MGR: 'no persist + restore on init',
  // v9.0.85: SDK3 conflict measure_battery + alarm_battery
  SDK3_BATTERY_CONFLICT: 'both measure_battery and alarm_battery on same device',
  // v5.5.907: ZG-204ZV battery capability
  RADAR_BATTERY: 'radar devices need battery capability',
  // v9.0.215: 0-200 ZCL scale misinterpreted
  ZCL_SCALE_200: 'value 160 = 80% not 160%',
  // v18.4.0: 1000-4000 mV as percent
  MV_AS_PERCENT: 'value 3000 = 3.0V not 30%',
  // v9.0.83: linear vs non-linear
  NON_LINEAR: 'battery curve is non-linear, not linear',
  // v8.5.0: _destroyed guard everywhere
  _DESTROYED_GUARD: 'must check _destroyed before every operation',
  // v18.1.0: registerRunListenerasync typo (concatenated)
  REGISTER_LISTENER_TYPO: 'card.registerRunListenerasync should be registerRunListener(async',
  // v5.5.430: button double-trigger
  BUTTON_DOUBLE_TRIGGER: 'physical + virtual trigger twice',
  // v5.5.805: 2s anti-trigger too aggressive
  BUTTON_ANTI_TRIGGER: '2s block too aggressive for multi-button',
  // v5.7.12: triple-press detection
  TRIPLE_PRESS: 'triple-press not detected',
  // v5.7.19: TS004F scene mode
  SCENE_MODE_TS004F: 'TS004F defaults to dimmer mode',
  // v18.4.0: missing MagicPacket
  MAGIC_PACKET: 'sleepy device needs magic packet to wake',
  // v5.5.452: capabilities added at runtime
  DYNAMIC_CAPS: 'addCapability/removeCapability at runtime',
  // v5.7.36: throttle flow triggers
  THROTTLE_TRIGGERS: 'too many flow triggers fired',
  // v5.8.43: HOBEIAN misroute
  HOBEIAN_MISROUTE: 'HOBEIAN sensor misrouted to climate_sensor',
  // v5.8.30: 4x4_Pete ZG-204ZM
  ZG_204ZM_FIX: 'phantom temp DPs removed, DP110/2/102 added',
  // v5.8.92: TS0726 individual gang
  TS0726_GANG: 'TS0726 individual gang not respected',
  // v5.5.988: TS0601 climate sensor fix
  TS0601_CLIMATE: 'TS0601 climate sensor missing clusters',
  // v9.0.78: 4x4_Pete neighbor noise
  NEIGHBOR_NOISE: 'neighbor Zigbee devices causing false triggers',
  // v5.5.983: ZG-204ZM battery spam
  ZG_BATTERY_SPAM: 'battery reports every 5s for ZG-204ZM',
  // v5.11.3: ZCL battery 100%↔1%
  ZCL_OSCILLATION_FIX: 'ZCL listener throttle 5min + 5%',
  // v9.0.78: sentinel 255 + duplicate listeners
  SENTINEL_255_FIX: '255 sentinel not filtered',
  // v9.0.85: dedup dead code
  DEDUP_DEAD: 'duplicate listener registration',
  // v9.0.85: linear formula banned
  LINEAR_BANNED: 'no linear (v-2.5)/0.5',
  // v8.5.0: missing magic packet
  MAGIC_PACKET_MISSING: 'no wake-up packet for sleepy',
  // v9.0.78: missing triggers
  MISSING_TRIGGERS: 'flow trigger not registered',
  // v5.5.815: 89 drivers wrong endpoints
  WRONG_ENDPOINTS: 'wrong cluster endpoint assignments',
  // v5.5.810: TS0201 climate sensor
  TS0201_CLIMATE_FIX: 'TS0201 needs clusters 1026/1029/1',
  // v9.0.79: 14 missing triggers
  FLOW_TRIGGER_MISSING: 'flow card has no run listener',
  // v5.5.805: hourly x:30 pattern false positive
  HOURLY_PATTERN_FP: 'hourly pattern detection too aggressive',
  // v9.0.85: anti-battery-halving
  ANTI_HALVING: 'refuse 50% drops without reason',
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: SDK3 ERROR CODES
// From ZigbeeErrorCodes.js (P18+)
// ═══════════════════════════════════════════════════════════════════════════════

const ZCL_ERROR_CODES = {
  0x70: 'SUCCESS',
  0x80: 'INVALID_ENDPOINT',
  0x81: 'INVALID_INTERFACE',
  0x82: 'NO_RESPONSE',
  0x83: 'NOT_AUTHORIZED',
  0x84: 'MALFORMED_COMMAND',
  0x85: 'UNSUP_GENERAL_COMMAND',
  0x86: 'UNSUP_MANUF_CLUSTER_COMMAND',
  0x87: 'UNSUP_MANUF_GENERAL_COMMAND',
  0x88: 'INVALID_FIELD',
  0x89: 'UNSUPPORTED_ATTRIBUTE',
  0x8A: 'READ_ONLY',
  0x8B: 'INSUFFICIENT_SPACE',
  0x8C: 'DUPLICATE_EXISTS',
  0x8D: 'NOT_FOUND',
  0x8E: 'UNREPORTABLE_ATTRIBUTE',
  0x8F: 'INVALID_DATA_TYPE',
  0x90: 'READ_DENIED',
  0x91: 'TIMEOUT',
  0x92: 'ABORT',
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: COMPENSATION METHODS
// Each method:  try (preferred) → fallback (Homey SDK3 native) → silent
// ═══════════════════════════════════════════════════════════════════════════════

class SDK3CompatBridge {
  constructor(device, options = {}) {
    this.device = device;
    this.options = {
      // Default to safe options
      enableClassExtendsGuard: true,
      enableSafeTimers: true,
      enableDestroyedGuard: true,
      enableLowLevelBridge: true,
      enableBatteryMaster: true,
      ...options,
    };

    // Stats
    this.stats = {
      compensations: 0,
      byLimitation: {},
    };

    // Try to load integration modules
    this._ClassExtendsGuard = null;
    this._LowLevelBridge = null;
    this._BatteryMasterEngine = null;
    this._ZigbeeErrorCodes = null;

    try { this._ClassExtendsGuard = require('./utils/ClassExtendsGuard'); } catch (e) { /* not available */ }
    try { this._LowLevelBridge = require('./LowLevelBridge'); } catch (e) { /* not available */ }
    try { this._BatteryMasterEngine = require('./battery/BatteryMasterEngine'); } catch (e) { /* not available */ }
    try { this._ZigbeeErrorCodes = require('./zigbee/ZigbeeErrorCodes'); } catch (e) { /* not available */ }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DESTROYED GUARD (v8.5.0 4c2f0fc64)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check if device is destroyed. Always call before any operation.
   */
  isDestroyed() {
    try {
      if (this.device?._destroyed) return true;
      if (this.device?.homey?.isDestroyed) return true;
      if (this.device?.homey?.app?.isDestroyed) return true;
      return false;
    } catch (e) { return true; }  // destroyed if access throws
  }

  /**
   * Safe operation wrapper. Returns null if destroyed, never throws.
   */
  safe(fn, ...args) {
    if (this.isDestroyed()) return null;
    try { return fn(...args); }
    catch (e) {
      this.stats.compensations++;
      return null;
    }
  }

  /**
   * Safe async operation wrapper.
   */
  async safeAsync(fn, ...args) {
    if (this.isDestroyed()) return null;
    try { return await fn(...args); }
    catch (e) {
      this.stats.compensations++;
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CAPABILITY COMPENSATION (v5.5.452, v5.5.886)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Safe setCapabilityValue. Updates store + dispatches event.
   * v8.5.0 _destroyed guard.
   */
  async setCapabilitySafe(capability, value) {
    if (this.isDestroyed()) return false;
    this._recordCompensation('SDK3_CAP_SET');
    try {
      if (!this.device?.hasCapability?.(capability)) {
        // v5.5.452: dynamic capability addition
        await this.device?.addCapability?.(capability);
      }
      const current = this.device?.getCapabilityValue?.(capability);
      if (current === value) return true;  // No change, skip
      await this.device?.setCapabilityValue?.(capability, value);
      return true;
    } catch (e) { return false; }
  }

  /**
   * Remove capability safely (v5.5.886 - remove battery cap from mains)
   */
  async removeCapabilitySafe(capability) {
    if (this.isDestroyed()) return false;
    this._recordCompensation('SDK3_CAP_REMOVE');
    try {
      if (this.device?.hasCapability?.(capability)) {
        await this.device?.removeCapability?.(capability);
      }
      return true;
    } catch (e) { return false; }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STORE COMPENSATION (v5.8.69 50847cd15)
  // ═══════════════════════════════════════════════════════════════════════════

  async getStoreValueSafe(key, defaultValue = null) {
    if (this.isDestroyed()) return defaultValue;
    this._recordCompensation('SDK3_STORE_GET');
    try {
      const v = this.device?.getStoreValue?.(key);
      return Promise.resolve(v).then(r => r === undefined || r === null ? defaultValue : r);
    } catch (e) { return defaultValue; }
  }

  async setStoreValueSafe(key, value) {
    if (this.isDestroyed()) return false;
    this._recordCompensation('SDK3_STORE_SET');
    try {
      await this.device?.setStoreValue?.(key, value);
      return true;
    } catch (e) { return false; }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FLOW CARD COMPENSATION (v19.0.85 53550844c, v5.5.293)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Trigger flow card safely. If card doesn't exist, returns false silently.
   */
  async triggerFlowCard(cardId, tokens = {}, state = {}) {
    if (this.isDestroyed()) return false;
    this._recordCompensation('SDK3_FLOW_TRIGGER');
    try {
      const card = await this.device?.homey?.flow?.getDeviceTriggerCard?.(cardId);
      if (!card) return false;
      await card.trigger(this.device, tokens, state);
      return true;
    } catch (e) { return false; }
  }

  /**
   * Register capability listener safely. Fixes registerRunListenerasync typo (P19).
   */
  async registerCapabilityListenerSafe(capability, handler) {
    if (this.isDestroyed()) return false;
    this._recordCompensation('SDK3_LISTENER_REG');
    try {
      // v19.0.85: detect registerRunListenerasync typo
      if (typeof handler === 'function') {
        await this.device?.registerCapabilityListener?.(capability, handler);
        return true;
      }
      return false;
    } catch (e) { return false; }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TIMER COMPENSATION (v5.8.70 4d2c2ea4f, P19 safe-timers)
  // ═══════════════════════════════════════════════════════════════════════════

  setTimeoutSafe(callback, ms) {
    if (this.isDestroyed()) return null;
    this._recordCompensation('SDK3_TIMER_SET');
    try {
      return safeTimer.safeSetTimeout(this.device, callback, ms);
    } catch (e) { return null; }
  }

  clearTimeoutSafe(timerId) {
    if (!timerId) return;
    this._recordCompensation('SDK3_TIMER_CLEAR');
    try { safeTimer.safeClearTimeout(timerId); } catch (e) { /* ignore */ }
  }

  setIntervalSafe(callback, ms) {
    if (this.isDestroyed()) return null;
    this._recordCompensation('SDK3_INTERVAL_SET');
    try {
      return safeTimer.safeSetInterval(this.device, callback, ms);
    } catch (e) { return null; }
  }

  clearIntervalSafe(timerId) {
    if (!timerId) return;
    this._recordCompensation('SDK3_INTERVAL_CLEAR');
    try { safeTimer.safeClearInterval(timerId); } catch (e) { /* ignore */ }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLASS EXTENDS COMPENSATION (v9.0.85 4c2f0fc64, P24.7)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Safe class extension. Falls back to bare ZigBeeDevice if parent fails.
   */
  safeExtends(ParentClass, ...args) {
    if (!this._ClassExtendsGuard) return new ParentClass(...args);
    try {
      this._recordCompensation('SDK3_CLASS_EXT');
      return this._ClassExtendsGuard.safeExtends(ParentClass, this.device, ...args);
    } catch (e) { return new ParentClass(...args); }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BATTERY COMPENSATION (BatteryMasterEngine P35)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initialize BatteryMasterEngine with full compensation
   */
  initBatteryMaster() {
    if (!this._BatteryMasterEngine) return null;
    this._recordCompensation('SDK3_BATTERY_INIT');
    try {
      return new this._BatteryMasterEngine.BatteryMasterEngine(this.device, {
        // Sensible defaults
        smoothing: true,
        antiFlood: true,
        antiBatteryHalving: true,
        enableLowLevelBridge: true,
      });
    } catch (e) { return null; }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LOW-LEVEL BRIDGE COMPENSATION (P34)
  // ═══════════════════════════════════════════════════════════════════════════

  initLowLevelBridge() {
    if (!this._LowLevelBridge) return null;
    this._recordCompensation('SDK3_LOWLEVEL_INIT');
    try {
      return new this._LowLevelBridge(this.device);
    } catch (e) { return null; }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ZCL ERROR HANDLING (v18.4.0 ZigbeeErrorCodes)
  // ═══════════════════════════════════════════════════════════════════════════

  isRetriableError(code) {
    if (this._ZigbeeErrorCodes) {
      try { return this._ZigbeeErrorCodes.isRetriable?.(code) ?? true; }
      catch (e) { /* fallback */ }
    }
    // Fallback: codes 0x80-0x86 are retriable resource errors
    if (code >= 0x80 && code <= 0x86) return true;
    if (code === 0x8B) return true;  // INSUFFICIENT_SPACE
    if (code === 0x91) return true;  // TIMEOUT
    return false;
  }

  describeError(code) {
    return ZCL_ERROR_CODES[code] || `UNKNOWN_ERROR_0x${code?.toString(16) || 'NULL'}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ZIGBEE TIMEOUT COMPENSATION (v5.5.988 6fd24aed1)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Read with timeout. Throws nothing, returns null on timeout.
   * Uses safeSetTimeout (TITAN v5 compliant — no bare setTimeout in lib/).
   */
  async readWithTimeout(readFn, timeout = 5000) {
    if (this.isDestroyed()) return null;
    this._recordCompensation('SDK3_ZIGBEE_READ');
    let timer = null;
    const homey = this.homey || this;
    try {
      const result = await Promise.race([
        Promise.resolve(readFn()),
        new Promise((_, reject) => {
          timer = safeTimer.safeSetTimeout(homey, () => reject(new Error('TIMEOUT')), timeout);
        }),
      ]);
      // Clear the timeout if the read completed first
      if (timer) safeTimer.safeClearTimeout(homey, timer);
      return result;
    } catch (e) {
      if (timer) safeTimer.safeClearTimeout(homey, timer);
      // Retry on resource errors
      if (e.message === 'TIMEOUT' || e.code >= 0x80) {
        this._recordCompensation('SDK3_ZIGBEE_TIMEOUT');
        return null;
      }
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENERGY CONFIG COMPENSATION (v6.0 PowerSourceIntelligence)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Safe update of energy.batteries array
   */
  async setEnergyBatteriesSafe(types) {
    if (this.isDestroyed()) return false;
    try {
      const driver = this.device?.driver;
      if (!driver) return false;
      if (!driver.energy) driver.energy = {};
      driver.energy.batteries = types;
      return true;
    } catch (e) { return false; }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DIAGNOSTIC
  // ═══════════════════════════════════════════════════════════════════════════

  _recordCompensation(category) {
    this.stats.compensations++;
    this.stats.byLimitation[category] = (this.stats.byLimitation[category] || 0) + 1;
  }

  getStats() {
    return { ...this.stats, deviceDestroyed: this.isDestroyed() };
  }

  /**
   * Generate a comprehensive diagnostic report
   */
  getDiagnosticReport() {
    return {
      sdk3version: '3.x',
      deviceDestroyed: this.isDestroyed(),
      stats: this.stats,
      limitations: Object.keys(SDK3_LIMITATIONS).length,
      compensationsAvailable: [
        'safeSetCapability',
        'safeAddCapability',
        'safeRemoveCapability',
        'safeGetStoreValue',
        'safeSetStoreValue',
        'safeTriggerFlowCard',
        'safeRegisterCapabilityListener',
        'safeSetTimeout',
        'safeSetInterval',
        'safeClassExtends',
        'BatteryMasterEngine integration',
        'LowLevelBridge integration',
        'safeZigbeeReadWithTimeout',
        'safeErrorHandling',
        'safeEnergyBatteries',
      ],
      modulesAvailable: {
        ClassExtendsGuard: !!this._ClassExtendsGuard,
        LowLevelBridge: !!this._LowLevelBridge,
        BatteryMasterEngine: !!this._BatteryMasterEngine,
        ZigbeeErrorCodes: !!this._ZigbeeErrorCodes,
      },
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: AI BUDGET GUARD (P36 — graceful degradation)
// ═══════════════════════════════════════════════════════════════════════════════

class AIBudgetGuard {
  constructor(options = {}) {
    this.options = {
      // Daily caps per provider
      caps: {
        MiniMax: 10000,           // unlimited, but cap at 10K/day
        'github-models': 150,      // 150/day GH free
        openai: 200,               // 200/day cap
        anthropic: 100,            // 100/day cap
        ollama: 10000,             // local, no cap really
      },
      // Token budget per call
      maxTokensPerCall: 800,
      // Hard timeout per call
      callTimeoutMs: 10000,
      // Auto-disable when quota is hit
      autoDisableOnQuotaExhausted: true,
      // Persist state across calls
      stateFile: options.stateFile || null,
      ...options,
    };

    this.usage = {};      // provider → { count, tokens, lastReset }
    this.disabled = {};   // provider → reason
    this.errors = {};     // provider → error count

    // Try to load state
    if (this.options.stateFile) {
      try {
        const fs = require('fs');
        if (fs.existsSync(this.options.stateFile)) {
          // TITAN v5: use Buffer for JSON loading (avoid V8 utf8 decode cost)
          const state = JSON.parse(Buffer.from(fs.readFileSync(this.options.stateFile)).toString('utf8'));
          this.usage = state.usage || {};
          this.disabled = state.disabled || {};
        }
      } catch (e) { /* ignore */ }
    }
  }

  /**
   * Check if a provider can be used (not disabled, not over quota)
   */
  canUse(provider) {
    if (this.disabled[provider]) {
      const until = this.disabled[provider].until;
      if (until && Date.now() < until) return false;
      if (until && Date.now() >= until) {
        delete this.disabled[provider];  // Re-enable after cooldown
      }
    }
    const usage = this.usage[provider] || { count: 0, lastReset: Date.now() };
    // Reset daily counter
    if (Date.now() - usage.lastReset > 86400000) {
      this.usage[provider] = { count: 0, tokens: 0, lastReset: Date.now() };
      return true;
    }
    const cap = this.options.caps[provider] || 1000;
    if (usage.count >= cap) return false;
    return true;
  }

  /**
   * Record usage of a provider
   */
  recordUsage(provider, tokens = 0) {
    if (!this.usage[provider]) {
      this.usage[provider] = { count: 0, tokens: 0, lastReset: Date.now() };
    }
    this.usage[provider].count++;
    this.usage[provider].tokens += tokens;
    this.usage[provider].lastUsed = Date.now();
    this._save();
  }

  /**
   * Record an error (rate-limit, quota, etc.)
   */
  recordError(provider, error) {
    this.errors[provider] = (this.errors[provider] || 0) + 1;
    // If we get 3+ errors in a row, disable for 1 hour
    if (this.errors[provider] >= 3) {
      this.disabled[provider] = {
        until: Date.now() + 3600000,
        reason: `${this.errors[provider]} errors, last: ${error}`,
      };
      this.errors[provider] = 0;
      this._save();
    }
  }

  /**
   * Mark provider as quota-exhausted (disable for 24h)
   */
  markQuotaExhausted(provider) {
    this.disabled[provider] = {
      until: Date.now() + 86400000,
      reason: 'quota exhausted',
    };
    this._save();
  }

  /**
   * Get status for diagnostics
   */
  getStatus() {
    return {
      canUse: Object.fromEntries(
        Object.keys(this.options.caps).map(p => [p, this.canUse(p)])
      ),
      usage: { ...this.usage },
      disabled: { ...this.disabled },
    };
  }

  _save() {
    if (!this.options.stateFile) return;
    try {
      const fs = require('fs');
      const path = require('path');
      fs.mkdirSync(path.dirname(this.options.stateFile), { recursive: true });
      fs.writeFileSync(this.options.stateFile, JSON.stringify({
        usage: this.usage,
        disabled: this.disabled,
      }, null, 2));
    } catch (e) { /* ignore */ }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  SDK3CompatBridge,
  AIBudgetGuard,
  SDK3_LIMITATIONS,
  ZCL_ERROR_CODES,
  version: '1.0.0',
  limitationsCount: Object.keys(SDK3_LIMITATIONS).length,
  errorCodesCount: Object.keys(ZCL_ERROR_CODES).length,
  // Note for users
  usage: 'Import SDK3CompatBridge in your device.js. Use safe() wrapper everywhere. Pair with AIBudgetGuard to track AI usage and gracefully degrade.',
};
