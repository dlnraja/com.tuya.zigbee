'use strict';

const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');

// v5.5.404: Module-level state for lux oscillation detection across device instances
const luxOscillationState = new Map();

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      RADAR/mmWAVE PRESENCE SENSOR - v5.5.315 INTELLIGENT INFERENCE         ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  v5.5.315: INTELLIGENT PRESENCE INFERENCE for presence=null firmware bug   ║
 * ║  Sources: Z2M #27212, #30326, #8939, HA t/862007, ZHA #3969, Reddit        ║
 * ║  - SMART INFERENCE: Uses distance, lux changes, ZCL clusters as fallback   ║
 * ║  - FIRMWARE DETECTION: Handles appVersion 74 vs 78 differences             ║
 * ║  - ACTIVITY TRACKING: Monitors multiple DPs to deduce presence state       ║
 * ║  - v5.5.314: Lux smoothing + presence debouncing                           ║
 * ║  - v5.5.301: DP102=LUX fix for _TZE284_iadro9bf (Ronny #752)              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// v5.5.315: INTELLIGENT PRESENCE INFERENCE ENGINE
// Calculates presence from multiple data sources when DP1 returns null
// ═══════════════════════════════════════════════════════════════════════════════
class IntelligentPresenceInference {
  constructor(device) {
    this.device = device;
    this.state = {
      // Distance tracking
      lastDistance: null,
      distanceHistory: [],      // Last 10 distance readings
      distanceTimestamp: 0,

      // Lux tracking (rapid changes indicate movement)
      lastLux: null,
      luxHistory: [],           // Last 10 lux readings
      luxTimestamp: 0,
      luxChangeRate: 0,         // Rate of lux change per second

      // Presence tracking
      lastPresenceDP: null,     // Last DP1 value (may be null)
      inferredPresence: false,  // Calculated presence
      presenceConfidence: 0,    // 0-100% confidence
      lastInferenceTime: 0,

      // Activity indicators
      lastActivityTime: 0,      // Any DP activity
      dpActivityCount: 0,       // DPs received in last 60s

      // Firmware info
      appVersion: null,
      firmwareType: 'unknown',  // 'v74', 'v78', 'unknown'
    };

    // Inference parameters (tuned from research)
    this.params = {
      distanceThreshold: 0.1,       // Min distance change to indicate movement (m)
      luxChangeThreshold: 50,       // Min lux change to indicate movement
      luxChangeRateThreshold: 10,   // Lux/second rate indicating presence
      activityTimeoutMs: 60000,     // 60s no activity = no presence
      minConfidenceForPresence: 40, // Minimum confidence to report presence
      historySize: 10,              // Number of readings to keep
    };
  }

  // Update distance reading and calculate inference
  updateDistance(distance) {
    const now = Date.now();
    const state = this.state;

    // Track history
    state.distanceHistory.push({ value: distance, time: now });
    if (state.distanceHistory.length > this.params.historySize) {
      state.distanceHistory.shift();
    }

    // Calculate distance change
    const distanceChanged = state.lastDistance !== null &&
      Math.abs(distance - state.lastDistance) > this.params.distanceThreshold;

    state.lastDistance = distance;
    state.distanceTimestamp = now;
    state.lastActivityTime = now;
    state.dpActivityCount++;

    // Distance-based presence: >0 and <max_range = someone present
    const maxRange = this.device._lastMaxRange || 6;
    const distanceIndicatesPresence = distance > 0 && distance < maxRange;

    this._recalculatePresence('distance', {
      distance,
      distanceChanged,
      distanceIndicatesPresence
    });

    return this.state.inferredPresence;
  }

  // Update lux reading and detect movement from changes
  updateLux(lux) {
    const now = Date.now();
    const state = this.state;

    // Track history
    state.luxHistory.push({ value: lux, time: now });
    if (state.luxHistory.length > this.params.historySize) {
      state.luxHistory.shift();
    }

    // Calculate lux change rate
    if (state.lastLux !== null && state.luxTimestamp > 0) {
      const timeDelta = (now - state.luxTimestamp) / 1000; // seconds
      if (timeDelta > 0) {
        state.luxChangeRate = Math.abs(lux - state.lastLux) / timeDelta;
      }
    }

    const luxIndicatesMovement = state.luxChangeRate > this.params.luxChangeRateThreshold;

    state.lastLux = lux;
    state.luxTimestamp = now;
    state.lastActivityTime = now;
    state.dpActivityCount++;

    this._recalculatePresence('lux', {
      lux,
      luxChangeRate: state.luxChangeRate,
      luxIndicatesMovement
    });

    return this.state.inferredPresence;
  }

  // Update from DP1 presence (may be null)
  updatePresenceDP(value) {
    const now = Date.now();
    this.state.lastPresenceDP = value;
    this.state.lastActivityTime = now;
    this.state.dpActivityCount++;

    // If DP1 gives a valid value, use it with high confidence
    if (value !== null && value !== undefined) {
      const presence = value === 1 || value === 2 || value === true;
      this.state.inferredPresence = presence;
      this.state.presenceConfidence = 95; // High confidence from direct DP
      this.state.lastInferenceTime = now;
      this.device?.log?.(`[INFERENCE] ✅ DP1 presence=${presence} (confidence: 95%)`);
      return presence;
    }

    // DP1 is null - rely on inference
    this._recalculatePresence('dp1_null', {});
    return this.state.inferredPresence;
  }

  // Update firmware info for firmware-specific handling
  setFirmwareInfo(appVersion) {
    this.state.appVersion = appVersion;
    if (appVersion >= 78) {
      this.state.firmwareType = 'v78';
      // v78 firmware often has presence=null bug
      this.params.minConfidenceForPresence = 35; // Lower threshold
    } else if (appVersion >= 74) {
      this.state.firmwareType = 'v74';
      // v74 firmware usually works better
      this.params.minConfidenceForPresence = 45;
    }
    this.device?.log?.(`[INFERENCE] 📱 Firmware: appVersion=${appVersion} type=${this.state.firmwareType}`);
  }

  // Get current inferred presence state
  getPresence() {
    // Check for activity timeout
    const now = Date.now();
    if (now - this.state.lastActivityTime > this.params.activityTimeoutMs) {
      // No activity for 60s = assume no presence
      if (this.state.inferredPresence) {
        this.device?.log?.(`[INFERENCE] ⏰ Activity timeout - clearing presence`);
        this.state.inferredPresence = false;
        this.state.presenceConfidence = 80;
      }
    }
    return this.state.inferredPresence;
  }

  // Get confidence level (0-100)
  getConfidence() {
    return this.state.presenceConfidence;
  }

  // Main inference calculation
  _recalculatePresence(source, data) {
    const now = Date.now();
    const state = this.state;
    let confidence = 0;
    let presenceIndicators = 0;
    let totalIndicators = 0;

    // Indicator 1: Distance > 0 (strong indicator)
    if (state.lastDistance !== null) {
      totalIndicators += 30;
      if (state.lastDistance > 0 && state.lastDistance < (this.device._lastMaxRange || 6)) {
        presenceIndicators += 30;
        confidence += 30;
      }
    }

    // Indicator 2: Distance changed recently (movement detected)
    if (state.distanceHistory.length >= 2) {
      totalIndicators += 20;
      const recentDistances = state.distanceHistory.slice(-3);
      const hasMovement = recentDistances.some((d, i) =>
        i > 0 && Math.abs(d.value - recentDistances[i - 1].value) > this.params.distanceThreshold
      );
      if (hasMovement) {
        presenceIndicators += 20;
        confidence += 20;
      }
    }

    // Indicator 3: Lux change rate (rapid changes = movement)
    if (state.luxChangeRate > 0) {
      totalIndicators += 15;
      if (state.luxChangeRate > this.params.luxChangeRateThreshold) {
        presenceIndicators += 15;
        confidence += 15;
      }
    }

    // Indicator 4: Recent DP activity (device is reporting data)
    const timeSinceActivity = now - state.lastActivityTime;
    if (timeSinceActivity < 30000) { // Activity in last 30s
      totalIndicators += 15;
      presenceIndicators += 10; // Some activity is normal even without presence
      confidence += 10;
    }

    // Indicator 5: DP1 value (if available and not null)
    if (state.lastPresenceDP !== null && state.lastPresenceDP !== undefined) {
      totalIndicators += 20;
      if (state.lastPresenceDP === 1 || state.lastPresenceDP === 2 || state.lastPresenceDP === true) {
        presenceIndicators += 20;
        confidence += 20;
      }
    }

    // Calculate final confidence
    state.presenceConfidence = totalIndicators > 0
      ? Math.round((presenceIndicators / totalIndicators) * 100)
      : 0;

    // Determine presence based on confidence threshold
    const previousPresence = state.inferredPresence;
    state.inferredPresence = state.presenceConfidence >= this.params.minConfidenceForPresence;
    state.lastInferenceTime = now;

    // Log inference result if changed
    if (previousPresence !== state.inferredPresence) {
      this.device?.log?.(`[INFERENCE] 🎯 ${source}: presence=${state.inferredPresence} ` +
        `(confidence: ${state.presenceConfidence}%, indicators: ${presenceIndicators}/${totalIndicators})`);
      this.device?.log?.(`[INFERENCE] 📊 State: distance=${state.lastDistance?.toFixed(2)}m, ` +
        `luxRate=${state.luxChangeRate?.toFixed(1)}/s, DP1=${state.lastPresenceDP}`);
    }

    return state.inferredPresence;
  }

  // Reset state (e.g., on device restart)
  reset() {
    this.state = {
      lastDistance: null,
      distanceHistory: [],
      distanceTimestamp: 0,
      lastLux: null,
      luxHistory: [],
      luxTimestamp: 0,
      luxChangeRate: 0,
      lastPresenceDP: null,
      inferredPresence: false,
      presenceConfidence: 0,
      lastInferenceTime: 0,
      lastActivityTime: 0,
      dpActivityCount: 0,
      appVersion: this.state.appVersion,
      firmwareType: this.state.firmwareType,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// v5.5.364: INTELLIGENT DP AUTO-DISCOVERY ENGINE
// Automatically detects and learns DP mappings for unknown devices
// Works when manufacturerName is not in any SENSOR_CONFIG
// ═══════════════════════════════════════════════════════════════════════════════
class IntelligentDPAutoDiscovery {
  constructor(device) {
    this.device = device;
    this.discoveredDPs = new Map();  // dpId -> { type, samples, confidence, capability }
    this.learningPhase = true;
    this.learningStartTime = Date.now();
    this.learningDurationMs = 60000;  // 60 seconds learning phase
    this.minSamplesForConfidence = 3;
  }

  /**
   * Analyze incoming DP and infer its type based on value patterns
   */
  analyzeDP(dpId, value) {
    const now = Date.now();

    // Get or create DP entry
    if (!this.discoveredDPs.has(dpId)) {
      this.discoveredDPs.set(dpId, {
        samples: [],
        inferredType: null,
        inferredCapability: null,
        confidence: 0,
        lastValue: null,
        lastUpdate: now
      });
    }

    const dpInfo = this.discoveredDPs.get(dpId);
    dpInfo.samples.push({ value, time: now });
    dpInfo.lastValue = value;
    dpInfo.lastUpdate = now;

    // Keep only last 20 samples
    if (dpInfo.samples.length > 20) {
      dpInfo.samples.shift();
    }

    // Infer type from value patterns
    this._inferDPType(dpId, dpInfo);

    return dpInfo;
  }

  /**
   * Infer DP type based on value patterns
   */
  _inferDPType(dpId, dpInfo) {
    const samples = dpInfo.samples.map(s => s.value);
    if (samples.length < 2) return;

    const numericSamples = samples.filter(v => typeof v === 'number');

    // ─────────────────────────────────────────────────────────────────────────
    // PATTERN 1: PRESENCE/MOTION (boolean-like: 0/1 or 0/1/2 enum)
    // ─────────────────────────────────────────────────────────────────────────
    const uniqueValues = [...new Set(numericSamples)];
    const isPresencePattern =
      uniqueValues.length <= 3 &&
      uniqueValues.every(v => v >= 0 && v <= 2) &&
      (dpId === 1 || dpId === 105 || dpId === 112 || dpId === 104);

    if (isPresencePattern) {
      dpInfo.inferredType = uniqueValues.length === 2 ? 'presence_bool' : 'presence_enum';
      dpInfo.inferredCapability = 'alarm_motion';
      dpInfo.confidence = 90;
      this.device?.log?.(`[AUTO-DISCOVERY] 🎯 DP${dpId} → PRESENCE (${dpInfo.inferredType})`);
      return;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PATTERN 2: DISTANCE (0-1000 cm range, varies gradually)
    // ─────────────────────────────────────────────────────────────────────────
    const avgValue = numericSamples.reduce((a, b) => a + b, 0) / numericSamples.length;
    const maxValue = Math.max(...numericSamples);
    const minValue = Math.min(...numericSamples);
    const range = maxValue - minValue;

    const isDistancePattern =
      (dpId === 9 || dpId === 109 || dpId === 101) &&
      avgValue >= 0 && avgValue <= 1000 &&
      range < 500;  // Distance shouldn't jump wildly

    if (isDistancePattern) {
      // Detect divisor: if max > 100, probably cm (÷100), else dm (÷10) or m (÷1)
      let divisor = 100;
      if (maxValue <= 100) divisor = 10;
      if (maxValue <= 10) divisor = 1;

      dpInfo.inferredType = 'distance';
      dpInfo.inferredCapability = 'measure_distance';
      dpInfo.divisor = divisor;
      dpInfo.confidence = 85;
      this.device?.log?.(`[AUTO-DISCOVERY] 📏 DP${dpId} → DISTANCE (divisor: ${divisor})`);
      return;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PATTERN 3: ILLUMINANCE/LUX (0-2000+ range, can fluctuate)
    // ─────────────────────────────────────────────────────────────────────────
    const isLuxPattern =
      (dpId === 12 || dpId === 102 || dpId === 103 || dpId === 104) &&
      avgValue >= 0 && avgValue <= 10000;

    if (isLuxPattern && dpInfo.inferredCapability !== 'alarm_motion') {
      dpInfo.inferredType = 'lux_direct';
      dpInfo.inferredCapability = 'measure_luminance';
      dpInfo.confidence = 80;
      this.device?.log?.(`[AUTO-DISCOVERY] ☀️ DP${dpId} → ILLUMINANCE (lux)`);
      return;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PATTERN 4: BATTERY (0-100 range, rarely changes)
    // ─────────────────────────────────────────────────────────────────────────
    const isBatteryPattern =
      (dpId === 4 || dpId === 15) &&
      avgValue >= 0 && avgValue <= 100 &&
      range < 20;  // Battery doesn't jump much

    if (isBatteryPattern) {
      dpInfo.inferredType = 'battery';
      dpInfo.inferredCapability = 'measure_battery';
      dpInfo.confidence = 85;
      this.device?.log?.(`[AUTO-DISCOVERY] 🔋 DP${dpId} → BATTERY`);
      return;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PATTERN 5: SENSITIVITY SETTING (1-10 range, static)
    // ─────────────────────────────────────────────────────────────────────────
    const isSensitivityPattern =
      (dpId === 2 || dpId === 101 || dpId === 102 || dpId === 106) &&
      avgValue >= 0 && avgValue <= 10 &&
      range <= 2;

    if (isSensitivityPattern && !dpInfo.inferredCapability) {
      dpInfo.inferredType = 'setting';
      dpInfo.inferredCapability = null;  // Internal setting, no capability
      dpInfo.confidence = 70;
      this.device?.log?.(`[AUTO-DISCOVERY] ⚙️ DP${dpId} → SETTING (sensitivity)`);
      return;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PATTERN 6: RANGE SETTING (0-1000 cm, static)
    // ─────────────────────────────────────────────────────────────────────────
    const isRangePattern =
      (dpId === 3 || dpId === 4 || dpId === 107 || dpId === 108) &&
      avgValue >= 0 && avgValue <= 1000 &&
      range < 50;

    if (isRangePattern && dpInfo.inferredCapability !== 'measure_battery') {
      dpInfo.inferredType = 'range_setting';
      dpInfo.inferredCapability = null;
      dpInfo.confidence = 65;
      this.device?.log?.(`[AUTO-DISCOVERY] 📐 DP${dpId} → RANGE SETTING`);
      return;
    }

    // Unknown pattern - log for diagnostics
    if (!dpInfo.inferredType) {
      dpInfo.inferredType = 'unknown';
      dpInfo.confidence = 0;
      this.device?.log?.(`[AUTO-DISCOVERY] ❓ DP${dpId} → UNKNOWN (avg=${avgValue.toFixed(1)}, range=${range})`);
    }
  }

  /**
   * Get dynamic DP mapping based on discovered patterns
   */
  getDynamicDPMap() {
    const dpMap = {};

    for (const [dpId, info] of this.discoveredDPs) {
      if (info.confidence >= 60 && info.inferredCapability) {
        dpMap[dpId] = {
          cap: info.inferredCapability,
          type: info.inferredType,
          divisor: info.divisor || 1,
          autoDiscovered: true
        };
      }
    }

    return dpMap;
  }

  /**
   * Check if learning phase is complete
   */
  isLearningComplete() {
    const elapsed = Date.now() - this.learningStartTime;
    const hasEnoughData = this.discoveredDPs.size >= 2;
    return elapsed > this.learningDurationMs || hasEnoughData;
  }

  /**
   * Get summary of discovered DPs
   */
  getSummary() {
    const summary = [];
    for (const [dpId, info] of this.discoveredDPs) {
      summary.push({
        dp: dpId,
        type: info.inferredType,
        capability: info.inferredCapability,
        confidence: info.confidence,
        samples: info.samples.length
      });
    }
    return summary;
  }

  /**
   * Apply discovered value to capability
   */
  applyDiscoveredValue(dpId, rawValue) {
    const info = this.discoveredDPs.get(dpId);
    if (!info || !info.inferredCapability || info.confidence < 60) {
      return null;
    }

    let value = rawValue;

    // Apply transforms based on type
    switch (info.inferredType) {
      case 'presence_bool':
        value = rawValue === 1 || rawValue === true;
        break;
      case 'presence_enum':
        value = rawValue === 1 || rawValue === 2;
        break;
      case 'distance':
        value = rawValue / (info.divisor || 100);
        value = Math.round(value * 100) / 100;
        break;
      case 'lux_direct':
        value = Math.max(0, Math.min(10000, rawValue));
        break;
      case 'battery':
        value = Math.max(0, Math.min(100, rawValue));
        break;
    }

    return {
      capability: info.inferredCapability,
      value: value,
      type: info.inferredType,
      confidence: info.confidence
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTELLIGENT SENSOR CONFIGURATION DATABASE
// Each entry defines the specific DP mappings for a manufacturerName
// ═══════════════════════════════════════════════════════════════════════════════

const SENSOR_CONFIGS = {
  // ─────────────────────────────────────────────────────────────────────────────
  // TYPE A: ZY-M100 Standard (most common)
  // DP1=presence(enum), DP2=sensitivity, DP3=near, DP4=far, DP9=distance, DP101-102=sens
  // ─────────────────────────────────────────────────────────────────────────────
  'ZY_M100_STANDARD': {
    sensors: [
      '_TZE200_ges7h5mj', '_TZE204_ges7h5mj',
      '_TZE200_hl0ss9oa', '_TZE204_hl0ss9oa',
      '_TZE200_holel4dk', '_TZE204_holel4dk',
      '_TZE200_sfiy8puu', '_TZE204_sfiy8puu',
      '_TZE200_pnyz5qpy', '_TZE204_pnyz5qpy',
      '_TZE200_qomxlryd', '_TZE204_qomxlryd',
      '_TZE200_xpq2rber', '_TZE204_xpq2rber',
      '_TZE200_ybwa4x5a', '_TZE204_ybwa4x5a',
      '_TZE204_mrf6vtua', '_TZE204_mtoaryre',
      '_TZE204_r0jdjrvi', '_TZE204_rhgsbacq',
      '_TZE204_sfiy5tfs', '_TZE204_wukb7rhc',
      '_TZE204_auin8mzr', '_TZE204_iaeejhvf',
      '_TZE204_ikvncluo', '_TZE204_jva8ink8',
      '_TZE204_lyetpprm', '_TZE204_no6qtgtl',
      // v5.5.363: GitHub Issue #97 - NoroddH Wenzhi TS0225 radar
      '_TZ321C_fkzihaxe8', '_TZ3210_fkzihaxe8',
    ],
    battery: false,
    noTemperature: true,    // v5.5.372: Forum fix - radar sensors have NO temp
    noHumidity: true,       // v5.5.372: Forum fix - radar sensors have NO humidity
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_enum' },      // 0=none, 1=motion, 2=stationary
      2: { cap: null, internal: 'sensitivity' },
      3: { cap: null, internal: 'near_distance' },             // cm
      4: { cap: null, internal: 'far_distance' },              // cm
      9: { cap: 'measure_distance', divisor: 100 },            // cm -> m
      12: { cap: 'measure_luminance', type: 'lux_direct' },    // v5.5.273: Some variants use DP12 for illuminance
      101: { cap: null, internal: 'static_sensitivity' },
      102: { cap: null, internal: 'motion_sensitivity' },
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TYPE B: 24GHz Ceiling Radar (gkfbdvyx variants) - Loginovo M100 C3007
  // Source: ZHA Community https://community.home-assistant.io/t/874026
  // v5.5.266: FIXED - This sensor HAS illuminance on DP103!
  // DP1=presence, DP2=move_sens, DP3=min_dist, DP4=max_dist, DP9=distance
  // DP101=tracking, DP102=presence_sens, DP103=illuminance, DP104=motion_state, DP105=fading
  // ─────────────────────────────────────────────────────────────────────────────
  // v5.5.325: RONNY #782 ULTIMATE FIX - Complete rewrite based on ZHA/Z2M research
  // Sources: ZHA PR#4044, HA Community t/874026, Z2M converters, SmartHomeScene review
  // CONFIRMED DP MAPPINGS from ZHA quirk:
  // DP1: presence_state ENUM (0=none/false, 1=presence/true, 2=move/true) - NOT BOOLEAN!
  // DP2: move_sensitivity (1-10)
  // DP3: detection_distance_min (×0.01m = cm to m)
  // DP4: detection_distance_max (×0.01m = cm to m)
  // DP9: target_distance (×0.1m = dm to m)
  // DP101: distance_tracking (switch)
  // DP102: presence_sensitivity (1-10)
  // DP103: illuminance (direct lux, 0-2000)
  // DP104: motion_state (enum: none/presence/move)
  // DP105: fading_time (5-15000 seconds)
  // ─────────────────────────────────────────────────────────────────────────────
  'ZY_M100_CEILING_24G': {
    configName: 'ZY_M100_CEILING_24G',
    sensors: [
      '_TZE200_gkfbdvyx', '_TZE204_gkfbdvyx',
    ],
    battery: false,
    mainsPowered: true,
    noBatteryCapability: true,  // v5.5.325: Force remove battery capability
    hasIlluminance: true,
    noTemperature: true,    // v5.5.377: 24GHz ceiling radar has NO temp sensor (ZHA t/874026)
    noHumidity: true,       // v5.5.377: 24GHz ceiling radar has NO humidity sensor
    needsPolling: false,  // v5.5.325: Disable polling - use DP reports only
    ultraAggressiveDebounce: true,  // v5.5.325: Maximum filtering for false positives
    // v5.5.357: RONNY FORUM FIX - Disable ALL battery reporting (causes spam)
    disableBatteryReporting: true,  // Prevent battery low/ok spam every 30s
    suppressBatteryCapability: true,  // Never report battery
    invertPresence: false,  // v5.5.325: ZHA confirms NO inversion needed with correct enum handling
    presenceEnumMapping: { 0: false, 1: true, 2: true },  // v5.5.325: Correct enum->boolean mapping
    dpMap: {
      // v5.5.325: PRESENCE - DP1 is ENUM not boolean!
      // 0=none (no presence), 1=presence (detected), 2=move (moving detected)
      1: { cap: 'alarm_motion', type: 'presence_enum_gkfbdvyx', enumMap: { 0: false, 1: true, 2: true } },

      // v5.5.325: SETTINGS DPs (internal, not exposed)
      2: { cap: null, internal: 'move_sensitivity' },        // 1-10
      3: { cap: null, internal: 'detection_distance_min', divisor: 100 },  // cm -> m
      4: { cap: null, internal: 'detection_distance_max', divisor: 100 },  // cm -> m

      // v5.5.325: DISTANCE - DP9 primary, ×0.1 = dm to meters
      9: { cap: 'measure_distance', divisor: 10 },

      // v5.5.325: MORE SETTINGS
      101: { cap: null, internal: 'distance_tracking' },     // switch
      102: { cap: null, internal: 'presence_sensitivity' },  // 1-10

      // v5.5.325: ILLUMINANCE - DP103 is DIRECT LUX (0-2000)
      103: { cap: 'measure_luminance', type: 'lux_direct' },

      // v5.5.325: MOTION STATE - DP104 is fallback presence enum
      104: { cap: 'alarm_motion', type: 'presence_enum_gkfbdvyx', enumMap: { 0: false, 1: true, 2: true } },

      // v5.5.325: FADING TIME
      105: { cap: null, internal: 'fading_time' },           // 5-15000 sec
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TYPE B2: SIMPLE PRESENCE with duration tracking (from ChatGPT Z2M analysis)
  // These expose: presence, duration_of_attendance, duration_of_absence, led_state
  // Source: Z2M converters + Reddit r/homeassistant
  // ─────────────────────────────────────────────────────────────────────────────
  'ZY_M100_SIMPLE': {
    sensors: [
      '_TZE200_0u3bj3rc', '_TZE200_mx6u6l4y', '_TZE200_v6ossqfy',
      // v5.5.281: Added from Z2M research
      '_TZE200_3towulqd', '_TZE204_3towulqd',
      '_TZE200_1ibpyhdc', '_TZE204_1ibpyhdc',
    ],
    battery: false,
    hasIlluminance: false,
    noTemperature: true,    // v5.5.372: Forum fix - no temp sensor
    noHumidity: true,       // v5.5.372: Forum fix - no humidity sensor
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      // v5.5.281: Duration tracking from ChatGPT analysis
      101: { cap: null, internal: 'duration_of_attendance' },  // seconds present
      102: { cap: null, internal: 'duration_of_absence' },     // seconds absent
      // v5.5.281: LED state control (some sensors have this)
      103: { cap: null, internal: 'led_state' },               // 0=off, 1=on
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TYPE C: ZG-204ZM Battery (sleepy EndDevice)
  // DP1=presence(bool), DP4=battery, DP9=illuminance, DP15=battery_alt
  // ─────────────────────────────────────────────────────────────────────────────
  'ZG_204ZM_BATTERY': {
    sensors: [
      '_TZE200_2aaelwxk', '_TZE204_2aaelwxk',
      '_TZE200_kb5noeto',
    ],
    battery: true,
    noTemperature: true,    // v5.5.368: 4x4_Pete fix - device has NO temp sensor
    noHumidity: true,       // v5.5.368: 4x4_Pete fix - device has NO humidity sensor
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      4: { cap: 'measure_battery', divisor: 1 },
      9: { cap: 'measure_luminance', divisor: 1 },
      15: { cap: 'measure_battery', divisor: 1 },
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TYPE C2: ZG-204ZL PIR Only (no radar) - Battery powered
  // v5.5.329: Added per forum request #788 (4x4_Pete)
  // Source: https://github.com/Koenkk/zigbee2mqtt/issues/12364
  // DP1=PIR state, DP4=battery, DP9=sensitivity, DP10=keep_time, DP12=illuminance
  // NOTE: Device only has motion + illuminance - NO temperature/humidity!
  // ─────────────────────────────────────────────────────────────────────────────
  'ZG_204ZL_PIR': {
    sensors: [
      '_TZE200_3towulqd', '_TZE200_1ibpyhdc', '_TZE200_bh3n6gk8',
    ],
    battery: true,
    hasIlluminance: true,
    noTemperature: true,    // v5.5.329: Explicitly no temperature
    noHumidity: true,       // v5.5.329: Explicitly no humidity
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      4: { cap: 'measure_battery', divisor: 1 },
      9: { cap: null, internal: 'sensitivity' },        // Low/Medium/High
      10: { cap: null, internal: 'keep_time' },         // 10/30/60/120s
      12: { cap: 'measure_luminance', type: 'lux_direct' },  // Max 1000 lux
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TYPE D: ZY-M100-S_2 LOW DP VARIANTS (Ronny #760 + Z2M #27212, #30326)
  // v5.5.326: RONNY #760 ULTIMATE FIX - Complete rewrite based on Z2M/ZHA research
  // Sources: Z2M #27212, #30326, #8939, ZHA #3969, HA t/862007
  // CRITICAL: appVersion 78 has presence=null bug - use distance-based inference
  // CRITICAL: Lux oscillates 30-2000 rapidly - use ultra-aggressive smoothing
  // ─────────────────────────────────────────────────────────────────────────────
  'TZE284_IADRO9BF': {
    configName: 'TZE284_IADRO9BF',
    sensors: [
      '_TZE284_iadro9bf',
      '_TZE204_iadro9bf',
      '_TZE204_qasjif9e',
      '_TZE284_qasjif9e',
      '_TZE204_ztqnh5cg',
      '_TZE284_ztqnh5cg',
      '_TZE204_sbyx0lm6',
      '_TZE284_sbyx0lm6',
    ],
    battery: false,
    mainsPowered: true,
    noBatteryCapability: true,  // v5.5.326: Force remove battery
    hasIlluminance: true,
    noTemperature: true,    // v5.5.377: mmWave radar has NO temp sensor (Z2M #27212, #30326)
    noHumidity: true,       // v5.5.377: mmWave radar has NO humidity sensor
    needsPolling: false,  // v5.5.326: Disable polling - rely on inference only
    invertPresence: false,
    // v5.5.326: RONNY #760 - Enhanced intelligent inference
    useIntelligentInference: true,
    useDistanceInference: true,
    useAggressivePolling: false,  // v5.5.326: Polling causes more issues
    needsTimeSync: false,
    // v5.5.326: Ultra-aggressive lux smoothing for 30-2000 oscillation
    ultraAggressiveLuxSmoothing: true,
    luxSmoothingWindowMs: 120000,  // 2 minutes smoothing window
    luxOscillationLock: true,  // Lock lux value when oscillation detected
    // v5.5.326: Ultra-aggressive presence debouncing
    ultraAggressiveDebounce: true,
    // v5.5.326: Firmware quirks - v78 has presence=null bug
    firmwareQuirks: {
      74: { presenceWorking: true, inferenceWeight: 0.2 },
      78: { presenceWorking: false, inferenceWeight: 1.0 },  // v5.5.326: Full inference for v78
    },
    dpMap: {
      // v5.5.326: DP1 presence is UNRELIABLE (often null on v78)
      // Use distance-based inference instead
      1: { cap: 'alarm_motion', type: 'presence_bool', useInference: true, unreliable: true },
      2: { cap: null, internal: 'radar_sensitivity' },
      3: { cap: null, internal: 'min_range', divisor: 100 },
      4: { cap: null, internal: 'max_range', divisor: 100, feedInference: true },
      6: { cap: null, internal: 'self_test' },
      // v5.5.326: DP9 is KEY for presence inference - distance > 0 = presence
      9: { cap: 'measure_distance', divisor: 100, feedInference: true, primaryInference: true },
      // v5.5.326: Lux DPs - all have oscillation issues, use ultra-smoothing
      12: { cap: 'measure_luminance', type: 'lux_direct', ultraSmooth: true },
      101: { cap: null, internal: 'detection_delay', divisor: 10 },
      102: { cap: 'measure_luminance', type: 'lux_direct', ultraSmooth: true },
      104: { cap: 'measure_luminance', type: 'lux_direct', ultraSmooth: true },
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TYPE D2: HIGH DP VARIANTS (105, 109, 112) - NOT for _TZE284_iadro9bf!
  // v5.5.282: REMOVED _TZE284_qasjif9e (uses LOW DPs like iadro9bf)
  // ─────────────────────────────────────────────────────────────────────────────
  'TZE284_SERIES_HIGH_DP': {
    sensors: [
      // TZE284 variants with HIGH DP layout (CONFIRMED)
      '_TZE284_n5q2t8na', '_TZE284_ztc6ggyl',
      '_TZE284_ijxvkhd0', '_TZE284_sxm7l9xa',
      '_TZE284_xsm7l9xa', '_TZE284_yrwmnya3',
      // TZE204 variants with HIGH DP layout
      '_TZE204_ijxvkhd0', '_TZE204_e5m9c5hl',
      '_TZE204_kyhbrfyl', '_TZE204_ex3rcdha',
    ],
    battery: false,
    hasIlluminance: true,
    needsPolling: true,
    noTemperature: true,    // v5.5.372: Forum fix - no temp sensor
    noHumidity: true,       // v5.5.372: Forum fix - no humidity sensor
    dpMap: {
      // Also try DP1 as fallback
      1: { cap: 'alarm_motion', type: 'presence_enum', fallback: true },
      104: { cap: 'measure_luminance', type: 'lux_direct' },
      105: { cap: 'alarm_motion', type: 'presence_enum' },
      106: { cap: null, internal: 'motion_sensitivity' },
      107: { cap: null, internal: 'max_range', divisor: 100 },
      108: { cap: null, internal: 'min_range', divisor: 100 },
      109: { cap: 'measure_distance', divisor: 100 },
      110: { cap: null, internal: 'fading_time', divisor: 10 },
      111: { cap: null, internal: 'detection_delay', divisor: 10 },
      112: { cap: 'alarm_motion', type: 'presence_bool' },
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TYPE D2: ZY-M100-S_1 Side Wall (different DPs than S_2!)
  // Source: Z2M #21730 - user external converter
  // DP104=illuminance, DP105=presence(bool), DP106=sensitivity, DP107=max_range
  // DP108=min_range, DP109=distance, DP110=fading, DP111=detection_delay
  // ─────────────────────────────────────────────────────────────────────────────
  'ZY_M100_S1_SIDEALL': {
    sensors: [
      // Side wall version has different DP layout
      // Z2M uses 'trueFalse1' for DP105 (bool not enum)
    ],
    battery: false,
    hasIlluminance: true,
    needsPolling: true,
    noTemperature: true,    // v5.5.372: Forum fix - no temp sensor
    noHumidity: true,       // v5.5.372: Forum fix - no humidity sensor
    dpMap: {
      104: { cap: 'measure_luminance', type: 'lux_direct' },
      105: { cap: 'alarm_motion', type: 'presence_bool' },  // trueFalse1 in Z2M
      106: { cap: null, internal: 'radar_sensitivity' },
      107: { cap: null, internal: 'max_range', divisor: 100 },
      108: { cap: null, internal: 'min_range', divisor: 100 },
      109: { cap: 'measure_distance', divisor: 100 },
      110: { cap: null, internal: 'fading_time', divisor: 10 },
      111: { cap: null, internal: 'detection_delay', divisor: 10 },
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TYPE E: 7gclukjs variant (fall detection)
  // DP1=presence, DP2=sensitivity, DP101=distance, DP102=illuminance, DP112=presence_alt
  // ─────────────────────────────────────────────────────────────────────────────
  'FALL_DETECTION': {
    sensors: [
      '_TZE200_7gclukjs', '_TZE204_7gclukjs',
    ],
    battery: false,
    noTemperature: true,    // v5.5.372: Forum fix - no temp sensor
    noHumidity: true,       // v5.5.372: Forum fix - no humidity sensor
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_enum' },
      2: { cap: null, internal: 'sensitivity' },
      101: { cap: 'measure_distance', divisor: 100 },
      102: { cap: 'measure_luminance', divisor: 1 },
      112: { cap: 'alarm_motion', type: 'presence_enum' },
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TYPE F: laokfqwu/ztqnh5cg (illuminance focused)
  // DP1=presence, DP6=fading, DP9=illuminance, DP101=target_distance
  // ─────────────────────────────────────────────────────────────────────────────
  'ILLUMINANCE_FOCUS': {
    sensors: [
      '_TZE200_laokfqwu', '_TZE204_laokfqwu',
      '_TZE200_ztqnh5cg',
      '_tze200_y4mdop0b',
    ],
    battery: false,
    noTemperature: true,    // v5.5.372: Forum fix - no temp sensor
    noHumidity: true,       // v5.5.372: Forum fix - no humidity sensor
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      6: { cap: null, internal: 'fading_time' },
      9: { cap: 'measure_luminance', divisor: 1 },
      101: { cap: 'measure_distance', divisor: 100 },
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TYPE F2: ZY-M100-24G (24GHz radar, reports every second!)
  // Source: Z2M ZY-M100-24G page - WARNING: Can overwhelm Zigbee network
  // ─────────────────────────────────────────────────────────────────────────────
  'ZY_M100_24G_SPAM': {
    sensors: [
      // These sensors report every second - can cause network issues
      // See Z2M note: https://github.com/Koenkk/zigbee2mqtt/issues/19045
    ],
    battery: false,
    hasIlluminance: true,
    reportsFrequently: true,  // Warning flag
    noTemperature: true,    // v5.5.372: Forum fix - no temp sensor
    noHumidity: true,       // v5.5.372: Forum fix - no humidity sensor
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_enum' },
      104: { cap: 'measure_luminance', type: 'lux_direct' },
      109: { cap: 'measure_distance', divisor: 100 },
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TYPE G: ZG-204ZM PIR + 24GHz Radar Battery Sensor
  // v5.5.395: ENHANCED per 4x4_Pete forum post + Z2M full spec
  // Source: https://www.zigbee2mqtt.io/devices/ZG-204ZM.html
  // Source: https://github.com/Koenkk/zigbee2mqtt/issues/21919
  // Features: PIR + 24GHz radar hybrid, battery powered, illuminance
  //
  // Z2M COMPLETE DP MAPPING:
  // DP1=presence (bool), DP2=motion_sensitivity (0-10), DP4=static_detection_distance (m)
  // DP101=motion_state (enum: 0=none,1=large,2=small,3=static)
  // DP102=fading_time (0-28800s), DP103=static_detection_sensitivity (0-10)
  // DP104=motion_detection_mode (enum: 0=only_pir, 1=pir_and_radar, 2=only_radar)
  // DP106=illuminance (lux), DP107=indicator (bool on/off)
  // DP108=small_detection_distance, DP109=small_detection_sensitivity
  // DP15=battery (%)
  //
  // WARNING: _TZE200_kb5noeto may get stuck in "presence detected" state
  // ─────────────────────────────────────────────────────────────────────────────
  'ZG_204ZM_RADAR': {
    sensors: [
      '_TZE200_2aaelwxk', '_TZE200_kb5noeto', '_TZE200_tyffvoij',
      'HOBEIAN',  // v5.5.395: Added per 4x4_Pete forum interview
    ],
    battery: true,
    hasIlluminance: true,
    noTemperature: true,    // v5.5.368: 4x4_Pete fix - device has NO temp sensor
    noHumidity: true,       // v5.5.368: 4x4_Pete fix - device has NO humidity sensor
    // v5.5.395: Settings that can be written to device
    writableDPs: [2, 4, 102, 103, 104, 107],
    dpMap: {
      // ═══════════════════════════════════════════════════════════════════
      // PRESENCE DETECTION
      // ═══════════════════════════════════════════════════════════════════
      1: { cap: 'alarm_motion', type: 'presence_bool' },           // presence (binary)
      101: { cap: 'alarm_motion', type: 'motion_state_enum' },     // motion_state: 0=none, 1=large, 2=small, 3=static

      // ═══════════════════════════════════════════════════════════════════
      // ILLUMINANCE
      // ═══════════════════════════════════════════════════════════════════
      106: { cap: 'measure_luminance', type: 'lux_direct' },       // illuminance (lux)

      // ═══════════════════════════════════════════════════════════════════
      // BATTERY
      // ═══════════════════════════════════════════════════════════════════
      4: { cap: 'measure_battery', divisor: 1 },                   // battery %
      15: { cap: 'measure_battery', divisor: 1 },                  // battery % (alternate)

      // ═══════════════════════════════════════════════════════════════════
      // SETTINGS (internal, writable via settings)
      // ═══════════════════════════════════════════════════════════════════
      2: { cap: null, setting: 'motion_detection_sensitivity', min: 0, max: 10 },  // motion sensitivity
      102: { cap: null, setting: 'fading_time', min: 0, max: 28800 },              // presence keep time (s)
      103: { cap: null, setting: 'static_detection_sensitivity', min: 0, max: 10 }, // static sensitivity
      104: { cap: null, setting: 'motion_detection_mode' },                        // 0=pir, 1=pir+radar, 2=radar
      107: { cap: null, setting: 'indicator' },                                    // LED on/off

      // ═══════════════════════════════════════════════════════════════════
      // DISTANCE SETTINGS (read-only for now)
      // ═══════════════════════════════════════════════════════════════════
      108: { cap: null, internal: 'small_detection_distance', divisor: 100 },      // m
      109: { cap: null, internal: 'small_detection_sensitivity' },                 // 0-10
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TYPE H: TZ3000 PIR Sensors (standard PIR, not radar)
  // Uses ZCL occupancy cluster primarily
  // ─────────────────────────────────────────────────────────────────────────────
  'TZ3000_PIR': {
    sensors: [
      '_TZ3000_8bxrzyxz', '_TZ3000_aigddb2b',
      '_TZ3000_ky0fq4ho',
      // Note: _TZ3210_fkzihax8 and _TZ321C_fkzihax8 (without 'e') are PIR
      // _TZ321C_fkzihaxe8 (with 'e') is Wenzhi radar -> ZY_M100_STANDARD
      '_TZ3210_fkzihax8', '_TZ321C_fkzihax8',
    ],
    battery: true,
    useZcl: true,
    noTemperature: true,    // v5.5.372: Forum fix - PIR sensors have NO temp
    noHumidity: true,       // v5.5.372: Forum fix - PIR sensors have NO humidity
    dpMap: {
      // PIR uses ZCL occupancy, not Tuya DPs
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // v5.5.278: DEFAULT fallback config (generic DP mappings)
  // Applied when manufacturerName not found in any config
  // Uses common DPs that work for most sensors
  // ─────────────────────────────────────────────────────────────────────────────
  'DEFAULT': {
    sensors: [],
    configName: 'DEFAULT',
    battery: false,
    hasIlluminance: true,
    needsPolling: true,  // Poll unknown devices
    noTemperature: true,    // v5.5.372: Forum fix - default to no temp (can be added back if detected)
    noHumidity: true,       // v5.5.372: Forum fix - default to no humidity
    dpMap: {
      // Try all common presence DPs
      1: { cap: 'alarm_motion', type: 'presence_enum' },
      // Low DPs (ZY-M100 standard)
      9: { cap: 'measure_distance', divisor: 100 },
      12: { cap: 'measure_luminance', type: 'lux_direct' },
      // High DPs (TZE284 series)
      104: { cap: 'measure_luminance', type: 'lux_direct' },
      105: { cap: 'alarm_motion', type: 'presence_enum' },
      109: { cap: 'measure_distance', divisor: 100 },
      112: { cap: 'alarm_motion', type: 'presence_bool' },
    }
  },
};

// Build reverse lookup: manufacturerName -> config
const MANUFACTURER_CONFIG_MAP = {};
for (const [configName, config] of Object.entries(SENSOR_CONFIGS)) {
  for (const mfr of config.sensors) {
    MANUFACTURER_CONFIG_MAP[mfr] = { ...config, configName };
  }
}

// Get sensor config by manufacturerName
function getSensorConfig(manufacturerName) {
  // v5.5.286: RONNY FIX - Enhanced matching for TZE284/TZE204 series
  // When exact match fails, try pattern matching for known problematic series

  // Try exact match first
  if (MANUFACTURER_CONFIG_MAP[manufacturerName]) {
    return MANUFACTURER_CONFIG_MAP[manufacturerName];
  }

  // v5.5.286: Pattern matching for TZE284_iadro9bf variants
  // Ronny report: manufacturerName can be empty or slightly different
  if (manufacturerName) {
    const mfrLower = manufacturerName.toLowerCase();

    // Match TZE284/TZE204 iadro9bf variants (presence inversion needed)
    if (mfrLower.includes('iadro9bf') || mfrLower.includes('qasjif9e') ||
      mfrLower.includes('ztqnh5cg') || mfrLower.includes('sbyx0lm6')) {
      console.log(`[RADAR] 🔍 Pattern match: ${manufacturerName} → TZE284_IADRO9BF config`);
      return { ...SENSOR_CONFIGS.TZE284_IADRO9BF, configName: 'TZE284_IADRO9BF' };
    }
  }

  // v5.5.278: Use DEFAULT config for unknown devices
  return SENSOR_CONFIGS.DEFAULT;
}

// Transform presence value based on type
// v5.5.306: RONNY FIX #760 - Fixed this.log() bug in standalone function
// BUG: transformPresence was using this.log() but it's not a class method!
function transformPresence(value, type, invertPresence = false, configName = '') {
  let result;

  // v5.5.306: Handle null/undefined FIRST before any processing
  if (value === null || value === undefined) {
    console.log(`[PRESENCE-FIX] ⚠️ NULL/undefined presence for ${configName}, defaulting to false`);
    return invertPresence ? true : false;  // If inverted, null means presence
  }

  switch (type) {
    case 'presence_enum':
      // 0=none, 1=motion, 2=stationary -> true if motion or stationary
      result = value === 1 || value === 2;
      break;
    case 'presence_enum_gkfbdvyx':
      // v5.5.325: RONNY #782 - Specific handler for _TZE204_gkfbdvyx
      // ZHA confirmed: 0=none (false), 1=presence (true), 2=move (true)
      // But value 2 (move) triggers spuriously from radar noise - treat with caution
      if (value === 0) {
        result = false;
      } else if (value === 1) {
        result = true;  // Confirmed presence
      } else if (value === 2) {
        // v5.5.325: "move" state is unreliable - log but still map to true
        // The debouncing will filter out spurious reports
        console.log(`[PRESENCE-FIX] 🚶 gkfbdvyx: move state (2) detected - may be radar noise`);
        result = true;
      } else {
        console.log(`[PRESENCE-FIX] ⚠️ gkfbdvyx: unknown enum value ${value}`);
        result = false;
      }
      break;
    case 'presence_bool':
      // v5.5.306: CRITICAL FIX - value=0 means NO presence, value=1 means presence
      result = value === 1 || value === true || value === 'presence';
      break;
    case 'motion_state_enum':
      // v5.5.328: ZG-204ZM motion state enum
      // 0=none (no presence), 1=large, 2=medium, 3=small (all indicate presence)
      result = value === 1 || value === 2 || value === 3;
      break;
    case 'presence_string':
      result = value === 'motion' || value === 'stationary' || value === 'presence';
      break;
    default:
      result = !!value;
  }

  // v5.5.306: CRITICAL FIX - Reinforced presence inversion
  // Based on Ronny #760: alarm_motion always YES for _TZE284_iadro9bf
  // TZE284_IADRO9BF firmware bug: shows active when empty, inactive when occupied
  if (invertPresence) {
    const inverted = !result;
    console.log(`[PRESENCE-FIX] 🔄 INVERTING presence for ${configName}: raw=${value} -> parsed=${result} -> final=${inverted}`);
    return inverted;  // INVERT the result for buggy firmware
  }

  return result;
}

// v5.5.319: ENHANCED Presence debouncing for _TZE204_gkfbdvyx (Ronny #765)
// Problem: "turns on random even when nobody is in the room"
// Solution: Require 3 consecutive same-state reports AND minimum time gap
// Also add hysteresis: harder to turn ON than to turn OFF
function debouncePresence(presence, manufacturerName, deviceId) {
  if (!deviceId || !manufacturerName.includes('gkfbdvyx')) {
    return presence;  // No debouncing for other devices
  }

  const now = Date.now();
  const state = presenceDebounceState.get(deviceId) || {
    lastPresence: null,
    stablePresence: false,  // Current stable output
    stableCount: 0,
    lastChangeTime: 0,
    onCount: 0,  // Track consecutive ON reports
    offCount: 0  // Track consecutive OFF reports
  };

  // Track consecutive ON/OFF reports separately
  if (presence) {
    state.onCount++;
    state.offCount = 0;
  } else {
    state.offCount++;
    state.onCount = 0;
  }

  // v5.5.438: BALANCED debouncing for gkfbdvyx (Ronny feedback: too slow)
  // Problem: v5.5.325 was too aggressive (7 counts + 15s = very slow response)
  // Solution: Reduce to 3 counts + 5s for faster response while still filtering noise
  // User can adjust sensitivity in device settings if needed
  const requiredOnCount = 3;   // v5.5.438: Reduced from 7 to 3 (faster response)
  const requiredOffCount = 2;

  // v5.5.438: Reduced minimum time between state changes (5 seconds for ON)
  // This allows faster detection while still preventing rapid false-positive cycles
  const minStateChangeInterval = 5000;  // v5.5.438: Reduced from 15s to 5s
  const timeSinceLastChange = now - state.lastChangeTime;

  let newStablePresence = state.stablePresence;

  if (presence && state.onCount >= requiredOnCount && timeSinceLastChange >= minStateChangeInterval) {
    // Turn ON: requires 3 consecutive reports + 5s since last change
    if (!state.stablePresence) {
      console.log(`[PRESENCE-DEBOUNCE] ✅ ${manufacturerName}: ON confirmed (${state.onCount} consecutive, ${timeSinceLastChange}ms gap)`);
      newStablePresence = true;
      state.lastChangeTime = now;
    }
  } else if (!presence && state.offCount >= requiredOffCount) {
    // Turn OFF: requires only 2 consecutive reports (faster response)
    if (state.stablePresence) {
      console.log(`[PRESENCE-DEBOUNCE] ✅ ${manufacturerName}: OFF confirmed (${state.offCount} consecutive)`);
      newStablePresence = false;
      state.lastChangeTime = now;
    }
  } else {
    // Not enough consecutive reports - keep stable state
    console.log(`[PRESENCE-DEBOUNCE] 🔇 ${manufacturerName}: ignoring (ON=${state.onCount}/${requiredOnCount}, OFF=${state.offCount}/${requiredOffCount})`);
  }

  state.stablePresence = newStablePresence;
  state.lastPresence = presence;
  presenceDebounceState.set(deviceId, state);

  return newStablePresence;
}

// v5.5.314: Presence debouncing state (prevents random on/off)
// Ronny forum #775: _TZE204_gkfbdvyx sending presence randomly
const presenceDebounceState = new Map();  // deviceId -> { lastPresence, timestamp, stableCount }

// v5.5.316: REGRESSION FIX - Restored proper lux handling
// Research: Z2M #27212 shows _TZE284_iadro9bf reports direct lux (e.g., 282), NOT raw ADC
// v5.5.314: Ultra-aggressive lux smoothing for oscillating sensors
// Problem: _TZE284_iadro9bf flips between 30 and 2000 lux every few seconds
// Solution: 60s smoothing window + oscillation detection
// v5.5.357: RONNY FORUM FIX - Enhanced oscillation lock for 30↔2000 flip
function transformLux(rawValue, type, manufacturerName = '', deviceId = null) {
  // v5.5.316: Direct lux reporting confirmed (no conversion needed)
  let lux = typeof rawValue === 'number' ? rawValue : 0;

  // v5.5.357: HARD CLAMP to 2000 max AND detect 30↔2000 oscillation
  if (lux > 2000) {
    console.log(`[LUX] 🔒 Clamped ${lux} -> 2000 (max spec limit)`);
    lux = 2000;
  }

  // v5.5.357: OSCILLATION DETECTION - Lock value when 30↔2000 flip detected
  if (!luxOscillationState.has(deviceId)) {
    luxOscillationState.set(deviceId, {
      history: [],
      locked: false,
      lockedValue: null,
      lockTime: 0
    });
  }
  const oscState = luxOscillationState.get(deviceId);

  // Track recent values
  oscState.history.push({ value: lux, time: Date.now() });
  if (oscState.history.length > 5) oscState.history.shift();

  // Detect oscillation pattern: 30→2000→30 within 30 seconds
  if (oscState.history.length >= 3) {
    const recent = oscState.history.slice(-3);
    const hasLowValue = recent.some(r => r.value < 100);
    const hasHighValue = recent.some(r => r.value > 1500);
    const timeSpan = recent[recent.length - 1].time - recent[0].time;

    if (hasLowValue && hasHighValue && timeSpan < 30000) {
      if (!oscState.locked) {
        // First oscillation detected - lock to the LOWER stable value
        const stableValue = recent.find(r => r.value < 100)?.value || 30;
        oscState.locked = true;
        oscState.lockedValue = stableValue;
        oscState.lockTime = Date.now();
        console.log(`[LUX] 🔒 OSCILLATION DETECTED: Locking to ${stableValue} lux (pattern: ${recent.map(r => r.value).join('→')})`);
      }
    }
  }

  // If locked, return locked value for next 2 minutes
  if (oscState.locked) {
    const lockDuration = Date.now() - oscState.lockTime;
    if (lockDuration < 120000) { // 2 minutes lock
      console.log(`[LUX] 🔒 LOCKED: Using ${oscState.lockedValue} instead of ${lux} (${Math.round(lockDuration / 1000)}s into lock)`);
      lux = oscState.lockedValue;
    } else {
      // Lock expired
      console.log(`[LUX] 🔓 LOCK EXPIRED after 2 minutes, returning to normal`);
      oscState.locked = false;
      oscState.lockedValue = null;
    }
  }

  // v5.5.318: NaN/undefined protection - return 0 for invalid values
  if (lux === null || lux === undefined || typeof lux !== 'number' || isNaN(lux)) {
    console.log(`[LUX-FIX] ⚠️ Invalid lux value (${lux}) for ${manufacturerName}, returning 0`);
    return 0;
  }

  let originalValue = lux;

  // v5.5.264: Handle different lux types
  if (type === 'lux_raw') {
    // Raw ADC value - apply conversion ONLY for sensors that actually need it
    // Based on Z2M issue #18950: some sensors report raw ADC values
    if (value > 0) {
      lux = Math.round(value / 10);
    } else {
      lux = 0;
    }
  }
  else if (type === 'lux_direct') {
    // v5.5.316: Most Tuya sensors report direct lux - NO conversion needed
    // Z2M #27212: _TZE284_iadro9bf reports "illuminance": 282 (direct lux)
    lux = value;
  }
  else if (type === 'lux_div10') {
    lux = value / 10;
  }

  // v5.5.316: SMART MAX LUX - Different sensors have different ranges
  // ZY-M100: 0-2000 lux (SmartHomeScene review)
  // Some industrial sensors: up to 10000 lux
  let maxLux = 10000;  // Default high limit - don't clamp unless really needed

  // v5.5.316: Only apply strict 2000 limit for KNOWN ZY-M100 series sensors
  const isZYM100Series = manufacturerName.includes('iadro9bf') ||
    manufacturerName.includes('gkfbdvyx') ||
    manufacturerName.includes('qasjif9e') ||
    manufacturerName.includes('sxm7l9xa');
  if (isZYM100Series) {
    maxLux = 2000;  // ZY-M100 confirmed 0-2000 lux range
  }

  // v5.5.316: FIXED - Only auto-detect raw ADC for values > 50000 (clearly wrong)
  // Previous bug: ÷100 if > 10000 broke sensors reporting legitimate high lux
  if (lux > 50000) {
    const converted = Math.round(lux / 100);
    console.log(`[LUX-FIX] 📊 Extreme value detected for ${manufacturerName}: ${originalValue} -> ${converted} lux`);
    lux = converted;
  }

  // v5.5.320: HARD CLAMP for ZY-M100 series (Ronny #760: lux showing 2200 when max is 2000)
  // These sensors are confirmed 0-2000 lux range - anything above is sensor noise
  if (lux > maxLux && isZYM100Series) {
    console.log(`[LUX-FIX] 🔒 Hard clamp for ZY-M100: ${lux} → ${maxLux} lux`);
    lux = maxLux;
  } else if (lux > maxLux) {
    // For other sensors, still allow higher values but warn
    console.log(`[LUX-FIX] ⚠️ Value ${lux} exceeds ${maxLux} for ${manufacturerName} (allowing)`);
  }

  lux = Math.max(0, Math.round(lux));

  // v5.5.319: AGGRESSIVE LUX SMOOTHING for known problematic sensors
  // Ronny #775: _TZE284_iadro9bf still oscillating 30↔2000 every 15 seconds
  // Solution: Once flip-flop is detected, lock to stable value for 60 seconds
  if (deviceId && isZYM100Series) {
    const state = luxSmoothingState.get(deviceId) || {
      lastLux: null,
      stableLux: null,  // v5.5.319: Track stable value
      timestamp: 0,
      extremeCount: 0,
      lockedUntil: 0    // v5.5.319: Lock period after flip-flop detection
    };
    const now = Date.now();
    const timeSinceLastUpdate = now - state.timestamp;

    // v5.5.319: If we're in locked mode, always return stable value
    if (state.lockedUntil > now && state.stableLux !== null) {
      console.log(`[LUX-SMOOTH] 🔒 Locked mode: returning stable ${state.stableLux} (ignoring ${lux})`);
      return state.stableLux;
    }

    if (state.lastLux !== null) {
      // v5.5.319: Detect extreme oscillation (30↔2000 pattern from Ronny report)
      const isExtremeLow = lux < 100;
      const isExtremeHigh = lux > 1500;
      const wasExtremeLow = state.lastLux < 100;
      const wasExtremeHigh = state.lastLux > 1500;

      // Detect flip-flop pattern
      const isFlipFlop = (isExtremeLow && wasExtremeHigh) || (isExtremeHigh && wasExtremeLow);

      if (isFlipFlop && timeSinceLastUpdate < 30000) {
        state.extremeCount++;
        console.log(`[LUX-SMOOTH] ⚠️ Flip-flop #${state.extremeCount}: ${state.lastLux} ↔ ${lux}`);

        if (state.extremeCount >= 1) {
          // v5.5.326: RONNY #760 - Ultra-aggressive lock for iadro9bf (2 minutes)
          const isIadro9bf = manufacturerName.includes('iadro9bf');
          const lockDuration = isIadro9bf ? 120000 : 60000;  // 2min for iadro9bf, 1min for others
          state.stableLux = Math.min(state.lastLux, lux);
          state.lockedUntil = now + lockDuration;
          console.log(`[LUX-SMOOTH] 🔒 Locking to ${state.stableLux} for ${lockDuration / 1000}s (flip-flop, iadro9bf=${isIadro9bf})`);
          luxSmoothingState.set(deviceId, state);
          return state.stableLux;
        }
      } else if (timeSinceLastUpdate > 120000) {
        // v5.5.326: Reset after 2 minutes of no flip-flop (was 60s)
        state.extremeCount = 0;
        state.stableLux = null;
        state.lockedUntil = 0;
      }
    }

    // Update smoothing state
    state.lastLux = lux;
    state.timestamp = now;
    luxSmoothingState.set(deviceId, state);
  }

  return lux;
}

// v5.5.283: Enhanced distance transformation with debug logging
// Ronny report: DP9 distance "not responding" on _TZE284_iadro9bf
function transformDistance(value, divisor = 100, manufacturerName = '') {
  const originalValue = value;
  let distance = value / divisor;

  // v5.5.283: Enhanced validation with logging
  if (typeof value !== 'number' || isNaN(value) || value < 0) {
    console.log(`[DISTANCE-FIX] ⚠️ Invalid distance value for ${manufacturerName}: ${originalValue} (type: ${typeof value})`);
    return null;  // Don't update capability for invalid values
  }

  // Sanity check: most radar sensors have 0-10m range
  if (distance < 0) distance = 0;
  if (distance > 10) {
    console.log(`[DISTANCE-FIX] 📏 Distance over range for ${manufacturerName}: ${distance}m -> 10m (clamped)`);
    distance = 10;
  }

  const result = Math.round(distance * 100) / 100; // 2 decimal places
  console.log(`[DISTANCE-FIX] ✅ Distance for ${manufacturerName}: ${originalValue} (÷${divisor}) -> ${result}m`);
  return result;
}

class PresenceSensorRadarDevice extends HybridSensorBase {

  /**
   * v5.5.277: Get manufacturerName with multiple fallback methods
   * Ronny fix: this.getData()?.manufacturerName was returning empty!
   */
  _getManufacturerName() {
    if (this._cachedManufacturerName) return this._cachedManufacturerName;

    // Method 1: getData() (Homey standard)
    let mfr = this.getData()?.manufacturerName;

    // Method 2: Settings (stored during pairing)
    if (!mfr) mfr = this.getSetting('zb_manufacturer_name');

    // Method 3: Store data
    if (!mfr) mfr = this.getStoreValue('manufacturerName');

    // Method 4: ZCL node basic cluster (if available)
    if (!mfr && this.zclNode?.endpoints?.[1]?.clusters?.basic) {
      try {
        mfr = this.zclNode.endpoints[1].clusters.basic.manufacturerName;
      } catch (e) { /* ignore */ }
    }

    // Method 5: Driver manifest match (from pairing)
    if (!mfr) {
      const manifest = this.driver?.manifest;
      if (manifest?.zigbee?.manufacturerName?.[0]) {
        mfr = manifest.zigbee.manufacturerName[0];
      }
    }

    this._cachedManufacturerName = mfr || '';
    return this._cachedManufacturerName;
  }

  /**
   * v5.5.277: Get sensor configuration based on manufacturerName
   * v5.5.364: Enhanced with auto-discovery for unknown devices
   */
  _getSensorConfig() {
    if (!this._sensorConfig) {
      const mfr = this._getManufacturerName();
      this._sensorConfig = getSensorConfig(mfr);
      this.log(`[RADAR] 🔍 ManufacturerName resolved: "${mfr}" → config: ${this._sensorConfig.configName || 'DEFAULT'}`);

      // v5.5.364: Initialize auto-discovery for DEFAULT/unknown devices
      if (this._sensorConfig.configName === 'DEFAULT') {
        this._dpAutoDiscovery = new IntelligentDPAutoDiscovery(this);
        this.log(`[RADAR] 🧠 AUTO-DISCOVERY MODE: Learning DP patterns for unknown device "${mfr}"`);
      }
    }
    return this._sensorConfig;
  }

  /**
   * v5.5.364: Get effective DP map (static config OR auto-discovered)
   */
  _getEffectiveDPMap() {
    const config = this._getSensorConfig();

    // If we have auto-discovery running and it has learned something, merge it
    if (this._dpAutoDiscovery && this._dpAutoDiscovery.isLearningComplete()) {
      const discoveredMap = this._dpAutoDiscovery.getDynamicDPMap();
      const staticMap = config.dpMap || {};

      // Merge: discovered DPs fill in gaps from static DEFAULT config
      const mergedMap = { ...staticMap };
      for (const [dpId, dpConfig] of Object.entries(discoveredMap)) {
        if (!mergedMap[dpId] || mergedMap[dpId].autoDiscovered) {
          mergedMap[dpId] = dpConfig;
        }
      }

      return mergedMap;
    }

    return config.dpMap || {};
  }

  /**
   * v5.5.254: Dynamic power source detection from config
   */
  get mainsPowered() {
    return !this._getSensorConfig().battery;
  }

  /**
   * v5.5.254: Dynamic capabilities based on sensor config
   */
  get sensorCapabilities() {
    const config = this._getSensorConfig();
    const caps = ['alarm_motion', 'alarm_human'];

    // Add capabilities based on what DPs are mapped
    const dpMap = config.dpMap || {};
    for (const dp of Object.values(dpMap)) {
      if (dp.cap && !caps.includes(dp.cap)) {
        caps.push(dp.cap);
      }
    }

    // Ensure battery capability for battery sensors
    if (config.battery && !caps.includes('measure_battery')) {
      caps.push('measure_battery');
    }

    return caps;
  }

  /**
   * v5.5.254: INTELLIGENT DP MAPPINGS
   * Builds dpMappings dynamically from sensor config database
   */
  get dpMappings() {
    const config = this._getSensorConfig();
    const mfr = this.getData()?.manufacturerName || '';
    const dpMap = config.dpMap || {};
    const mappings = {};

    this.log(`[RADAR] 🧠 Using config: ${config.configName || 'DEFAULT'} for ${mfr}`);

    // v5.5.318: Get invertPresence from user setting OR config
    // User setting takes precedence over config default
    const settings = this.getSettings() || {};
    const invertPresence = settings.invert_presence ?? config.invertPresence ?? false;
    const configName = config.configName || 'DEFAULT';

    if (invertPresence) {
      this.log(`[RADAR] 🔄 Presence inversion ENABLED (setting=${settings.invert_presence}, config=${config.invertPresence})`);
    }

    for (const [dpId, dpConfig] of Object.entries(dpMap)) {
      const dp = parseInt(dpId);

      if (dpConfig.cap === 'alarm_motion' || dpConfig.cap === 'alarm_human') {
        // v5.5.284: Use config.invertPresence flag for presence inversion
        // v5.5.314: Add presence debouncing for gkfbdvyx
        const deviceId = this.getData()?.id;
        mappings[dp] = {
          capability: 'alarm_motion',
          transform: (v) => debouncePresence(transformPresence(v, dpConfig.type, invertPresence, configName), mfr, deviceId),
          alsoSets: { 'alarm_human': (v) => debouncePresence(transformPresence(v, dpConfig.type, invertPresence, configName), mfr, deviceId) }
        };
      } else if (dpConfig.cap === 'measure_luminance') {
        // Illuminance DP - use sanity-checked transform with manufacturerName + deviceId for smoothing
        mappings[dp] = {
          capability: dpConfig.cap,
          transform: (v) => transformLux(v, dpConfig.type || 'lux_direct', mfr, this.getData()?.id),
        };
      } else if (dpConfig.cap === 'measure_distance') {
        // Distance DP - use enhanced transform with manufacturerName and null handling
        mappings[dp] = {
          capability: dpConfig.cap,
          transform: (v) => {
            const result = transformDistance(v, dpConfig.divisor || 100, mfr);
            // v5.5.283: Skip capability update if transform returns null (invalid data)
            return result !== null ? result : undefined;
          },
        };
      } else if (dpConfig.cap) {
        // Other capability DP
        mappings[dp] = {
          capability: dpConfig.cap,
          divisor: dpConfig.divisor || 1,
          transform: dpConfig.divisor ? (v) => v / dpConfig.divisor : undefined,
        };
      } else if (dpConfig.internal) {
        // Internal setting DP
        mappings[dp] = {
          capability: null,
          internal: dpConfig.internal,
          writable: true,
          divisor: dpConfig.divisor || 1,
        };
      }
    }

    // Add fallback DPs that might not be in config
    if (!mappings[112]) {
      mappings[112] = { capability: 'alarm_motion', transform: (v) => transformPresence(v, 'presence_enum', invertPresence, configName) };
    }

    return mappings;
  }

  async onNodeInit({ zclNode }) {
    const mfr = this.getData()?.manufacturerName || '';
    const config = this._getSensorConfig();

    this.log(`[RADAR] ═══════════════════════════════════════════════════════════`);
    this.log(`[RADAR] v5.5.315 INTELLIGENT PRESENCE INFERENCE`);
    this.log(`[RADAR] ManufacturerName: ${mfr}`);
    this.log(`[RADAR] Config: ${config.configName || 'ZY_M100_STANDARD (default)'}`);
    this.log(`[RADAR] Power: ${config.battery ? 'BATTERY (EndDevice)' : 'MAINS (Router)'}`);
    this.log(`[RADAR] Illuminance: ${config.hasIlluminance !== false ? 'YES' : 'NO'}`);
    this.log(`[RADAR] Polling: ${config.needsPolling ? 'ENABLED (30s interval)' : 'DISABLED'}`);
    this.log(`[RADAR] DPs: ${Object.keys(config.dpMap || {}).join(', ') || 'ZCL only'}`);
    this.log(`[RADAR] 🧠 Intelligent Inference: ${config.useIntelligentInference ? 'ENABLED' : 'DISABLED'}`);
    this.log(`[RADAR] ═══════════════════════════════════════════════════════════`);

    // v5.5.268: Track received DPs for debugging
    this._receivedDPs = new Set();
    this._lastPresenceUpdate = 0;

    // v5.5.315: Initialize Intelligent Presence Inference Engine
    if (config.useIntelligentInference) {
      this._presenceInference = new IntelligentPresenceInference(this);
      this.log(`[RADAR] 🧠 Inference engine initialized for presence=null workaround`);

      // Try to get firmware version for firmware-specific handling
      this._detectFirmwareVersion(zclNode);
    }

    // Battery sensors: minimal init to avoid timeouts
    if (config.battery) {
      this.log('[RADAR] ⚡ BATTERY MODE: Using minimal init (passive listeners only)');

      this.zclNode = zclNode;

      // Add battery capability
      if (!this.hasCapability('measure_battery')) {
        try {
          await this.addCapability('measure_battery');
          this.log('[RADAR] ✅ Added measure_battery');
        } catch (e) { /* ignore */ }
      }

      // Setup passive listeners only (no queries)
      this._setupPassiveListeners(zclNode);

      // Mark as available immediately
      await this.setAvailable().catch(() => { });

      this.log('[RADAR] ✅ Battery sensor ready (passive mode)');
      return;
    }

    // PIR sensors: use ZCL primarily
    if (config.useZcl) {
      this.log('[RADAR] 📡 ZCL MODE: Using ZCL occupancy cluster');
      await super.onNodeInit({ zclNode });
      await this._setupZclClusters(zclNode);
      this.log('[RADAR] ✅ PIR sensor ready (ZCL mode)');
      return;
    }

    // Mains-powered radar sensors: full init
    await super.onNodeInit({ zclNode });
    await this._setupZclClusters(zclNode);

    // v5.5.270: CRITICAL FIX - Setup Tuya DP listeners for mains-powered sensors too!
    // This was missing and caused presence not to work on TZE284 devices
    await this._setupTuyaDPListeners(zclNode);

    // v5.5.325: RONNY #782 - Force remove battery for mains-powered sensors
    // noBatteryCapability flag ensures battery is NEVER shown for these devices
    if ((config.noBatteryCapability || config.mainsPowered || !config.battery) && this.hasCapability('measure_battery')) {
      try {
        await this.removeCapability('measure_battery');
        this.log('[RADAR] 🔋 Removed measure_battery (mains-powered, no battery spam)');
      } catch (e) { /* ignore */ }
    }

    // v5.5.325: Also disable battery monitoring completely for gkfbdvyx
    if (config.noBatteryCapability) {
      this._batteryMonitoringDisabled = true;
      this.log('[RADAR] 🔋 Battery monitoring DISABLED for this device');
    }

    // v5.5.374: INTELLIGENT ADAPTIVE CAPABILITY MANAGEMENT
    // Pass config flags to intelligent adapter - it will handle removal/addition based on real data
    if (this.intelligentAdapter) {
      this.intelligentAdapter.setStaticConfigFlags({
        noTemperature: config.noTemperature || false,
        noHumidity: config.noHumidity || false,
        noBatteryCapability: config.noBatteryCapability || false,
        noIlluminance: !config.hasIlluminance,
      });
      this.log('[RADAR] 🧠 Intelligent adapter configured with sensor flags');

      // Let intelligent adapter decide based on real data instead of immediate removal
      // It will remove after learning phase if no data, or keep if data detected
    } else {
      // Fallback to static removal if intelligent adapter not available
      // v5.5.329: Remove temperature capability for PIR-only sensors (forum #788)
      if (config.noTemperature && this.hasCapability('measure_temperature')) {
        try {
          await this.removeCapability('measure_temperature');
          this.log('[RADAR] 🌡️ Removed measure_temperature (not supported by this device)');
        } catch (e) { /* ignore */ }
      }

      // v5.5.329: Remove humidity capability for PIR-only sensors (forum #788)
      if (config.noHumidity && this.hasCapability('measure_humidity')) {
        try {
          await this.removeCapability('measure_humidity');
          this.log('[RADAR] 💧 Removed measure_humidity (not supported by this device)');
        } catch (e) { /* ignore */ }
      }
    }

    // Ensure required capabilities
    for (const cap of ['measure_distance', 'measure_luminance']) {
      if (!this.hasCapability(cap)) {
        try {
          await this.addCapability(cap);
          this.log(`[RADAR] ✅ Added ${cap} capability`);
        } catch (e) { /* ignore */ }
      }
    }

    // v5.5.268: Start periodic polling for TZE284 devices that need it
    if (config.needsPolling) {
      this._startPresencePolling(zclNode);
    }

    this.log('[RADAR] ✅ Radar presence sensor ready (full mode)');
  }

  /**
   * v5.5.252: Setup passive listeners for battery sensors
   * These only listen for incoming data, no outgoing queries
   */
  _setupPassiveListeners(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    // Listen for Tuya DP reports (cluster 0xEF00)
    try {
      const tuyaCluster = ep1.clusters?.tuya || ep1.clusters?.[61184];
      if (tuyaCluster?.on) {
        tuyaCluster.on('response', (data) => {
          this.log('[RADAR-BATTERY] Tuya response received');
          this._handleTuyaResponse(data);
        });
        tuyaCluster.on('reporting', (data) => {
          this.log('[RADAR-BATTERY] Tuya reporting received');
          this._handleTuyaResponse(data);
        });
        tuyaCluster.on('datapoint', (data) => {
          this.log('[RADAR-BATTERY] Tuya datapoint received');
          this._handleTuyaResponse(data);
        });
        this.log('[RADAR] ✅ Passive Tuya listener configured');
      }
    } catch (e) { /* ignore */ }

    // Listen for occupancy reports
    try {
      const occCluster = ep1.clusters?.msOccupancySensing;
      if (occCluster?.on) {
        occCluster.on('attr.occupancy', (v) => {
          const occupied = (v & 0x01) !== 0;
          this.log(`[RADAR-BATTERY] Occupancy: ${occupied}`);
          this.setCapabilityValue('alarm_motion', occupied).catch(() => { });
          this._triggerPresenceFlows(occupied);
        });
        this.log('[RADAR] ✅ Passive occupancy listener configured');
      }
    } catch (e) { /* ignore */ }
  }

  /**
   * v5.5.277: Parse Buffer data to integer value
   * Ronny fix: data.data was Buffer [0,0,13,70] → need to parse to 3398
   */
  _parseBufferValue(data) {
    // Already a number
    if (typeof data === 'number') return data;
    if (typeof data === 'boolean') return data ? 1 : 0;

    // Buffer object: {type: "Buffer", data: [0,0,13,70]}
    if (data && typeof data === 'object') {
      let bytes = null;

      // Format 1: {type: "Buffer", data: [...]}
      if (data.type === 'Buffer' && Array.isArray(data.data)) {
        bytes = data.data;
      }
      // Format 2: Node.js Buffer
      else if (Buffer.isBuffer(data)) {
        bytes = Array.from(data);
      }
      // Format 3: Array directly
      else if (Array.isArray(data)) {
        bytes = data;
      }

      if (bytes && bytes.length > 0) {
        // Parse as big-endian unsigned integer
        let value = 0;
        for (let i = 0; i < bytes.length; i++) {
          value = (value << 8) | (bytes[i] & 0xFF);
        }
        return value;
      }
    }

    // String number
    if (typeof data === 'string' && !isNaN(data)) {
      return parseInt(data, 10);
    }

    return data;
  }

  /**
   * v5.5.283: Enhanced DP diagnostics for forum troubleshooting
   * Logs DP queries, passive reporting status, and data format issues
   */
  _logDpDiagnostics(dpId, value, rawValue, data) {
    const mfr = this._getManufacturerName();
    const config = this._getSensorConfig();
    const dpMap = config.dpMap || {};
    const dpConfig = dpMap[dpId];

    // Track received DPs for diagnostics
    if (!this._receivedDPs) this._receivedDPs = new Set();
    this._receivedDPs.add(dpId);

    // Enhanced diagnostic info
    const diagnosticInfo = {
      dpId,
      manufacturerName: mfr,
      configName: config.configName || 'DEFAULT',
      rawValueType: typeof rawValue,
      parsedValue: value,
      hasMapping: !!dpConfig,
      capability: dpConfig?.cap || 'unmapped',
      dataFormat: Array.isArray(rawValue?.data) ? `Buffer[${rawValue.data.join(',')}]` : typeof rawValue
    };

    // Special logging for problem DPs reported in forum
    if ([1, 9, 12, 104, 105, 112].includes(dpId)) {
      this.log(`[DIAG] 🔍 DP${dpId} (${dpConfig?.cap || 'unmapped'}): ${JSON.stringify(diagnosticInfo)}`);
    }

    // Detect passive reporting issues
    if (dpConfig && !value && rawValue) {
      this.log(`[DIAG] ⚠️ DP${dpId} parsing failed - passive reporting issue? Raw: ${JSON.stringify(rawValue)}`);
    }

    // Log missing expected DPs
    const expectedDPs = Object.keys(dpMap).map(Number);
    const missingDPs = expectedDPs.filter(dp => !this._receivedDPs.has(dp));
    if (missingDPs.length > 0) {
      this.log(`[DIAG] 📝 Missing DPs for ${mfr}: [${missingDPs.join(', ')}] (may be passive only)`);
    }
  }

  /**
   * v5.5.304: ENHANCED Tuya response handler with presence=null workaround
   * - Coordinate with HybridSensorBase to avoid dual processing
   * - Only handle special presence DPs locally (1, 105, 112)
   * - v5.5.304: DISTANCE-BASED PRESENCE INFERENCE for firmware bug workaround
   * - v5.5.364: AUTO-DISCOVERY integration for unknown devices
   */
  _handleTuyaResponse(data) {
    if (!data) return;

    // Mark device as available when we receive data
    this.setAvailable().catch(() => { });

    const dpId = data.dp || data.dpId || data.datapoint;

    // v5.5.364: AUTO-DISCOVERY - Feed all DPs to learning engine for unknown devices
    if (this._dpAutoDiscovery) {
      const rawVal = this._parseBufferValue(data.value || data.data);
      this._dpAutoDiscovery.analyzeDP(dpId, rawVal);

      // Try to apply auto-discovered mapping
      const discovered = this._dpAutoDiscovery.applyDiscoveredValue(dpId, rawVal);
      if (discovered && discovered.confidence >= 70) {
        this.log(`[AUTO-DISCOVERY] ✨ DP${dpId} → ${discovered.capability} = ${discovered.value} (confidence: ${discovered.confidence}%)`);

        // Apply to capability
        if (this.hasCapability(discovered.capability)) {
          this.setCapabilityValue(discovered.capability, discovered.value).catch(() => { });

          // Trigger flows for presence
          if (discovered.capability === 'alarm_motion') {
            this._triggerPresenceFlows(discovered.value);
            if (this.hasCapability('alarm_human')) {
              this.setCapabilityValue('alarm_human', discovered.value).catch(() => { });
            }
          }
          return;  // Handled by auto-discovery
        }
      }
    }

    // v5.5.310: FIXED - Handle DP12 and DP103 locally, NOT via HybridSensorBase!
    // Problem: HybridSensorBase universal profile maps DP103 to temperature, not lux
    // Solution: Handle lux DPs (12, 102, 103, 104) directly here using local dpMap config
    const config = this._getSensorConfig();
    const dpMap = this._getEffectiveDPMap();  // v5.5.364: Use effective map (static + discovered)

    // Check if this DP is a lux DP in our config - handle locally
    if (dpMap[dpId]?.cap === 'measure_luminance') {
      const luxValue = this._parseBufferValue(data.value || data.data);
      const mfr = this._getManufacturerName();
      const deviceId = this.getData()?.id;
      const finalLux = transformLux(luxValue, dpMap[dpId].type || 'lux_direct', mfr, deviceId);
      this.log(`[RADAR-LUX] ☀️ DP${dpId} → measure_luminance = ${finalLux} lux (local config)`);
      this.setCapabilityValue('measure_luminance', parseFloat(finalLux)).catch(() => { });

      // v5.5.315: Feed lux to intelligent inference engine
      if (dpMap[dpId].feedInference) {
        this._feedLuxToInference(finalLux);
      }
      return;
    }

    // Only filter DPs that HybridSensorBase handles (battery, settings - NOT lux!)
    const HYBRIDSENSOR_DPS = [2, 3, 4, 15]; // settings, battery only
    if (HYBRIDSENSOR_DPS.includes(dpId)) {
      // Let HybridSensorBase handle these
      return;
    }

    // v5.5.277: Parse the value properly (could be Buffer, number, etc.)
    let rawValue = data.value;
    if (rawValue === undefined || rawValue === null) {
      rawValue = data.data;
    }
    const value = this._parseBufferValue(rawValue);

    // Log diagnostics for non-conflicting DPs only
    this._logUnknownDP(dpId, value, data);
    this._logDpDiagnostics(dpId, value, rawValue, data);

    // v5.5.304: DISTANCE-BASED PRESENCE INFERENCE (firmware bug workaround)
    // If DP9 (distance) > 0, infer presence even if DP1 is null
    if (dpId === 9) {
      this._handleDistanceWithPresenceInference(value);
      return;
    }

    // v5.5.306: FIXED - Added DP104 to presence DPs (used by ZY_M100_CEILING_24G)
    const PRESENCE_DPS = [1, 104, 105, 112];
    if (PRESENCE_DPS.includes(dpId)) {
      const presenceValue = this._parsePresenceValue(value);

      // v5.5.315: Feed presence DP to inference engine (even if null!)
      if (this._presenceInference && dpId === 1) {
        const inferredPresence = this._presenceInference.updatePresenceDP(value);

        // If DP1 is null, use inference result instead
        if (presenceValue === null) {
          this.log(`[RADAR] 🧠 DP1=null - using inference: presence=${inferredPresence} (confidence: ${this._presenceInference.getConfidence()}%)`);
          if (inferredPresence !== this.getCapabilityValue('alarm_motion')) {
            this._handlePresenceWithDebounce(inferredPresence, 1);
          }
          return;
        }
      }

      if (presenceValue !== null) {
        // v5.5.279: Debounce presence to fix "flash 0.5s" issue
        this._handlePresenceWithDebounce(presenceValue, dpId);
        return;
      }
    }

    // Log other unmapped DPs for diagnostic purposes only
    this.log(`[RADAR] 📡 DP${dpId} = ${value} (unknown DP, please report to developer)`);
  }

  /**
   * v5.5.315: Detect firmware version for firmware-specific handling
   * Different firmware versions have different bugs (appVersion 74 vs 78)
   */
  async _detectFirmwareVersion(zclNode) {
    try {
      const ep1 = zclNode?.endpoints?.[1];
      const basicCluster = ep1?.clusters?.basic;

      if (basicCluster?.readAttributes) {
        const attrs = await basicCluster.readAttributes(['appVersion', 'stackVersion', 'hwVersion']).catch(() => ({}));
        const appVersion = attrs?.appVersion;

        if (appVersion && this._presenceInference) {
          this._presenceInference.setFirmwareInfo(appVersion);
          this.log(`[RADAR] 📱 Detected firmware: appVersion=${appVersion}`);

          // Store for reference
          this._firmwareAppVersion = appVersion;
        }
      }
    } catch (e) {
      this.log(`[RADAR] ⚠️ Could not detect firmware version: ${e.message}`);
    }
  }

  /**
   * v5.5.315: Handle distance DP with INTELLIGENT presence inference
   * Uses IntelligentPresenceInference engine to calculate presence from multiple sources
   */
  _handleDistanceWithPresenceInference(rawDistance) {
    const config = this._getSensorConfig();
    const useDistanceInference = config.useDistanceInference || false;

    // Always update distance capability
    const divisor = config.dpMap?.[9]?.divisor || 100;
    const distanceMeters = rawDistance / divisor;
    this.setCapabilityValue('measure_distance', parseFloat(distanceMeters)).catch(() => { });
    this.log(`[RADAR] 📏 Distance: ${distanceMeters}m (raw: ${rawDistance})`);

    // v5.5.315: Feed distance to intelligent inference engine
    if (this._presenceInference) {
      const inferredPresence = this._presenceInference.updateDistance(distanceMeters);
      const confidence = this._presenceInference.getConfidence();
      const currentPresence = this.getCapabilityValue('alarm_motion');

      // Update presence if inference differs from current state
      if (inferredPresence !== currentPresence && confidence >= 40) {
        this.log(`[RADAR] 🧠 INTELLIGENT INFERENCE: presence=${inferredPresence} (confidence: ${confidence}%)`);
        this._handlePresenceWithDebounce(inferredPresence, 9);
      }
      this._updatePresenceTimestamp();
      return;
    }

    // v5.5.304: Legacy PRESENCE INFERENCE from distance (fallback)
    if (useDistanceInference) {
      const maxRange = this._lastMaxRange || 6;
      const inferredPresence = distanceMeters > 0 && distanceMeters < maxRange;
      const currentPresence = this.getCapabilityValue('alarm_motion');

      if (inferredPresence !== currentPresence) {
        this.log(`[RADAR] 🎯 DISTANCE INFERENCE: presence=${inferredPresence} (distance=${distanceMeters}m, max=${maxRange}m)`);
        this._handlePresenceWithDebounce(inferredPresence, 9);
      }
      this._updatePresenceTimestamp();
    }
  }

  /**
   * v5.5.315: Feed lux value to intelligent inference engine
   * Rapid lux changes indicate movement/presence
   */
  _feedLuxToInference(luxValue) {
    if (this._presenceInference) {
      const inferredPresence = this._presenceInference.updateLux(luxValue);
      const confidence = this._presenceInference.getConfidence();
      const currentPresence = this.getCapabilityValue('alarm_motion');

      // Only update from lux if high confidence and state differs
      if (inferredPresence !== currentPresence && confidence >= 50) {
        this.log(`[RADAR] 🧠 LUX-BASED INFERENCE: presence=${inferredPresence} (confidence: ${confidence}%)`);
        this._handlePresenceWithDebounce(inferredPresence, 104); // Use DP104 as source
      }
    }
  }

  /**
   * v5.5.279: Parse presence value from any format
   * Returns true/false or null if invalid
   */
  _parsePresenceValue(value) {
    // Boolean
    if (typeof value === 'boolean') return value;
    // Enum: 0=none, 1=presence, 2=motion
    if (typeof value === 'number') {
      if (value === 0) return false;
      if (value === 1 || value === 2) return true;
    }
    // String
    if (value === 'presence' || value === 'motion' || value === 'true') return true;
    if (value === 'none' || value === 'false') return false;
    return null;
  }

  /**
   * v5.5.357: RONNY FORUM FIX - Ultra throttle motion spam
   * _TZE284_iadro9bf sends motion=YES every 20s even without presence
   * Solution: Max 1 motion update per 60 seconds if no real change
   */
  _throttleMotionSpam(presence, dpId) {
    const config = this._getSensorConfig();
    const mfr = this.getData()?.manufacturerName || '';

    // Only apply to problematic sensors
    if (!mfr.includes('iadro9bf')) {
      return presence;
    }

    const now = Date.now();
    this._motionThrottle = this._motionThrottle || {
      lastUpdate: 0,
      lastValue: null,
      spamCount: 0
    };

    const timeSinceLastUpdate = now - this._motionThrottle.lastUpdate;
    const THROTTLE_MS = 60000; // 60 seconds

    // If same value and within throttle window, block it
    if (presence === this._motionThrottle.lastValue && timeSinceLastUpdate < THROTTLE_MS) {
      this._motionThrottle.spamCount++;
      this.log(`[RADAR] 🚫 MOTION SPAM BLOCKED: same value within ${timeSinceLastUpdate}ms (spam count: ${this._motionThrottle.spamCount})`);
      return null; // Block update
    }

    // Real change or throttle expired
    this._motionThrottle.lastUpdate = now;
    this._motionThrottle.lastValue = presence;
    if (this._motionThrottle.spamCount > 0) {
      this.log(`[RADAR] ✅ MOTION UPDATE ALLOWED after blocking ${this._motionThrottle.spamCount} spam updates`);
      this._motionThrottle.spamCount = 0;
    }
    return presence;
  }

  /**
   * v5.5.293: FIXED presence debounce with inversion support
   * - Applies invertPresence transform before debouncing
   * - Fixes "presence flashes for 0.5s" issue with proper inversion
   * v5.5.357: Added motion spam throttle
   */
  _handlePresenceWithDebounce(rawPresence, dpId) {
    // v5.5.357: THROTTLE MOTION SPAM FIRST
    const throttled = this._throttleMotionSpam(rawPresence, dpId);
    if (throttled === null) return; // Blocked by throttle

    const now = Date.now();
    const DEBOUNCE_MS = 2000; // 2 seconds

    // v5.5.318: Apply inversion from user setting OR config
    const config = this._getSensorConfig();
    const settings = this.getSettings() || {};
    const invertPresence = settings.invert_presence ?? config.invertPresence ?? false;
    const configName = config.configName || 'DEFAULT';

    // Transform the raw presence value with inversion support
    let presence = rawPresence;
    if (invertPresence) {
      presence = !rawPresence;
      this.log(`[PRESENCE-FIX] 🔄 INVERTING presence for ${configName}: DP${dpId} ${rawPresence} -> ${presence}`);
    }

    // If presence is TRUE, set immediately
    if (presence) {
      this.log(`[RADAR] 🟢 DP${dpId} → PRESENCE DETECTED (processed: ${presence})`);
      this._lastPresenceTrue = now;
      this.setCapabilityValue('alarm_motion', true).catch(() => { });
      if (this.hasCapability('alarm_human')) {
        this.setCapabilityValue('alarm_human', true).catch(() => { });
      }
      this._updatePresenceTimestamp();

      // v5.5.285: Trigger custom flow cards
      this._triggerPresenceFlows(true);
      return;
    }

    // If presence is FALSE, debounce (wait 2s before clearing)
    const timeSinceTrue = now - (this._lastPresenceTrue || 0);
    if (timeSinceTrue < DEBOUNCE_MS) {
      this.log(`[RADAR] 🟡 DP${dpId} → presence=false DEBOUNCED (${timeSinceTrue}ms < ${DEBOUNCE_MS}ms)`);
      return; // Ignore false within 2s of true
    }

    this.log(`[RADAR] 🔴 DP${dpId} → PRESENCE CLEARED (processed: ${presence})`);
    this.setCapabilityValue('alarm_motion', false).catch(() => { });
    if (this.hasCapability('alarm_human')) {
      this.setCapabilityValue('alarm_human', false).catch(() => { });
    }

    // v5.5.285: Trigger custom flow cards
    this._triggerPresenceFlows(false);
  }

  /**
   * v5.5.285: Trigger custom presence flow cards
   * Fixes: Flow triggers defined in driver.compose.json but never triggered
   */
  async _triggerPresenceFlows(detected) {
    try {
      if (detected) {
        // Trigger: presence_detected
        await this.homey.flow.getDeviceTriggerCard('presence_detected')
          .trigger(this).catch(() => { });
        // Trigger: presence_someone_enters
        await this.homey.flow.getDeviceTriggerCard('presence_someone_enters')
          .trigger(this).catch(() => { });
        this.log('[RADAR-FLOW] ✅ Triggered: presence_detected, presence_someone_enters');
      } else {
        // Trigger: presence_cleared
        await this.homey.flow.getDeviceTriggerCard('presence_cleared')
          .trigger(this).catch(() => { });
        // Trigger: presence_zone_empty
        await this.homey.flow.getDeviceTriggerCard('presence_zone_empty')
          .trigger(this).catch(() => { });
        this.log('[RADAR-FLOW] ✅ Triggered: presence_cleared, presence_zone_empty');
      }
    } catch (err) {
      this.log('[RADAR-FLOW] ⚠️ Flow trigger error:', err.message);
    }
  }

  async _setupZclClusters(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    // Illuminance cluster (0x0400)
    try {
      const illumCluster = ep1.clusters?.msIlluminanceMeasurement;
      if (illumCluster?.on) {
        illumCluster.on('attr.measuredValue', (v) => {
          const lux = Math.pow(10, (v - 1) / 10000);
          this.setCapabilityValue('measure_luminance', parseFloat(Math.round(lux))).catch(() => { });
        });
        this.log('[RADAR] ✅ Illuminance cluster configured');
      }
    } catch (e) { /* ignore */ }

    // Occupancy cluster (0x0406)
    try {
      const occCluster = ep1.clusters?.msOccupancySensing;
      if (occCluster?.on) {
        occCluster.on('attr.occupancy', (v) => {
          const occupied = (v & 0x01) !== 0;
          this.setCapabilityValue('alarm_motion', occupied).catch(() => { });
          this._triggerPresenceFlows(occupied);
        });
        this.log('[RADAR] ✅ Occupancy cluster configured');
      }
    } catch (e) { /* ignore */ }

    // v5.5.276: IAS Zone enrollment fix (ChatGPT analysis #723)
    // Fixes "notEnrolled" status that prevents proper motion detection
    await this._enrollIASZone(zclNode);
  }

  /**
   * v5.5.276: IAS Zone enrollment - fixes "notEnrolled" status
   * ChatGPT analysis #723: ZoneState = notEnrolled prevents motion detection
   */
  async _enrollIASZone(zclNode) {
    try {
      const ep1 = zclNode?.endpoints?.[1];
      const iasZone = ep1?.clusters?.iasZone || ep1?.clusters?.ssIasZone;

      if (!iasZone) {
        this.log('[RADAR] ℹ️ No IAS Zone cluster - skipping enrollment');
        return;
      }

      this.log('[RADAR] 🔐 Attempting IAS Zone enrollment...');

      // Step 1: Read current zone state
      try {
        const attrs = await iasZone.readAttributes(['zoneState', 'zoneType', 'zoneStatus']);
        this.log(`[RADAR] IAS Zone state: ${JSON.stringify(attrs)}`);

        // If already enrolled, skip
        if (attrs?.zoneState === 1) {
          this.log('[RADAR] ✅ IAS Zone already enrolled');
          return;
        }
      } catch (e) { /* continue with enrollment */ }

      // Step 2: Write IAS CIE address (Homey's IEEE address)
      try {
        const homeyIeee = this.homey?.zigbee?.ieeeAddress || '0000000000000000';
        await iasZone.writeAttributes({ iasCieAddress: homeyIeee });
        this.log(`[RADAR] ✅ Wrote IAS CIE address: ${homeyIeee}`);
      } catch (e) {
        this.log(`[RADAR] ⚠️ Could not write IAS CIE: ${e.message}`);
      }

      // Step 3: Send zone enroll response
      try {
        if (iasZone.zoneEnrollResponse) {
          await iasZone.zoneEnrollResponse({ enrollResponseCode: 0, zoneId: 1 });
          this.log('[RADAR] ✅ IAS Zone enroll response sent');
        }
      } catch (e) {
        this.log(`[RADAR] ⚠️ Zone enroll response failed: ${e.message}`);
      }

      // Step 4: Listen for zone status changes
      if (iasZone.on) {
        iasZone.on('attr.zoneStatus', (status) => {
          const alarm1 = (status & 0x01) !== 0;
          const alarm2 = (status & 0x02) !== 0;
          const motion = alarm1 || alarm2;
          this.log(`[RADAR] IAS Zone status: ${status} -> motion: ${motion}`);
          this.setCapabilityValue('alarm_motion', motion).catch(() => { });
          this._triggerPresenceFlows(motion);
        });

        iasZone.onZoneStatusChangeNotification = (payload) => {
          const status = payload?.zoneStatus || 0;
          const motion = (status & 0x03) !== 0;
          this.log(`[RADAR] IAS Zone notification: ${status} -> motion: ${motion}`);
          this.setCapabilityValue('alarm_motion', motion).catch(() => { });
          this._triggerPresenceFlows(motion);
        };

        this.log('[RADAR] ✅ IAS Zone listeners configured');
      }
    } catch (e) {
      this.log(`[RADAR] ⚠️ IAS Zone enrollment error: ${e.message}`);
    }
  }

  /**
   * v5.5.270: CRITICAL FIX for Ronny's TZE284 sensor
   * Setup Tuya DP listeners for mains-powered radar sensors
   * This was MISSING and caused presence to never update!
   */
  async _setupTuyaDPListeners(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    this.log('[RADAR] 🔧 Setting up Tuya DP listeners for mains-powered sensor...');

    // Try multiple cluster access methods
    const tuyaCluster = ep1.clusters?.tuya ||
      ep1.clusters?.['tuya'] ||
      ep1.clusters?.[61184] ||
      ep1.clusters?.['61184'] ||
      ep1.clusters?.manuSpecificTuya;

    if (tuyaCluster) {
      this.log('[RADAR] ✅ Found Tuya cluster');

      // Listen for all possible event types
      const events = ['response', 'reporting', 'datapoint', 'report', 'data', 'set'];
      for (const event of events) {
        try {
          if (typeof tuyaCluster.on === 'function') {
            tuyaCluster.on(event, (data) => {
              this.log(`[RADAR] 📡 Tuya ${event} event received`);
              this._handleTuyaResponse(data);
            });
            this.log(`[RADAR] ✅ Listening for Tuya '${event}' events`);
          }
        } catch (e) { /* ignore */ }
      }

      // Also try to register for attribute reports
      try {
        if (tuyaCluster.onReport) {
          tuyaCluster.onReport((report) => {
            this.log('[RADAR] 📡 Tuya onReport received');
            this._handleTuyaResponse(report);
          });
        }
      } catch (e) { /* ignore */ }
    } else {
      this.log('[RADAR] ⚠️ Tuya cluster not found - trying alternative methods');

      // Try binding to EF00 cluster directly
      try {
        const { Cluster } = require('zigbee-clusters');
        const TuyaCluster = Cluster.getCluster(61184);
        if (TuyaCluster && ep1.bind) {
          this.log('[RADAR] 🔧 Attempting direct EF00 cluster bind');
        }
      } catch (e) { /* ignore */ }
    }

    // Also try the node-level listeners
    try {
      if (zclNode.on) {
        zclNode.on('command', (cmd) => {
          if (cmd.cluster === 61184 || cmd.cluster === 'tuya') {
            this.log('[RADAR] 📡 Node command received from Tuya cluster');
            this._handleTuyaResponse(cmd.data || cmd);
          }
        });
      }
    } catch (e) { /* ignore */ }

    this.log('[RADAR] ✅ Tuya DP listeners configured for mains-powered sensor');
  }

  /**
   * v5.5.304: ENHANCED POLLING - Workaround for presence=null firmware bug
   * v5.5.308: Added LUX polling - fixes "lux only updates on motion" issue (Eftychis #761)
   * Strategy: Aggressive polling + Time sync + Distance inference + Lux polling
   * WHY: Tuya gateway polls aggressively and sends time sync - we do the same
   */
  _startPresencePolling(zclNode) {
    const config = this._getSensorConfig();
    const useAggressive = config.useAggressivePolling || false;
    const needsTimeSync = config.needsTimeSync || false;
    const pollInterval = useAggressive ? 10000 : 30000; // 10s or 30s

    this.log(`[RADAR] 🔄 Starting presence+lux polling (${pollInterval / 1000}s interval, aggressive=${useAggressive})`);

    // Clear any existing interval
    if (this._pollingInterval) {
      clearInterval(this._pollingInterval);
    }

    // v5.5.304: Send initial time sync if needed (like Tuya gateway)
    if (needsTimeSync) {
      this._sendTimeSync(zclNode);
    }

    // v5.5.308: LUX polling counter - poll lux every 3rd cycle (90s for normal, 30s for aggressive)
    let luxPollCounter = 0;

    // Poll at configured interval
    this._pollingInterval = setInterval(async () => {
      try {
        const now = Date.now();
        const timeSinceLastPresence = now - (this._lastPresenceUpdate || 0);

        // v5.5.315: PERIODIC INFERENCE CHECK - update presence from inference engine
        if (this._presenceInference) {
          const inferredPresence = this._presenceInference.getPresence();
          const confidence = this._presenceInference.getConfidence();
          const currentPresence = this.getCapabilityValue('alarm_motion');

          // Update if inference differs and confidence is reasonable
          if (inferredPresence !== currentPresence && confidence >= 35) {
            this.log(`[RADAR] 🧠 PERIODIC INFERENCE: presence=${inferredPresence} (confidence: ${confidence}%)`);
            this._handlePresenceWithDebounce(inferredPresence, 0); // DP0 = inference source
          }
        }

        // v5.5.304: More aggressive check - poll if no update in 15s (was 60s)
        const threshold = useAggressive ? 15000 : 60000;
        if (timeSinceLastPresence > threshold) {
          this.log(`[RADAR] 🔄 No presence update in ${threshold / 1000}s, requesting DP refresh...`);
          await this._requestDPRefresh(zclNode);

          // v5.5.304: Also request specific DP1 (presence) directly
          await this._requestSpecificDP(zclNode, 1);
        }

        // v5.5.308: Poll lux DPs every 3rd cycle to fix "lux only updates on motion" issue
        luxPollCounter++;
        if (luxPollCounter >= 3) {
          luxPollCounter = 0;
          if (config.hasIlluminance !== false) {
            this.log(`[RADAR] ☀️ Polling lux DPs...`);
            // Try common lux DPs: 12, 102, 103, 104
            const luxDPs = [12, 102, 103, 104];
            for (const dp of luxDPs) {
              if (config.dpMap?.[dp]?.cap === 'measure_luminance') {
                await this._requestSpecificDP(zclNode, dp);
                break; // Only poll first matching lux DP
              }
            }
          }
        }
      } catch (e) {
        this.log(`[RADAR] ⚠️ Polling error: ${e.message}`);
      }
    }, pollInterval);

    // Initial poll after 2 seconds (faster than before)
    setTimeout(() => {
      this._requestDPRefresh(zclNode);
      this._requestSpecificDP(zclNode, 1);
    }, 2000);
  }

  /**
   * v5.5.304: Send time sync to device (like Tuya gateway)
   * Some devices won't report presence until they receive time sync
   */
  async _sendTimeSync(zclNode) {
    try {
      const ep1 = zclNode?.endpoints?.[1];
      const tuyaCluster = ep1?.clusters?.tuya || ep1?.clusters?.[61184];
      if (!tuyaCluster) return;

      // Zigbee epoch: 2000-01-01 00:00:00 UTC
      const ZIGBEE_EPOCH = new Date(Date.UTC(2000, 0, 1, 0, 0, 0)).getTime();
      const utcSeconds = Math.floor((Date.now() - ZIGBEE_EPOCH) / 1000);
      const localSeconds = utcSeconds + (-new Date().getTimezoneOffset() * 60);

      // Create time payload (8 bytes: UTC + Local)
      const payload = Buffer.alloc(8);
      payload.writeUInt32BE(utcSeconds, 0);
      payload.writeUInt32BE(localSeconds, 4);

      // Send time response command (0x64 = 100)
      if (tuyaCluster.command) {
        await tuyaCluster.command('mcuSyncTime', { payloadSize: 8, payload });
        this.log('[RADAR] ⏰ Time sync sent to device');
      }
    } catch (e) {
      this.log(`[RADAR] ⚠️ Time sync failed: ${e.message}`);
    }
  }

  /**
   * v5.5.304: Request specific DP value from device
   * Tuya gateway requests DP1 specifically to get presence
   */
  async _requestSpecificDP(zclNode, dpId) {
    try {
      const ep1 = zclNode?.endpoints?.[1];
      const tuyaCluster = ep1?.clusters?.tuya || ep1?.clusters?.[61184];
      if (!tuyaCluster) return;

      // Method 1: dataRequest with specific DP
      if (tuyaCluster.dataRequest) {
        await tuyaCluster.dataRequest({ dp: dpId });
        this.log(`[RADAR] 📱 Requested DP${dpId} specifically`);
        return;
      }

      // Method 2: sendData with query format
      if (tuyaCluster.sendData) {
        await tuyaCluster.sendData({
          dp: dpId,
          datatype: 1, // Bool type for presence
          data: Buffer.from([])
        });
        this.log(`[RADAR] 📱 Requested DP${dpId} via sendData`);
      }
    } catch (e) {
      // Silently ignore - not all devices support this
    }
  }

  /**
   * v5.5.268: Request DP refresh from device
   * Sends Tuya MCU command to request all DP values
   */
  async _requestDPRefresh(zclNode) {
    try {
      const ep1 = zclNode?.endpoints?.[1];
      const tuyaCluster = ep1?.clusters?.tuya || ep1?.clusters?.[61184];

      if (tuyaCluster?.dataQuery) {
        // Request all datapoints
        await tuyaCluster.dataQuery();
        this.log('[RADAR] 📡 DP refresh requested');
      } else if (tuyaCluster?.sendData) {
        // Alternative: send empty data request
        await tuyaCluster.sendData({ dp: 0, datatype: 0, data: Buffer.from([]) });
        this.log('[RADAR] 📡 DP refresh requested (alt method)');
      }
    } catch (e) {
      // Silently ignore - device may not support query
    }
  }

  /**
   * v5.5.268: Enhanced DP logging for debugging unknown variants
   * Logs ALL incoming DPs to help identify correct mappings
   */
  _logUnknownDP(dpId, value, rawData) {
    if (!this._receivedDPs) this._receivedDPs = new Set();

    const isNew = !this._receivedDPs.has(dpId);
    this._receivedDPs.add(dpId);

    const prefix = isNew ? '🆕 NEW' : '📊';
    this.log(`[RADAR] ${prefix} DP${dpId} = ${value} (raw: ${JSON.stringify(rawData)})`);

    // Log summary of all received DPs periodically
    if (isNew) {
      this.log(`[RADAR] 📋 All DPs received so far: [${Array.from(this._receivedDPs).sort((a, b) => a - b).join(', ')}]`);
    }
  }

  /**
   * v5.5.268: Update presence timestamp when motion detected
   */
  _updatePresenceTimestamp() {
    this._lastPresenceUpdate = Date.now();
  }

  /**
   * v5.5.268: Cleanup on device removal
   */
  onDeleted() {
    if (this._pollingInterval) {
      clearInterval(this._pollingInterval);
      this._pollingInterval = null;
    }
    super.onDeleted?.();
  }
}

module.exports = PresenceSensorRadarDevice;
