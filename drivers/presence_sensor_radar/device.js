'use strict';

const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');

// ═══════════════════════════════════════════════════════════════════════════════
// v5.5.793: VALIDATION CONSTANTS - Centralized thresholds for data validation
// ═══════════════════════════════════════════════════════════════════════════════
const VALIDATION = {
  BATTERY_MIN: 0,
  BATTERY_MAX: 100,
  LUX_MIN: 0,
  LUX_MAX: 10000,
  LUX_ZYM100_MAX: 2000,     // ZY-M100 series confirmed 0-2000 lux range
  DISTANCE_MIN: 0,
  DISTANCE_MAX: 10,          // Most radar sensors have 0-10m range
};

// v5.5.793: Timing constants for debouncing and throttling
const TIMING = {
  MOTION_THROTTLE_MS: 60000,       // 60s between identical motion updates
  LUX_OSCILLATION_LOCK_MS: 120000, // 2 minutes lock after oscillation
  LUX_SMOOTHING_RESET_MS: 120000,  // 2 minutes to reset smoothing state
  PRESENCE_POLLING_MS: 30000,      // 30s polling interval
};

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

    // v5.5.927: Fixed distance divisor detection (Peter_van_Werkhoven forum)
    // Z2M/Hubitat research: ALL radar sensors use scale 100 (cm to meters)
    // Only specific sensors (_TZE204_gkfbdvyx ceiling radar) use scale 10 (dm to meters)
    const isDistancePattern =
      (dpId === 9 || dpId === 109 || dpId === 119 || dpId === 19) &&
      avgValue >= 0 && avgValue <= 1000 &&
      range < 500;  // Distance shouldn't jump wildly

    if (isDistancePattern) {
      // v5.5.927: Default to 100 (cm to m) - Z2M/Hubitat standard
      // Most sensors report in centimeters: 150 = 1.5m
      let divisor = 100;

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

    // ─────────────────────────────────────────────────────────────────────────
    // v5.5.929: PATTERN 7: TEMPERATURE (OEM variants with temp sensor)
    // DP3 or DP111 typically used, value 150-350 (÷10 = 15-35°C)
    // ─────────────────────────────────────────────────────────────────────────
    const isTempPattern =
      (dpId === 3 || dpId === 111 || dpId === 18) &&
      avgValue >= 100 && avgValue <= 500 &&  // 10-50°C when ÷10
      range < 50;

    if (isTempPattern && !dpInfo.inferredCapability) {
      dpInfo.inferredType = 'temperature';
      dpInfo.inferredCapability = 'measure_temperature';
      dpInfo.divisor = 10;
      dpInfo.confidence = 75;
      this.device?.log?.(`[AUTO-DISCOVERY] 🌡️ DP${dpId} → TEMPERATURE (÷10)`);
      return;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // v5.5.929: PATTERN 8: HUMIDITY (OEM variants with humidity sensor)
    // DP4 or DP101 typically used, value 0-100 (direct %)
    // ─────────────────────────────────────────────────────────────────────────
    const isHumidityPattern =
      (dpId === 4 || dpId === 101) &&
      avgValue >= 0 && avgValue <= 100 &&
      range < 30 &&
      !dpInfo.inferredCapability;  // Don't override battery detection

    // Distinguish from battery by checking if device already has humidity capability hint
    if (isHumidityPattern && dpId !== 15) {
      // DP4 could be humidity OR battery - check context
      const hasMotionDP = this.discoveredDPs.has(1);
      const hasTempDP = this.discoveredDPs.has(3) || this.discoveredDPs.has(111);
      
      if (hasTempDP && dpId === 4) {
        // If we have temp, DP4 is likely humidity (multi-sensor)
        dpInfo.inferredType = 'humidity';
        dpInfo.inferredCapability = 'measure_humidity';
        dpInfo.divisor = 1;
        dpInfo.confidence = 70;
        this.device?.log?.(`[AUTO-DISCOVERY] 💧 DP${dpId} → HUMIDITY (multi-sensor)`);
        return;
      }
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
      // v5.5.929: OEM variant support for temp/humidity
      case 'temperature':
        value = rawValue / (info.divisor || 10);
        value = Math.round(value * 10) / 10;
        break;
      case 'humidity':
        // v5.7.7: Support both divisor AND multiplier (fixes HOBEIAN ZG-227Z)
        if (info.multiplier) {
          value = rawValue * info.multiplier;
        } else {
          value = rawValue / (info.divisor || 1);
        }
        value = Math.max(0, Math.min(100, value));
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
    // v5.8.12: RONNY FORUM FIX - Motion throttling to prevent random triggers
    motionThrottleEnabled: true,
    motionThrottleMs: 10000,       // Minimum 10s between motion state changes (was triggering randomly)
    motionDebounceMs: 5000,        // 5s debounce for motion=false to prevent flapping
    ignoreMovementState: true,     // v5.8.12: Ignore state=2 (movement) which causes random triggers
    dpMap: {
      // v5.5.325: PRESENCE - DP1 is ENUM not boolean!
      // 0=none (no presence), 1=presence (detected), 2=move (moving detected)
      1: { cap: 'alarm_motion', type: 'presence_enum_gkfbdvyx', enumMap: { 0: false, 1: true, 2: true } },

      // v5.5.325: SETTINGS DPs (internal, not exposed)
      2: { cap: null, internal: 'move_sensitivity' },        // 1-10
      3: { cap: null, internal: 'detection_distance_min', divisor: 100 },  // cm -> m
      4: { cap: null, internal: 'detection_distance_max', divisor: 100 },  // cm -> m

      // v5.5.927: DISTANCE - DP9, ×0.01 = cm to meters (Hubitat research confirms scale: 100)
      // v5.5.325 used divisor 10 but Hubitat deviceProfilesV4 shows scale: 100 for most sensors
      9: { cap: 'measure_distance', divisor: 100 },

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
  // v5.5.831: HOBEIAN ZG-204ZV MULTISENSOR (Peter_van_Werkhoven forum fix)
  // This is a 5-in-1 multisensor with motion, illuminance, temp, humidity, battery
  // DP mappings confirmed from motion_sensor device.js ZG204ZV profile
  'ZG_204ZV_MULTISENSOR': {
    sensors: [
      '_TZE200_3towulqd', '_TZE204_3towulqd', '_tze200_3towulqd',
      // v5.5.914: shaarkys fork - additional ZG-204ZV fingerprints
      '_TZE200_rhgsbacq', '_TZE204_rhgsbacq',
      '_TZE200_grgol3xp', '_TZE204_grgol3xp',
      '_TZE200_uli8wasj', '_TZE204_uli8wasj',
      '_TZE200_y8jijhba', '_TZE204_y8jijhba',
      'HOBEIAN',  // v5.5.841: Added for direct HOBEIAN ZG-204ZV matching
      // v5.7.45: Peter #1342 - ZG-204ZV variant reporting as _TZ3000_8bxrzyxz
      '_TZ3000_8bxrzyxz', '_TZ3000_8BXRZYXZ',
    ],
    modelId: 'ZG-204ZV',  // v5.5.841: Explicit modelId for HOBEIAN routing
    battery: true,
    hasIlluminance: true,
    noTemperature: false,   // v5.5.831: ZG-204ZV HAS temperature!
    noHumidity: false,      // v5.5.831: ZG-204ZV HAS humidity!
    // v5.5.985: Peter #1282 - Lux smoothing to prevent light flickering
    luxSmoothingEnabled: true,
    luxMinChangePercent: 15,       // Ignore changes < 15%
    // v5.5.991: Peter #1297 - Motion throttle to fix disco lights (random motion triggers)
    motionThrottleEnabled: true,
    motionThrottleMs: 5000,        // Minimum 5s between motion state changes
    motionDebounceMs: 3000,        // 3s debounce for motion=false
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      // v5.5.831: ZG-204ZV specific - DP3=temp(÷10), DP4=humidity(×10)
      // v5.5.987: Peter #1265 - Humidity 9% instead of 90% - needs multiplier
      3: { cap: 'measure_temperature', divisor: 10 },
      4: { cap: 'measure_humidity', multiplier: 10 },
      9: { cap: 'measure_luminance', type: 'lux_direct' },
      10: { cap: 'measure_battery', divisor: 1 },
      // v5.5.841: SOS button (Peter_van_Werkhoven diagnostic - DP17 or DP18 typical for SOS)
      17: { cap: 'alarm_generic', type: 'bool', flowTrigger: 'sos_pressed' },
      18: { cap: 'alarm_generic', type: 'bool', flowTrigger: 'sos_pressed' },
      // v5.5.914: shaarkys fork - alternate DP mappings for ZG-204ZV Type H variant
      // Some devices use DP101/106/110/111 instead of DP3/4/9/10
      101: { cap: 'measure_humidity', divisor: 1 },
      106: { cap: 'measure_luminance', type: 'lux_direct' },
      110: { cap: 'measure_battery', divisor: 1 },
      111: { cap: 'measure_temperature', divisor: 10 },
    }
  },

  // v5.5.509: Forum fix Ricardo_Lenior - Added mainsPowered + noBatteryCapability
  'ZY_M100_SIMPLE': {
    sensors: [
      '_TZE200_0u3bj3rc', '_TZE200_mx6u6l4y', '_TZE200_v6ossqfy',
      // v5.5.281: Added from Z2M research (removed _TZE200_3towulqd - now in ZG_204ZV_MULTISENSOR)
      '_TZE200_1ibpyhdc', '_TZE204_1ibpyhdc',
      // v5.5.509: Additional mains-powered ceiling sensors
      '_TZE200_auin8mzr', '_TZE204_auin8mzr',
    ],
    battery: false,
    mainsPowered: true,           // v5.5.509: Force mains power detection
    noBatteryCapability: true,    // v5.5.509: Remove battery capability for ceiling sensors
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
    // v5.5.983: 4x4_Pete forum fix - suppress battery spam warnings
    suppressBatteryWarnings: true,
    batteryThrottleMs: 3600000,  // Only update battery max every hour
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      4: { cap: 'measure_battery', divisor: 1 },
      9: { cap: 'measure_luminance', divisor: 1 },
      // v5.5.983: Remove duplicate battery DP15 - causes spam
      // 15: { cap: 'measure_battery', divisor: 1 },
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
      '_TZE284_debczeci',  // v5.8.3: Diag 7570421d - motion every 5 min
    ],
    battery: false,
    mainsPowered: true,
    noBatteryCapability: true,  // v5.5.326: Force remove battery
    hasIlluminance: true,
    noTemperature: true,    // v5.5.377: mmWave radar has NO temp sensor (Z2M #27212, #30326)
    noHumidity: true,       // v5.5.377: mmWave radar has NO humidity sensor
    needsPolling: false,  // v5.5.326: Disable polling - rely on inference only
    invertPresence: true,   // v5.5.775: FORUM FIX - Ronny #1160+ reports motion stuck YES, test inversion
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
    mainsPowered: true,
    noBatteryCapability: true,
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
    mainsPowered: true,
    noBatteryCapability: true,
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
    mainsPowered: true,
    noBatteryCapability: true,
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
    mainsPowered: true,
    noBatteryCapability: true,
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
    mainsPowered: true,           // v5.5.509: Force mains power
    noBatteryCapability: true,    // v5.5.509: Remove battery capability
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
  // TYPE G: ZG-204ZM PIR + 24GHz Radar Battery Sensor (HOBEIAN / Tuya)
  // v5.5.772: CORRECTED based on USER INTERVIEW DATA - HYBRID device!
  // 
  // USER INTERVIEW DATA (Jan 24, 2026):
  // manufacturerName: "HOBEIAN", modelId: "ZG-204ZM"
  // Input Clusters: [0, 1, 3, 1024, 1280, 61184]
  //   - 0 (basic): Device info
  //   - 1 (powerConfiguration): Battery (batteryVoltage=30, batteryPercentageRemaining=200)
  //   - 3 (identify): Identify
  //   - 1024 (illuminanceMeasurement): ZCL illuminance! (measuredValue=1, max=4000)
  //   - 1280 (iasZone): ZCL motion! (zoneType=motionSensor, zoneState=enrolled)
  //   - 61184 (tuya): Additional Tuya DPs for settings
  //
  // CRITICAL: This is a HYBRID device - uses BOTH ZCL AND Tuya DP!
  //   - Motion: via IAS Zone cluster 1280 (ZCL)
  //   - Illuminance: via illuminanceMeasurement cluster 1024 (ZCL)
  //   - Battery: via powerConfiguration cluster 1 (ZCL)
  //   - Settings: via Tuya DP cluster 61184 (DP2, DP4, DP102, etc.)
  //
  // SOURCES (12+):
  // 1. USER INTERVIEW DATA (primary source!)
  // 2. Z2M: https://www.zigbee2mqtt.io/devices/ZG-204ZM.html
  // 3. Z2M Issue #21919: https://github.com/Koenkk/zigbee2mqtt/issues/21919
  // 4. ZHA Issue #3125: https://github.com/zigpy/zha-device-handlers/issues/3125
  // 5. SmartHomeScene Review
  // 6. Johan Bendz PR #1306
  // 7. Hubitat/kkossev implementations
  //
  // NOTE: _TZE200_* variants use pure Tuya DP (see ZG_204ZM_RADAR config below)
  //       But "HOBEIAN" branded uses hybrid ZCL + Tuya!
  // ─────────────────────────────────────────────────────────────────────────────
  'HOBEIAN_ZG204ZM': {
    sensors: ['HOBEIAN'],
    modelId: 'ZG-204ZM',
    battery: true,
    useZcl: true,           // v5.5.772: YES - illuminance via cluster 1024!
    useIasZone: true,       // v5.5.772: YES - motion via IAS Zone cluster 1280!
    useTuyaDP: true,        // v5.5.772: YES - settings via Tuya DP cluster 61184
    hasIlluminance: true,   // Via ZCL cluster 1024, NOT Tuya DP106!
    noTemperature: true,    // NO temperature sensor on this device
    noHumidity: true,       // NO humidity sensor on this device
    writableDPs: [2, 4, 102, 104, 105, 107, 108, 109],
    dpMap: {
      // ═══════════════════════════════════════════════════════════════════
      // PRESENCE: Handled by IAS Zone cluster 1280, NOT Tuya DP!
      // But we keep DP mappings in case Tuya cluster also reports
      // ═══════════════════════════════════════════════════════════════════
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      101: { cap: 'alarm_motion', type: 'motion_state_enum', enumMap: { 0: false, 1: true, 2: true, 3: true } },
      
      // ═══════════════════════════════════════════════════════════════════
      // ILLUMINANCE: Handled by ZCL cluster 1024, NOT Tuya DP106!
      // But we keep DP106 mapping as fallback
      // ═══════════════════════════════════════════════════════════════════
      106: { cap: 'measure_luminance', type: 'lux_direct' },
      
      // ═══════════════════════════════════════════════════════════════════
      // SETTINGS (via Tuya DP cluster 61184) - these ARE Tuya DPs
      // ═══════════════════════════════════════════════════════════════════
      2: { cap: null, setting: 'large_motion_detection_sensitivity', min: 0, max: 10 },
      4: { cap: null, setting: 'large_motion_detection_distance', divisor: 100, min: 0, max: 10 },
      102: { cap: null, setting: 'fading_time', min: 0, max: 28800 },
      104: { cap: null, setting: 'medium_motion_detection_distance', divisor: 100 },
      105: { cap: null, setting: 'medium_motion_detection_sensitivity', min: 0, max: 10 },
      107: { cap: null, setting: 'indicator' },
      108: { cap: null, setting: 'small_detection_distance', divisor: 100 },
      109: { cap: null, setting: 'small_detection_sensitivity', min: 0, max: 10 },
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // v5.5.740: TYPE G1b: HOBEIAN 10G Radar Multi-Sensor (from JohanBendz PR #1306)
  // Source: https://github.com/JohanBendz/com.tuya.zigbee/pull/1306
  // Hubitat reference: https://github.com/kkossev/Hubitat
  // UNIQUE: This radar ALSO has temperature + humidity sensors!
  // DP1=presence, DP101=humidity/10, DP106=illuminance, DP111=temperature/10
  // ─────────────────────────────────────────────────────────────────────────────
  'HOBEIAN_10G_MULTI': {
    sensors: [
      '_TZE200_rhgsbacq',  // HOBEIAN 10G radar multi-sensor
      '_TZE204_rhgsbacq',
    ],
    modelId: 'ZG-227Z',  // v5.5.740: From PR #1306
    battery: false,
    mainsPowered: true,
    noBatteryCapability: true,
    hasIlluminance: true,
    hasTemperature: true,   // v5.5.740: UNIQUE - this radar HAS temp sensor!
    hasHumidity: true,      // v5.5.740: UNIQUE - this radar HAS humidity sensor!
    noTemperature: false,   // Override default
    noHumidity: false,      // Override default
    dpMap: {
      // ═══════════════════════════════════════════════════════════════════
      // PRESENCE DETECTION
      // ═══════════════════════════════════════════════════════════════════
      1: { cap: 'alarm_motion', type: 'presence_bool' },

      // ═══════════════════════════════════════════════════════════════════
      // ENVIRONMENTAL SENSORS (unique to this radar!)
      // ═══════════════════════════════════════════════════════════════════
      101: { cap: 'measure_humidity', multiplier: 10 },   // Humidity ×10 (value 9 → 90%)
      106: { cap: 'measure_luminance', type: 'lux_direct' }, // Illuminance
      111: { cap: 'measure_temperature', divisor: 10 },   // Temperature ÷10
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // v5.5.990: TYPE G1c: ZCL-ONLY variant for _TZE200_kb5noeto (Patrick_Van_Deursen)
  // Forum #1297: This device variant has NO Tuya DP cluster (61184)!
  // Uses pure ZCL: IAS Zone (motion), illuminanceMeasurement (lux), powerConfiguration (battery)
  // PERMISSIVE MODE: Works with ZCL clusters only, Tuya DP optional
  // ─────────────────────────────────────────────────────────────────────────────
  'ZCL_ONLY_RADAR': {
    sensors: [
      '_TZE200_kb5noeto',  // v5.5.990: Patrick_Van_Deursen - ZCL-only variant
      '_TZE204_ztqnh5cg',  // v5.5.990: tlink - ZCL-only variant
      '_TZE200_3towulqd',  // v5.6.0: Interview - NO cluster 61184! Uses IAS Zone + Illuminance + PowerConfig
    ],
    battery: true,
    useZcl: true,           // v5.5.990: Primary - use ZCL clusters
    useIasZone: true,       // v5.5.990: Motion via IAS Zone cluster 1280
    useTuyaDP: false,       // v5.5.990: NO Tuya DP cluster on these variants!
    permissiveMode: true,   // v5.5.990: Accept whatever clusters are available
    hasIlluminance: true,   // Via ZCL illuminanceMeasurement cluster 1024
    noTemperature: true,    // No temperature sensor
    noHumidity: true,       // No humidity sensor
    // Fallback DP mappings IF Tuya cluster becomes available at runtime
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool', optional: true },
      106: { cap: 'measure_luminance', type: 'lux_direct', optional: true },
      121: { cap: 'measure_battery', divisor: 1, optional: true },
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TYPE G2: ZG-204ZM Pure Tuya DP variants (_TZE200_* manufacturerNames)
  // These use Tuya DP cluster for ALL data including presence/illuminance
  // Source: https://github.com/Koenkk/zigbee2mqtt/issues/21919
  //
  // NOTE: _TZE200_kb5noeto moved to ZCL_ONLY_RADAR (some variants have no Tuya DP)
  // ─────────────────────────────────────────────────────────────────────────────
  'ZG_204ZM_RADAR': {
    sensors: [
      '_TZE200_2aaelwxk', '_TZE204_2aaelwxk',
      // '_TZE200_kb5noeto' moved to ZCL_ONLY_RADAR - v5.5.990
      '_TZE200_tyffvoij',
    ],
    battery: true,
    hasIlluminance: true,
    noTemperature: true,
    noHumidity: true,
    // v5.5.983: 4x4_Pete forum fix - suppress battery spam warnings
    suppressBatteryWarnings: true,
    batteryThrottleMs: 3600000,  // Only update battery max every hour
    writableDPs: [2, 4, 102, 107, 122, 123],
    dpMap: {
      // ═══════════════════════════════════════════════════════════════════
      // PRESENCE DETECTION via Tuya DP
      // ═══════════════════════════════════════════════════════════════════
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      101: { cap: 'alarm_motion', type: 'motion_state_enum' },  // 0=none, 1=large, 2=small, 3=static

      // ═══════════════════════════════════════════════════════════════════
      // ILLUMINANCE + BATTERY via Tuya DP
      // ═══════════════════════════════════════════════════════════════════
      106: { cap: 'measure_luminance', type: 'lux_direct' },
      121: { cap: 'measure_battery', divisor: 1 },

      // ═══════════════════════════════════════════════════════════════════
      // SETTINGS
      // ═══════════════════════════════════════════════════════════════════
      2: { cap: null, setting: 'static_detection_sensitivity', min: 0, max: 10 },
      4: { cap: null, setting: 'static_detection_distance', divisor: 100, min: 0, max: 6 },
      102: { cap: null, setting: 'fading_time', min: 0, max: 28800 },
      107: { cap: null, setting: 'indicator' },
      122: { cap: null, setting: 'motion_detection_mode' },  // 0=only_pir, 1=pir_and_radar, 2=only_radar
      123: { cap: null, setting: 'motion_detection_sensitivity', min: 0, max: 10 },
      108: { cap: null, internal: 'small_detection_distance', divisor: 100 },
      109: { cap: null, internal: 'small_detection_sensitivity' },
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TYPE H: TZ3000 PIR/Ceiling Sensors (hybrid ZCL + Tuya DP)
  // v5.5.499: FORUM FIX - Added DP103 illuminance + settings for ceiling sensors
  // v5.7.45: MOVED _TZ3000_8bxrzyxz to ZG_204ZV_MULTISENSOR (Peter #1342 confirms it's a ZG-204ZV)
  // ─────────────────────────────────────────────────────────────────────────────
  'TZ3000_PIR': {
    sensors: [
      '_TZ3000_aigddb2b',
      '_TZ3000_ky0fq4ho',
      '_TZ3210_fkzihax8'
    ],
    battery: false,         // v5.5.519: Mains powered PIR
    useZcl: true,
    useIasZone: true,       // v5.5.519: IAS Zone ONLY for _TZ321C_fkzihax8
    hasIlluminance: true,   // v5.5.499: Has illuminance via Tuya DP103
    noTemperature: true,    // v5.5.372: PIR sensors have NO temp
    noHumidity: true,       // v5.5.372: PIR sensors have NO humidity
    dpMap: {
      // v5.5.499: Ceiling PIR sensors report illuminance via DP103
      103: { cap: 'measure_luminance', type: 'lux_direct' },
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TYPE H2: LeapMMW 5.8G mmWave Radar (_TZ321C_fkzihaxe8 with 'e', _TZ321C_4slreunp)
  // v5.5.526: CORRECTED - Only devices WITH 'e' are mmWave radar with Tuya DPs
  // _TZ321C_fkzihaxe8 (with 'e') = mmWave radar using Tuya DPs
  // _TZ321C_fkzihax8 (without 'e') = Pure IAS Zone PIR -> MOVED to motion_sensor driver
  // Source: Z2M #23853, #23913 - Uses IAS Zone (1280) for occupancy + Tuya DPs for radar
  // MAINS POWERED (Router), NOT battery!
  // ─────────────────────────────────────────────────────────────────────────────
  'LEAPMW_5G8_RADAR': {
    sensors: [
      '_TZ321C_fkzihaxe8', // LeapMMW mmWave radar (WITH 'e' = Tuya DP support)
      '_TZ321C_4slreunp',  // LeapMMW MTD095-ZB variant
    ],
    battery: false,         // MAINS POWERED - Router device
    useIasZone: true,       // Occupancy via IAS Zone cluster 1280
    hasIlluminance: true,   // DP107 illuminance
    noTemperature: true,
    noHumidity: true,
    needsMagicPacket: true, // v5.5.518: Requires Tuya magic packet for DP communication
    dpMap: {
      // ═══════════════════════════════════════════════════════════════════
      // RADAR DATA via Tuya DPs (Source: Z2M converter)
      // ═══════════════════════════════════════════════════════════════════
      107: { cap: 'measure_luminance', divisor: 10, type: 'lux_direct' },
      109: { cap: 'measure_distance', divisor: 100 },      // debug_distance (real-time)
      119: { cap: 'measure_distance', divisor: 100 },      // target_distance
      // ═══════════════════════════════════════════════════════════════════
      // SETTINGS via Tuya DPs
      // ═══════════════════════════════════════════════════════════════════
      101: { cap: null, setting: 'entry_sensitivity', min: 10, max: 100 },
      102: { cap: null, setting: 'entry_distance', divisor: 100, min: 0, max: 10 },
      103: { cap: null, setting: 'departure_delay', min: 5, max: 7200 },
      104: { cap: null, setting: 'entry_filter_time', divisor: 100 },
      105: { cap: null, setting: 'block_time', divisor: 10 },
      108: { cap: null, setting: 'debug_mode' },           // 0=off, 1=on
      110: { cap: null, internal: 'debug_countdown' },
      111: { cap: null, setting: 'radar_scene' },          // 0-7 presets
      112: { cap: null, setting: 'sensor_mode' },          // 0=normal, 1=occupied, 2=unoccupied
      114: { cap: null, setting: 'status_indication' },    // LED indicator
      115: { cap: null, setting: 'radar_sensitivity', min: 10, max: 100 },
      116: { cap: null, setting: 'minimum_range', divisor: 100, min: 0, max: 10 },
      117: { cap: null, setting: 'maximum_range', divisor: 100, min: 0, max: 10 },
      120: { cap: null, setting: 'distance_report_mode' }, // 0=normal, 1=occupancy_detection
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TYPE I: TZE200_crq3r3la Presence Sensor (Forum report 0790faa4)
  // v5.5.503: User reported as "presence sensor" wrongly classified as climate_sensor
  // DPs: 103=illuminance, 113/119/123/124=settings
  // ─────────────────────────────────────────────────────────────────────────────
  'TZE200_CRQ3R3LA': {
    sensors: ['_TZE200_crq3r3la', '_TZE200_CRQ3R3LA'],
    battery: true,
    hasIlluminance: true,
    noTemperature: true,
    noHumidity: true,
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      103: { cap: 'measure_luminance', type: 'lux_direct' },
      113: { cap: null, setting: 'mode' },
      119: { cap: null, setting: 'sensitivity' },
      123: { cap: null, setting: 'detection_delay' },
      124: { cap: null, setting: 'indicator' },
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
      // v5.5.554: DP119 presence detection (diagnostic report 725b1c78)
      119: { cap: 'alarm_motion', type: 'presence_bool' },
    }
  },
};

// Build reverse lookup: manufacturerName -> config
// v5.7.41: Use LOWERCASE keys for case-insensitive matching
const MANUFACTURER_CONFIG_MAP = {};
for (const [configName, config] of Object.entries(SENSOR_CONFIGS)) {
  for (const mfr of config.sensors) {
    MANUFACTURER_CONFIG_MAP[mfr.toLowerCase()] = { ...config, configName };
  }
}

// Get sensor config by manufacturerName and optional modelId
// v5.5.512: Added modelId matching for HOBEIAN devices
function getSensorConfig(manufacturerName, modelId = null) {
  // v5.5.803: HOBEIAN special handling - match by manufacturerName + modelId
  // HOBEIAN makes multiple products, need modelId to distinguish
  // v5.5.803 FIX: Handle "null" string and actual null values - use DEFAULT config for auto-discovery
  if (manufacturerName === 'HOBEIAN') {
    // Check for valid modelId (not null, not "null" string, not empty)
    const validModelId = modelId && modelId !== 'null' && modelId.trim() !== '';
    
    if (validModelId) {
      if (modelId === 'ZG-204ZM') {
        console.log(`[RADAR] 🔍 HOBEIAN ZG-204ZM matched → HOBEIAN_ZG204ZM config (HYBRID: ZCL + Tuya DP)`);
        return { ...SENSOR_CONFIGS.HOBEIAN_ZG204ZM, configName: 'HOBEIAN_ZG204ZM' };
      }
      // v5.5.841: HOBEIAN ZG-204ZV MULTISENSOR (Peter_van_Werkhoven diagnostic fix)
      // 5-in-1 sensor: motion, illuminance, temp, humidity, battery
      // DP mappings: DP1=motion, DP3=temp÷10, DP4=humidity, DP9=lux, DP10=battery
      if (modelId === 'ZG-204ZV') {
        console.log(`[RADAR] 🔍 HOBEIAN ZG-204ZV matched → ZG_204ZV_MULTISENSOR config (5-in-1: motion+lux+temp+hum+battery)`);
        return { ...SENSOR_CONFIGS.ZG_204ZV_MULTISENSOR, configName: 'ZG_204ZV_MULTISENSOR' };
      }
      // v5.5.740: HOBEIAN 10G multi-sensor from PR #1306
      if (modelId === 'ZG-227Z') {
        console.log(`[RADAR] 🔍 HOBEIAN ZG-227Z matched → HOBEIAN_10G_MULTI config (radar + temp/humidity)`);
        return { ...SENSOR_CONFIGS.HOBEIAN_10G_MULTI, configName: 'HOBEIAN_10G_MULTI' };
      }
    }
    
    // v5.5.803: When modelId is null/unknown, use HOBEIAN_10G_MULTI as default
    // because it has the most complete feature set (temp + humidity + illuminance + motion)
    // Users with ZG-204ZM (no temp/humidity) will simply see those values as null
    console.log(`[RADAR] 🔍 HOBEIAN with unknown modelId "${modelId}" → using HOBEIAN_10G_MULTI config (most complete)`);
    console.log(`[RADAR] ℹ️ If wrong, device should be re-paired to get correct modelId`);
    return { ...SENSOR_CONFIGS.HOBEIAN_10G_MULTI, configName: 'HOBEIAN_10G_MULTI_FALLBACK' };
  }

  // v5.5.286: RONNY FIX - Enhanced matching for TZE284/TZE204 series
  // When exact match fails, try pattern matching for known problematic series

  // Try exact match first (case-insensitive)
  // v5.7.41: FIX - Device reports _TZ3000_8BXRZYXZ but config has _TZ3000_8bxrzyxz
  const mfrKey = manufacturerName?.toLowerCase() || '';
  if (MANUFACTURER_CONFIG_MAP[mfrKey]) {
    return MANUFACTURER_CONFIG_MAP[mfrKey];
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
      // v5.8.12: RONNY FORUM - state=2 (move) causes random triggers, ignore it
      if (value === 0) {
        result = false;
      } else if (value === 1) {
        result = true;  // Confirmed presence
      } else if (value === 2) {
        // v5.8.12: IGNORE "move" state completely - it causes random false triggers
        // This is radar noise from environmental interference (fans, curtains, etc)
        console.log(`[PRESENCE-FIX] 🚫 gkfbdvyx: IGNORING move state (2) - radar noise`);
        return null;  // Return null to skip this update entirely
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

  // v5.5.793: HARD CLAMP to max AND detect 30↔2000 oscillation
  if (lux > VALIDATION.LUX_ZYM100_MAX) {
    console.log(`[LUX] 🔒 Clamped ${lux} -> ${VALIDATION.LUX_ZYM100_MAX} (max spec limit)`);
    lux = VALIDATION.LUX_ZYM100_MAX;
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
    if (lockDuration < TIMING.LUX_OSCILLATION_LOCK_MS) { // v5.5.793: Use constant
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
    if (rawValue > 0) {
      lux = Math.round(rawValue / 10);
    } else {
      lux = 0;
    }
  }
  else if (type === 'lux_direct') {
    // v5.5.316: Most Tuya sensors report direct lux - NO conversion needed
    // Z2M #27212: _TZE284_iadro9bf reports "illuminance": 282 (direct lux)
    lux = rawValue;
  }
  else if (type === 'lux_div10') {
    lux = rawValue / 10;
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

// v5.5.929: SMART DISTANCE TRANSFORMATION with auto-divisor detection
// Peter_van_Werkhoven fix: Value 8 instead of 1.5m - wrong divisor detection
// Z2M/Hubitat research: ALL radar sensors use scale 100 (cm to meters)
// OEM variants may report in different units - auto-detect and correct
const distanceDivisorCache = new Map(); // Cache learned divisors per device

function transformDistance(value, divisor = 100, manufacturerName = '', deviceId = '') {
  const originalValue = value;
  const cacheKey = `${manufacturerName}_${deviceId}`;
  
  // v5.5.929: Validate input
  if (typeof value !== 'number' || isNaN(value) || value < 0) {
    console.log(`[DISTANCE-FIX] ⚠️ Invalid distance value for ${manufacturerName}: ${originalValue}`);
    return null;
  }

  // v5.5.929: SMART DIVISOR DETECTION for OEM variants
  // If raw value seems too high for meters but makes sense for cm, use 100
  // If raw value seems right for dm (decimeters), use 10
  // Z2M/Hubitat standard: most sensors report in cm (divisor 100)
  let effectiveDivisor = divisor;
  
  // Check cached divisor first (learned from previous values)
  if (distanceDivisorCache.has(cacheKey)) {
    effectiveDivisor = distanceDivisorCache.get(cacheKey);
  } else {
    // v5.5.929: Auto-detect divisor based on value range
    // Typical radar range is 0-10m, so valid values after conversion should be 0-10
    const withDiv100 = value / 100;  // cm to m
    const withDiv10 = value / 10;    // dm to m
    const withDiv1 = value;          // already in m
    
    // If value/100 gives reasonable range (0-10m), use 100
    if (withDiv100 >= 0 && withDiv100 <= 10) {
      effectiveDivisor = 100;
    }
    // If value/10 gives reasonable range but /100 is too small (<0.1m), use 10
    else if (withDiv10 >= 0.1 && withDiv10 <= 10 && withDiv100 < 0.1) {
      effectiveDivisor = 10;
    }
    // If raw value is already in valid range (0-10), no division needed
    else if (withDiv1 >= 0 && withDiv1 <= 10) {
      effectiveDivisor = 1;
    }
    // Default to 100 (Z2M standard)
    else {
      effectiveDivisor = 100;
    }
    
    // Cache the learned divisor for this device
    if (effectiveDivisor !== divisor) {
      console.log(`[DISTANCE-FIX] 🔧 Auto-detected divisor for ${manufacturerName}: ${divisor} → ${effectiveDivisor}`);
      distanceDivisorCache.set(cacheKey, effectiveDivisor);
    }
  }

  let distance = value / effectiveDivisor;

  // v5.5.793: Use validation constants for range check
  if (distance < VALIDATION.DISTANCE_MIN) distance = VALIDATION.DISTANCE_MIN;
  if (distance > VALIDATION.DISTANCE_MAX) {
    console.log(`[DISTANCE-FIX] 📏 Distance clamped for ${manufacturerName}: ${distance}m -> ${VALIDATION.DISTANCE_MAX}m`);
    distance = VALIDATION.DISTANCE_MAX;
  }

  const result = Math.round(distance * 100) / 100; // 2 decimal places
  console.log(`[DISTANCE-FIX] ✅ ${manufacturerName}: ${originalValue} (÷${effectiveDivisor}) -> ${result}m`);
  return result;
}

class PresenceSensorRadarDevice extends HybridSensorBase {

  /**
   * v5.5.277: Get manufacturerName with multiple fallback methods
   * Ronny fix: this.getData()?.manufacturerName was returning empty!
   * v5.7.48: Don't cache empty values - retry on each call until we get a valid name
   */
  _getManufacturerName() {
    // v5.7.48: Only return cache if it's a non-empty valid value
    if (this._cachedManufacturerName && this._cachedManufacturerName.length > 0) {
      return this._cachedManufacturerName;
    }

    let mfr = null;

    // Method 1: getData() (Homey standard)
    mfr = this.getData()?.manufacturerName;

    // Method 2: Settings (stored during pairing) - try both methods
    if (!mfr) mfr = this.getSetting('zb_manufacturer_name');
    
    // Method 2b: v5.7.52 - Try getSettings() object directly (more reliable)
    if (!mfr) {
      try {
        const settings = this.getSettings();
        mfr = settings?.zb_manufacturer_name;
      } catch (e) { /* ignore */ }
    }

    // Method 3: Store data
    if (!mfr) mfr = this.getStoreValue('manufacturerName');
    if (!mfr) mfr = this.getStoreValue('zb_manufacturer_name');

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
    
    // Method 6: v5.7.52 - Try node.manufacturerName directly
    if (!mfr && this.node?.manufacturerName) {
      mfr = this.node.manufacturerName;
    }

    // v5.7.48: Only cache if we found a valid value
    if (mfr && mfr.length > 0) {
      this._cachedManufacturerName = mfr;
    }
    
    return mfr || '';
  }

  /**
   * v5.5.277: Get sensor configuration based on manufacturerName
   * v5.5.364: Enhanced with auto-discovery for unknown devices
   * v5.7.48: Don't cache DEFAULT config when mfr is empty - retry later
   */
  _getSensorConfig() {
    const mfr = this._getManufacturerName();
    
    // v5.7.48: If we have a cached config, check if it's still valid
    // If mfr was empty before but now available, re-lookup config
    if (this._sensorConfig) {
      const cachedConfigName = this._sensorConfig.configName || 'DEFAULT';
      // If we have a real mfr now but config is DEFAULT, try to find a better match
      if (cachedConfigName === 'DEFAULT' && mfr && mfr.length > 0) {
        this.log(`[RADAR] 🔄 Re-checking config: mfr now available as "${mfr}"`);
        this._sensorConfig = null; // Force re-lookup
      } else {
        return this._sensorConfig;
      }
    }
    
    // v5.5.984: Peter_van_Werkhoven HOBEIAN fix - check multiple sources for modelId
    const settings = this.getSettings() || {};
    const modelId = this.getData()?.modelId 
      || settings.zb_model_id 
      || settings.zb_modelId 
      || this.getStoreValue?.('modelId')
      || null;
    this._sensorConfig = getSensorConfig(mfr, modelId);
    this.log(`[RADAR] 🔍 ManufacturerName: "${mfr}", ModelId: "${modelId}" → config: ${this._sensorConfig.configName || 'DEFAULT'}`);

    // v5.5.364: Initialize auto-discovery for DEFAULT/unknown devices
    if (this._sensorConfig.configName === 'DEFAULT') {
      if (!this._dpAutoDiscovery) {
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
    // v5.7.52: Use _getManufacturerName() for consistent multi-source retrieval
    // This ensures we get the manufacturer from ANY available source
    const mfr = this._getManufacturerName();
    const dpMap = config.dpMap || {};
    const mappings = {};

    // Only log if mfr changed to reduce spam
    if (this._lastLoggedMfr !== mfr) {
      this.log(`[RADAR] 🧠 Using config: ${config.configName || 'DEFAULT'} for ${mfr || '(empty mfr)'}`);
      this._lastLoggedMfr = mfr;
    }

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
        // v5.5.929: Distance DP - use smart transform with auto-divisor detection
        const deviceId = this.getData()?.id || '';
        mappings[dp] = {
          capability: dpConfig.cap,
          transform: (v) => {
            const result = transformDistance(v, dpConfig.divisor || 100, mfr, deviceId);
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
    // v5.7.34: Use _getManufacturerName() for consistent multi-source retrieval
    const mfr = this._getManufacturerName();
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

    // v5.5.990: Permissive mode for ZCL-only variants (Patrick_Van_Deursen #1297)
    // These devices don't have Tuya DP cluster but work fine with ZCL
    if (config.permissiveMode) {
      this.log('[RADAR] 🔓 PERMISSIVE MODE: ZCL-only variant (no Tuya DP required)');
      this.log('[RADAR] Using ZCL clusters: IAS Zone (motion), illuminanceMeasurement (lux), powerConfiguration (battery)');
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

      // v5.5.990: For ZCL-only variants, setup ZCL clusters even in battery mode
      if (config.permissiveMode || config.useZcl) {
        this.log('[RADAR] 📡 Setting up ZCL clusters for ZCL-only variant');
        await this._setupZclClusters(zclNode);
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

    // v5.5.518: Send Tuya magic packet for devices that need it (LeapMMW 5.8G hybrid)
    // These devices don't show cluster 61184 in interview but still use Tuya DPs
    if (config.needsMagicPacket) {
      await this._sendTuyaMagicPacket(zclNode);
    }

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

    // v5.5.903: CAPABILITY MANAGEMENT - Add/remove based on device config
    // Z2M research: ZG-204ZV does NOT have measure_distance (static_detection_distance is a SETTING, not measurement)
    const hasDistanceDP = config.dpMap && Object.values(config.dpMap).some(dp => dp.cap === 'measure_distance');
    const hasLuxDP = config.hasIlluminance || (config.dpMap && Object.values(config.dpMap).some(dp => dp.cap === 'measure_luminance'));
    
    // Add capabilities that ARE supported
    if (hasLuxDP && !this.hasCapability('measure_luminance')) {
      try {
        await this.addCapability('measure_luminance');
        this.log('[RADAR] ✅ Added measure_luminance (config supports it)');
      } catch (e) { /* ignore */ }
    }
    
    if (hasDistanceDP && !this.hasCapability('measure_distance')) {
      try {
        await this.addCapability('measure_distance');
        this.log('[RADAR] ✅ Added measure_distance (config supports it)');
      } catch (e) { /* ignore */ }
    }
    
    // v5.5.903: REMOVE orphan capabilities that are NOT supported by this device
    // Fixes Peter's ZG-204ZV showing "Distance" from previous pairing
    if (!hasDistanceDP && this.hasCapability('measure_distance')) {
      try {
        await this.removeCapability('measure_distance');
        this.log('[RADAR] 🧹 Removed orphan measure_distance (not supported by this sensor)');
      } catch (e) { /* ignore */ }
    }

    // v5.5.852: ADD temperature/humidity for sensors that support them (ZG-204ZV fix)
    // Peter_van_Werkhoven forum #1203: ZG-204ZV should have temp+humidity
    if (!config.noTemperature && !this.hasCapability('measure_temperature')) {
      try {
        await this.addCapability('measure_temperature');
        this.log('[RADAR] 🌡️ Added measure_temperature (sensor supports it)');
      } catch (e) { /* ignore */ }
    }
    if (!config.noHumidity && !this.hasCapability('measure_humidity')) {
      try {
        await this.addCapability('measure_humidity');
        this.log('[RADAR] 💧 Added measure_humidity (sensor supports it)');
      } catch (e) { /* ignore */ }
    }
    
    // v5.5.903: Remove orphan temp/humidity if config says device doesn't have them
    if (config.noTemperature && this.hasCapability('measure_temperature')) {
      try {
        await this.removeCapability('measure_temperature');
        this.log('[RADAR] 🧹 Removed orphan measure_temperature (not supported)');
      } catch (e) { /* ignore */ }
    }
    if (config.noHumidity && this.hasCapability('measure_humidity')) {
      try {
        await this.removeCapability('measure_humidity');
        this.log('[RADAR] 🧹 Removed orphan measure_humidity (not supported)');
      } catch (e) { /* ignore */ }
    }

    // v5.5.907: ADD battery capability for sensors with battery DP (Peter ZG-204ZV fix)
    const hasBatteryDP = config.dpMap && Object.values(config.dpMap).some(dp => dp.cap === 'measure_battery');
    if ((config.battery || hasBatteryDP) && !config.noBatteryCapability && !this.hasCapability('measure_battery')) {
      try {
        await this.addCapability('measure_battery');
        this.log('[RADAR] 🔋 Added measure_battery (sensor supports it)');
      } catch (e) { /* ignore */ }
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
          const rawOccupied = (v & 0x01) !== 0;
          const occupied = this._applyPresenceInversion(rawOccupied);
          this.log(`[RADAR-BATTERY] Occupancy: raw=${rawOccupied} → ${occupied}`);
          this.setCapabilityValue('alarm_motion', occupied).catch(() => { });
          this._triggerPresenceFlows(occupied);
        });
        this.log('[RADAR] ✅ Passive occupancy listener configured');
      }
    } catch (e) { /* ignore */ }
  }

  /**
   * v5.5.790: Apply presence inversion for ZCL paths
   * Forum INT-001: _TZE284_iadro9bf motion ALWAYS YES - ZCL not using invertPresence
   */
  _applyPresenceInversion(occupied) {
    const config = this._getSensorConfig();
    const settings = this.getSettings() || {};
    const invertPresence = settings.invert_presence ?? config.invertPresence ?? false;
    
    if (invertPresence) {
      const inverted = !occupied;
      this.log(`[RADAR] 🔄 ZCL presence inversion: ${occupied} → ${inverted}`);
      return inverted;
    }
    return occupied;
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

    // v5.7.52: CRITICAL FIX - Check static dpMap FIRST before auto-discovery
    // Peter #1342/#1343: DP4 was being classified as battery by auto-discovery
    // instead of humidity as specified in ZG_204ZV_MULTISENSOR config
    const config = this._getSensorConfig();
    const dpMap = this._getEffectiveDPMap();
    
    // If static config explicitly maps this DP to a capability, handle it directly
    // This prevents auto-discovery from misclassifying known DPs
    const staticMapping = dpMap[dpId];
    if (staticMapping?.cap) {
      // DP has explicit capability mapping - skip auto-discovery, handle below
      this.log(`[RADAR] 📋 DP${dpId} has static mapping → ${staticMapping.cap}, skipping auto-discovery`);
    } else {
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
    }

    // v5.5.310: FIXED - Handle DP12 and DP103 locally, NOT via HybridSensorBase!
    // Problem: HybridSensorBase universal profile maps DP103 to temperature, not lux
    // Solution: Handle lux DPs (12, 102, 103, 104) directly here using local dpMap config
    // Note: config and dpMap already declared above for static mapping check

    // Check if this DP is a lux DP in our config - handle locally
    if (dpMap[dpId]?.cap === 'measure_luminance') {
      const luxValue = this._parseBufferValue(data.value || data.data);
      const mfr = this._getManufacturerName();
      const deviceId = this.getData()?.id;
      let finalLux = transformLux(luxValue, dpMap[dpId].type || 'lux_direct', mfr, deviceId);

      // v5.7.52: CRITICAL FIX - Shared throttle with ZCL to prevent fighting
      // Track Tuya DP updates and skip if ZCL updated recently
      const now = Date.now();
      this._luxLastUpdateSource = this._luxLastUpdateSource || {};
      
      // If ZCL updated within last 5s, skip Tuya DP update to prevent fighting
      if (this._luxLastUpdateSource.zcl && now - this._luxLastUpdateSource.zcl < 5000) {
        return;
      }
      this._luxLastUpdateSource.tuya = now;

      // v5.5.985: Peter #1282 - Lux smoothing to prevent light flickering
      if (config.luxSmoothingEnabled) {
        const currentLux = this.getCapabilityValue('measure_luminance') || 0;
        const minChange = config.luxMinChangePercent || 10;
        const changePercent = currentLux > 0 ? Math.abs(finalLux - currentLux) / currentLux * 100 : 100;
        
        if (changePercent < minChange && currentLux > 0) {
          // Ignore small changes to prevent flow triggers
          return;
        }
        this.log(`[RADAR-LUX] ☀️ DP${dpId} → ${finalLux} lux (change: ${changePercent.toFixed(1)}%)`);
      } else {
        this.log(`[RADAR-LUX] ☀️ DP${dpId} → measure_luminance = ${finalLux} lux (local config)`);
      }
      
      this.setCapabilityValue('measure_luminance', parseFloat(finalLux)).catch(() => { });

      // v5.5.315: Feed lux to intelligent inference engine
      if (dpMap[dpId].feedInference) {
        this._feedLuxToInference(finalLux);
      }
      return;
    }

    // v5.5.932: PETER FIX - Handle temperature/humidity DPs locally when config specifies
    // HOBEIAN ZG-204ZV uses DP3=temp, DP4=humidity - must apply divisor correctly!
    if (dpMap[dpId]?.cap === 'measure_temperature') {
      const rawTemp = this._parseBufferValue(data.value || data.data);
      const divisor = dpMap[dpId].divisor || 10;
      const temp = Math.round((rawTemp / divisor) * 10) / 10;
      if (temp >= -40 && temp <= 80) {
        this.log(`[RADAR] 🌡️ DP${dpId} → temperature = ${temp}°C (raw: ${rawTemp}, ÷${divisor})`);
        this.setCapabilityValue('measure_temperature', temp).catch(() => { });
      } else {
        this.log(`[RADAR] ⚠️ DP${dpId} temperature out of range: ${temp}°C (raw: ${rawTemp})`);
      }
      return;
    }

    if (dpMap[dpId]?.cap === 'measure_humidity') {
      const rawHumid = this._parseBufferValue(data.value || data.data);
      const divisor = dpMap[dpId].divisor || 1;
      const multiplier = dpMap[dpId].multiplier || 1;
      // v5.5.987: Peter #1265 - Support multiplier for humidity (9% → 90%)
      const humidity = Math.round((rawHumid / divisor) * multiplier);
      if (humidity >= 0 && humidity <= 100) {
        this.log(`[RADAR] 💧 DP${dpId} → humidity = ${humidity}% (raw: ${rawHumid}, ÷${divisor}, ×${multiplier})`);
        this.setCapabilityValue('measure_humidity', humidity).catch(() => { });
      } else {
        this.log(`[RADAR] ⚠️ DP${dpId} humidity out of range: ${humidity}% (raw: ${rawHumid})`);
      }
      return;
    }

    // v5.5.932: Handle battery DPs locally when config specifies
    // v5.5.983: 4x4_Pete forum fix - add battery throttling to prevent spam
    if (dpMap[dpId]?.cap === 'measure_battery') {
      const rawBatt = this._parseBufferValue(data.value || data.data);
      const divisor = dpMap[dpId].divisor || 1;
      const battery = Math.round(rawBatt / divisor);
      if (battery >= 0 && battery <= 100) {
        // v5.5.983: Check battery throttling config
        const now = Date.now();
        const throttleMs = config?.batteryThrottleMs || 300000; // Default 5 min
        const lastBatteryUpdate = this._lastBatteryUpdate || 0;
        const currentBattery = this.getCapabilityValue('measure_battery');
        const batteryChange = Math.abs((currentBattery || 0) - battery);
        
        // Only update if: significant change (>5%) OR enough time passed OR first report
        if (batteryChange >= 5 || (now - lastBatteryUpdate) > throttleMs || lastBatteryUpdate === 0) {
          this.log(`[RADAR] 🔋 DP${dpId} → battery = ${battery}% (change: ${batteryChange}%)`);
          this.setCapabilityValue('measure_battery', battery).catch(() => { });
          this._lastBatteryUpdate = now;
        } else {
          // Suppress spam - don't log to reduce noise
        }
      }
      return;
    }

    // Only filter DPs that HybridSensorBase handles for settings (NOT capabilities!)
    const HYBRIDSENSOR_SETTINGS_DPS = [2, 15]; // settings only, NOT temp/humidity/battery
    if (HYBRIDSENSOR_SETTINGS_DPS.includes(dpId) && !dpMap[dpId]?.cap) {
      // Let HybridSensorBase handle settings DPs only
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
   * v5.5.902: FORUM FIX - Enhanced stuck detection for motion spam
   * _TZE284_iadro9bf sends motion=YES every 20s even without presence
   * v5.5.357: Original throttle + v5.5.902: Stuck pattern detection
   * Solution: If device is stuck sending same value, use distance-based inference instead
   */
  _throttleMotionSpam(presence, dpId) {
    const config = this._getSensorConfig();
    // v5.7.34: Use _getManufacturerName() for consistent multi-source retrieval
    const mfr = this._getManufacturerName();

    // Only apply to problematic sensors
    if (!mfr.includes('iadro9bf') && !mfr.includes('qasjif9e')) {
      return presence;
    }

    const now = Date.now();
    this._motionThrottle = this._motionThrottle || {
      lastUpdate: 0,
      lastValue: null,
      spamCount: 0,
      consecutiveSame: 0,  // v5.5.902: Track consecutive same values
      stuckMode: false     // v5.5.902: Device is stuck - use inference only
    };

    const timeSinceLastUpdate = now - this._motionThrottle.lastUpdate;

    // v5.5.902: STUCK PATTERN DETECTION
    // If we receive the same value 5+ times in a row, device is likely stuck
    if (presence === this._motionThrottle.lastValue) {
      this._motionThrottle.consecutiveSame++;
      if (this._motionThrottle.consecutiveSame >= 5 && !this._motionThrottle.stuckMode) {
        this._motionThrottle.stuckMode = true;
        this.log(`[RADAR] ⚠️ STUCK MODE ACTIVATED: ${this._motionThrottle.consecutiveSame} consecutive ${presence} values - using distance inference only`);
      }
    } else {
      // Value changed - reset stuck detection
      if (this._motionThrottle.stuckMode) {
        this.log(`[RADAR] ✅ STUCK MODE CLEARED: value changed from ${this._motionThrottle.lastValue} to ${presence}`);
      }
      this._motionThrottle.consecutiveSame = 0;
      this._motionThrottle.stuckMode = false;
    }

    // v5.5.902: In stuck mode, ignore DP1 completely - use distance inference only
    if (this._motionThrottle.stuckMode) {
      this.log(`[RADAR] 🚫 DP${dpId} BLOCKED (stuck mode): using distance-based inference instead`);
      return null;
    }

    // v5.5.793: Use TIMING constant for throttle
    // If same value and within throttle window, block it
    if (presence === this._motionThrottle.lastValue && timeSinceLastUpdate < TIMING.MOTION_THROTTLE_MS) {
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
   * v5.5.991: Peter #1297 - Added configurable motion throttle for ZG-204ZV disco lights fix
   */
  _handlePresenceWithDebounce(rawPresence, dpId) {
    // v5.5.357: THROTTLE MOTION SPAM FIRST
    const throttled = this._throttleMotionSpam(rawPresence, dpId);
    if (throttled === null) return; // Blocked by throttle

    const now = Date.now();
    
    // v5.5.318: Apply inversion from user setting OR config
    const config = this._getSensorConfig();
    const settings = this.getSettings() || {};
    const invertPresence = settings.invert_presence ?? config.invertPresence ?? false;
    const configName = config.configName || 'DEFAULT';

    // v5.5.991: Peter #1297 - Configurable debounce from config (disco lights fix)
    const DEBOUNCE_MS = config.motionDebounceMs || 2000;
    const THROTTLE_MS = config.motionThrottleMs || 0;
    const throttleEnabled = config.motionThrottleEnabled || false;

    // v5.5.991: Motion throttle - prevent rapid state changes (disco lights fix)
    if (throttleEnabled && THROTTLE_MS > 0) {
      const lastMotionChange = this._lastMotionChangeTime || 0;
      const timeSinceChange = now - lastMotionChange;
      if (timeSinceChange < THROTTLE_MS) {
        this.log(`[RADAR] 🚫 DP${dpId} THROTTLED: motion change blocked (${timeSinceChange}ms < ${THROTTLE_MS}ms throttle)`);
        return;
      }
    }

    // Transform the raw presence value with inversion support
    let presence = rawPresence;
    if (invertPresence) {
      presence = !rawPresence;
      this.log(`[PRESENCE-FIX] 🔄 INVERTING presence for ${configName}: DP${dpId} ${rawPresence} -> ${presence}`);
    }

    // Get current state to avoid duplicate updates
    const currentMotion = this.getCapabilityValue('alarm_motion');
    if (presence === currentMotion) {
      // Same state - no update needed
      return;
    }

    // If presence is TRUE, set immediately
    if (presence) {
      this.log(`[RADAR] 🟢 DP${dpId} → PRESENCE DETECTED (processed: ${presence})`);
      this._lastPresenceTrue = now;
      this._lastMotionChangeTime = now;
      this.setCapabilityValue('alarm_motion', true).catch(() => { });
      if (this.hasCapability('alarm_human')) {
        this.setCapabilityValue('alarm_human', true).catch(() => { });
      }
      this._updatePresenceTimestamp();

      // v5.5.285: Trigger custom flow cards
      this._triggerPresenceFlows(true);
      return;
    }

    // If presence is FALSE, debounce (wait before clearing)
    const timeSinceTrue = now - (this._lastPresenceTrue || 0);
    if (timeSinceTrue < DEBOUNCE_MS) {
      this.log(`[RADAR] 🟡 DP${dpId} → presence=false DEBOUNCED (${timeSinceTrue}ms < ${DEBOUNCE_MS}ms)`);
      return; // Ignore false within debounce window
    }

    this.log(`[RADAR] 🔴 DP${dpId} → PRESENCE CLEARED (processed: ${presence})`);
    this._lastMotionChangeTime = now;
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
        // v5.5.926: Fixed flow card IDs - must match driver.flow.compose.json
        // Trigger: presence_sensor_radar_presence_detected
        await this.homey.flow.getDeviceTriggerCard('presence_sensor_radar_presence_detected')
          .trigger(this).catch(() => { });
        this.log('[RADAR-FLOW] ✅ Triggered: presence_sensor_radar_presence_detected');
      } else {
        // v5.5.926: Fixed flow card IDs - must match driver.flow.compose.json
        // Trigger: presence_sensor_radar_presence_cleared
        await this.homey.flow.getDeviceTriggerCard('presence_sensor_radar_presence_cleared')
          .trigger(this).catch(() => { });
        this.log('[RADAR-FLOW] ✅ Triggered: presence_sensor_radar_presence_cleared');
      }
    } catch (err) {
      this.log('[RADAR-FLOW] ⚠️ Flow trigger error:', err.message);
    }
  }

  async _setupZclClusters(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    // v5.5.512: Power Configuration cluster (0x0001) for battery
    // HOBEIAN ZG-204ZM uses ZCL battery reporting
    // v5.5.988: Patrick #1288 - Add throttle to prevent battery spam (100% ↔ 1-2%)
    try {
      const powerCluster = ep1.clusters?.genPowerCfg || ep1.clusters?.powerConfiguration;
      if (powerCluster?.on) {
        let lastZclBatteryUpdate = 0;
        let lastZclBatteryValue = null;
        const BATTERY_MIN_INTERVAL_MS = 300000;  // 5 minutes minimum between updates
        const BATTERY_MIN_CHANGE = 5;             // Ignore changes < 5%
        
        powerCluster.on('attr.batteryPercentageRemaining', (v) => {
          const now = Date.now();
          // ZCL reports battery as 0-200 (0.5% steps), convert to 0-100%
          const battery = Math.min(100, Math.round(v / 2));
          
          // Throttle: Skip if less than 5 min since last update
          if (now - lastZclBatteryUpdate < BATTERY_MIN_INTERVAL_MS) {
            return;
          }
          
          // MinChange: Skip if change < 5%
          if (lastZclBatteryValue !== null) {
            const change = Math.abs(battery - lastZclBatteryValue);
            if (change < BATTERY_MIN_CHANGE) {
              return;
            }
          }
          
          lastZclBatteryUpdate = now;
          lastZclBatteryValue = battery;
          this.log(`[RADAR] 🔋 ZCL Battery: ${v} -> ${battery}%`);
          this.setCapabilityValue('measure_battery', battery).catch(() => { });
        });
        powerCluster.on('attr.batteryVoltage', (v) => {
          // Backup: calculate from voltage if percentage not available
          // Typical CR2450: 3.0V full, 2.0V empty
          if (v && !this.getCapabilityValue('measure_battery')) {
            const battery = Math.min(100, Math.max(0, Math.round((v - 20) * 10)));
            this.log(`[RADAR] 🔋 ZCL Battery voltage: ${v / 10}V -> ${battery}%`);
            this.setCapabilityValue('measure_battery', battery).catch(() => { });
          }
        });
        this.log('[RADAR] ✅ PowerConfiguration cluster configured (5min throttle + 5% minChange)');
      }
    } catch (e) { /* ignore */ }

    // Illuminance cluster (0x0400)
    // v5.5.986: Peter #1282 - Add throttle to prevent disco lights
    try {
      const illumCluster = ep1.clusters?.msIlluminanceMeasurement;
      if (illumCluster?.on) {
        let lastLuxUpdate = 0;
        let lastLuxValue = null;
        const MIN_REPORT_INTERVAL_MS = 30000;  // 30 seconds minimum between updates
        const MIN_CHANGE_PERCENT = 15;          // Ignore changes < 15%
        
        illumCluster.on('attr.measuredValue', (v) => {
          const now = Date.now();
          
          // v5.7.52: CRITICAL FIX - Shared throttle with Tuya DP to prevent fighting
          // ZCL and Tuya DP both send lux values - use whichever comes first, throttle the other
          this._luxLastUpdateSource = this._luxLastUpdateSource || {};
          const lastUpdate = this._luxLastUpdateSource.zcl || 0;
          const timeSinceLastUpdate = now - lastUpdate;
          
          // If Tuya DP updated within last 5s, skip ZCL update to prevent fighting
          if (timeSinceLastUpdate < 5000 && this._luxLastUpdateSource.tuya && now - this._luxLastUpdateSource.tuya < 5000) {
            return;
          }
          
          const lux = Math.pow(10, (v - 1) / 10000);
          const roundedLux = parseFloat(Math.round(lux));
          
          // Throttle: Skip if less than 30s since last update
          if (timeSinceLastUpdate < MIN_REPORT_INTERVAL_MS) {
            return;
          }
          
          // MinChange: Skip if change < 15%
          if (lastLuxValue !== null && lastLuxValue > 0) {
            const changePercent = Math.abs(roundedLux - lastLuxValue) / lastLuxValue * 100;
            if (changePercent < MIN_CHANGE_PERCENT) {
              return;
            }
          }
          
          this._luxLastUpdateSource.zcl = now;
          lastLuxUpdate = now;
          lastLuxValue = roundedLux;
          this.setCapabilityValue('measure_luminance', roundedLux).catch(() => { });
        });
        this.log('[RADAR] ✅ Illuminance cluster configured (30s throttle + 15% minChange)');
      }
    } catch (e) { /* ignore */ }

    // v5.5.912: Temperature cluster (0x0402) - HOBEIAN ZG-204ZV with temp/humidity
    // ZHA issue #4452: ZG-204ZV variant WITH temp/humidity has ZCL clusters 0x0402 + 0x0405
    try {
      const tempCluster = ep1.clusters?.msTemperatureMeasurement || ep1.clusters?.temperatureMeasurement;
      if (tempCluster?.on) {
        tempCluster.on('attr.measuredValue', (v) => {
          // ZCL reports temperature in hundredths of °C (e.g., 2350 = 23.50°C)
          const temp = v / 100;
          if (temp > -40 && temp < 100) { // Sanity check
            this.log(`[RADAR] 🌡️ ZCL Temperature: ${v} -> ${temp}°C`);
            this.setCapabilityValue('measure_temperature', temp).catch(() => { });
          }
        });
        this.log('[RADAR] ✅ Temperature cluster (0x0402) configured - ZG-204ZV fix');
      }
    } catch (e) { /* ignore */ }

    // v5.5.912: Humidity cluster (0x0405) - HOBEIAN ZG-204ZV with temp/humidity
    try {
      const humCluster = ep1.clusters?.msRelativeHumidity || ep1.clusters?.relativeHumidity;
      if (humCluster?.on) {
        humCluster.on('attr.measuredValue', (v) => {
          // ZCL reports humidity in hundredths of % (e.g., 6500 = 65.00%)
          const humidity = v / 100;
          if (humidity >= 0 && humidity <= 100) { // Sanity check
            this.log(`[RADAR] 💧 ZCL Humidity: ${v} -> ${humidity}%`);
            this.setCapabilityValue('measure_humidity', humidity).catch(() => { });
          }
        });
        this.log('[RADAR] ✅ Humidity cluster (0x0405) configured - ZG-204ZV fix');
      }
    } catch (e) { /* ignore */ }

    // Occupancy cluster (0x0406)
    try {
      const occCluster = ep1.clusters?.msOccupancySensing;
      if (occCluster?.on) {
        occCluster.on('attr.occupancy', (v) => {
          const rawOccupied = (v & 0x01) !== 0;
          const occupied = this._applyPresenceInversion(rawOccupied);
          this.log(`[RADAR] Occupancy: raw=${rawOccupied} → ${occupied}`);
          this.setCapabilityValue('alarm_motion', occupied).catch(() => { });
          this._triggerPresenceFlows(occupied);
        });
        this.log('[RADAR] ✅ Occupancy cluster configured (with inversion support)');
      }
    } catch (e) { /* ignore */ }

    // v5.5.276: IAS Zone enrollment fix (ChatGPT analysis #723)
    // Fixes "notEnrolled" status that prevents proper motion detection
    await this._enrollIASZone(zclNode);
  }

  /**
   * v5.5.538: Enhanced IAS Zone enrollment - fixes "notEnrolled" status
   * GitHub Issue #97: NoroddH _TZ321C_fkzihax8 5.8G Radar not working
   * Root cause: IAS Zone enrollment not persisting, needs retry mechanism
   * 
   * FIXES in v5.5.538:
   * 1. Added retry mechanism with delays
   * 2. Store iasZone reference for re-enrollment
   * 3. Periodic check and re-enrollment if lost
   * 4. Better zoneStatus parsing for 5.8G radar
   */
  async _enrollIASZone(zclNode) {
    try {
      const ep1 = zclNode?.endpoints?.[1];
      const iasZone = ep1?.clusters?.iasZone || ep1?.clusters?.ssIasZone || ep1?.clusters?.[1280];

      if (!iasZone) {
        this.log('[RADAR] ℹ️ No IAS Zone cluster - skipping enrollment');
        return;
      }

      // Store reference for re-enrollment
      this._iasZoneCluster = iasZone;
      this._zclNode = zclNode;

      this.log('[RADAR] 🔐 Starting IAS Zone enrollment (v5.5.538 with retry)...');

      // Step 1: Read current zone state
      let currentState = null;
      let currentZoneId = null;
      try {
        const attrs = await iasZone.readAttributes(['zoneState', 'zoneType', 'zoneStatus', 'zoneId']);
        this.log(`[RADAR] IAS Zone current: zoneState=${attrs?.zoneState}, zoneType=${attrs?.zoneType}, zoneId=${attrs?.zoneId}`);
        currentState = attrs?.zoneState;
        currentZoneId = attrs?.zoneId;

        // If already enrolled (zoneState=1 and zoneId != 255), just setup listeners
        if ((currentState === 1 || currentState === 'enrolled') && currentZoneId !== 255) {
          this.log('[RADAR] ✅ IAS Zone already enrolled - setting up listeners only');
          await this._setupIASZoneListeners(iasZone);
          return;
        }
      } catch (e) {
        this.log(`[RADAR] ⚠️ Could not read zone state: ${e.message}`);
      }

      // Step 2: Get Homey's IEEE address for CIE
      let homeyIeee = null;
      try {
        // Try multiple sources for Homey's IEEE address
        homeyIeee = this.homey?.zigbee?.ieeeAddress;
        if (!homeyIeee) {
          // Try to get from first router or use a valid address
          homeyIeee = zclNode?.networkAddress?.ieeeAddr || this.getData()?.token;
        }
        if (!homeyIeee || homeyIeee === '0000000000000000') {
          // Use a default valid address format
          homeyIeee = '0x00124b0000000000';
        }
        this.log(`[RADAR] Homey IEEE for CIE: ${homeyIeee}`);
      } catch (e) {
        homeyIeee = '0x00124b0000000000';
      }

      // Step 3: Write IAS CIE address with retry
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await iasZone.writeAttributes({ iasCieAddress: homeyIeee });
          this.log(`[RADAR] ✅ Wrote IAS CIE address (attempt ${attempt})`);
          break;
        } catch (e) {
          this.log(`[RADAR] ⚠️ Could not write IAS CIE (attempt ${attempt}): ${e.message}`);
          if (attempt < 3) await new Promise(r => setTimeout(r, 1000));
        }
      }

      // Step 4: Setup handler for zoneEnrollRequest BEFORE sending response
      await this._setupIASZoneEnrollHandler(iasZone);

      // Step 5: Send enrollment response with retry
      await new Promise(r => setTimeout(r, 500)); // Small delay
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          if (iasZone.zoneEnrollResponse) {
            await iasZone.zoneEnrollResponse({ enrollResponseCode: 0, zoneId: 1 });
            this.log(`[RADAR] ✅ IAS Zone enrollment response sent (attempt ${attempt})`);
            break;
          }
        } catch (e) {
          this.log(`[RADAR] ⚠️ IAS Zone enrollment failed (attempt ${attempt}): ${e.message}`);
          if (attempt < 3) await new Promise(r => setTimeout(r, 1000));
        }
      }

      // Step 6: Verify enrollment after delay
      await new Promise(r => setTimeout(r, 2000));
      try {
        const verifyAttrs = await iasZone.readAttributes(['zoneState', 'zoneId']);
        this.log(`[RADAR] 🔍 Verify enrollment: zoneState=${verifyAttrs?.zoneState}, zoneId=${verifyAttrs?.zoneId}`);
        if (verifyAttrs?.zoneState === 1 || verifyAttrs?.zoneState === 'enrolled') {
          this.log('[RADAR] ✅ IAS Zone enrollment VERIFIED');
        } else {
          this.log('[RADAR] ⚠️ IAS Zone enrollment NOT verified - will retry on next init');
        }
      } catch (e) {
        this.log(`[RADAR] ⚠️ Could not verify enrollment: ${e.message}`);
      }

      // Step 7: Setup zone status listeners
      await this._setupIASZoneListeners(iasZone);

      // Step 8: Start periodic enrollment check for devices that lose enrollment
      this._startEnrollmentCheck();

      this.log('[RADAR] ✅ IAS Zone enrollment complete');
    } catch (error) {
      this.log(`[RADAR] ❌ IAS Zone enrollment failed: ${error.message}`);
    }
  }

  /**
   * v5.5.538: Setup IAS Zone enroll request handler
   */
  async _setupIASZoneEnrollHandler(iasZone) {
    try {
      const enrollHandler = async (payload) => {
        this.log(`[RADAR] 📩 Received zoneEnrollRequest: ${JSON.stringify(payload)}`);
        try {
          if (iasZone.zoneEnrollResponse) {
            await iasZone.zoneEnrollResponse({ enrollResponseCode: 0, zoneId: 1 });
            this.log('[RADAR] ✅ Sent zoneEnrollResponse (success, zoneId=1)');
          }
        } catch (err) {
          this.log(`[RADAR] ⚠️ zoneEnrollResponse failed: ${err.message}`);
        }
      };

      if (iasZone.onZoneEnrollRequest) {
        iasZone.onZoneEnrollRequest = enrollHandler;
      }
      if (iasZone.on) {
        iasZone.on('zoneEnrollRequest', enrollHandler);
      }
      this.log('[RADAR] ✅ zoneEnrollRequest handler configured');
    } catch (e) {
      this.log(`[RADAR] ⚠️ Could not setup enrollRequest handler: ${e.message}`);
    }
  }

  /**
   * v5.5.538: Setup IAS Zone status listeners
   */
  async _setupIASZoneListeners(iasZone) {
    if (!iasZone?.on) return;

    // Attribute change listener - v5.5.790: Apply presence inversion
    iasZone.on('attr.zoneStatus', (status) => {
      const statusNum = typeof status === 'object' ? (status?.data?.[0] || 0) : (typeof status === 'number' ? status : 0);
      const alarm1 = (statusNum & 0x01) !== 0;
      const alarm2 = (statusNum & 0x02) !== 0;
      const rawMotion = alarm1 || alarm2;
      const motion = this._applyPresenceInversion(rawMotion);
      this.log(`[RADAR] IAS zoneStatus attr: ${statusNum} -> raw=${rawMotion} -> ${motion}`);
      this.setCapabilityValue('alarm_motion', motion).catch(() => { });
      this._triggerPresenceFlows(motion);
    });

    // Zone status change notification (ZCL command) - v5.5.790: Apply presence inversion
    iasZone.onZoneStatusChangeNotification = (payload) => {
      const status = payload?.zoneStatus ?? payload?.data?.[0] ?? 0;
      const rawMotion = (status & 0x03) !== 0;
      const motion = this._applyPresenceInversion(rawMotion);
      this.log(`[RADAR] IAS zoneStatusChangeNotification: ${status} -> raw=${rawMotion} -> ${motion}`);
      this.setCapabilityValue('alarm_motion', motion).catch(() => { });
      this._triggerPresenceFlows(motion);
    };

    // Also listen for attr.zoneState to detect enrollment loss
    iasZone.on('attr.zoneState', async (state) => {
      this.log(`[RADAR] IAS zoneState changed: ${state}`);
      if (state === 0 || state === 'notEnrolled') {
        this.log('[RADAR] ⚠️ Zone became notEnrolled - attempting re-enrollment');
        await this._reEnrollIASZone();
      }
    });

    this.log('[RADAR] ✅ IAS Zone status listeners configured');
  }

  /**
   * v5.5.538: Re-enroll IAS Zone if enrollment is lost
   */
  async _reEnrollIASZone() {
    if (!this._iasZoneCluster) return;

    try {
      this.log('[RADAR] 🔄 Re-enrolling IAS Zone...');
      const iasZone = this._iasZoneCluster;

      // Try to enroll again
      if (iasZone.zoneEnrollResponse) {
        await iasZone.zoneEnrollResponse({ enrollResponseCode: 0, zoneId: 1 });
        this.log('[RADAR] ✅ Re-enrollment response sent');
      }
    } catch (e) {
      this.log(`[RADAR] ⚠️ Re-enrollment failed: ${e.message}`);
    }
  }

  /**
   * v5.5.538: Start periodic enrollment check for problematic devices
   */
  _startEnrollmentCheck() {
    // Clear any existing interval
    if (this._enrollmentCheckInterval) {
      clearInterval(this._enrollmentCheckInterval);
    }

    // Check every 5 minutes if enrollment is still valid
    this._enrollmentCheckInterval = setInterval(async () => {
      if (!this._iasZoneCluster) return;

      try {
        const attrs = await this._iasZoneCluster.readAttributes(['zoneState', 'zoneId']);
        if (attrs?.zoneState === 0 || attrs?.zoneState === 'notEnrolled' || attrs?.zoneId === 255) {
          this.log('[RADAR] ⚠️ Periodic check: enrollment lost - re-enrolling');
          await this._reEnrollIASZone();
        }
      } catch (e) {
        // Ignore read errors during periodic check
      }
    }, 5 * 60 * 1000); // 5 minutes

    this.log('[RADAR] ✅ Periodic enrollment check started');
  }

  /**
   * v5.5.518: Send Tuya Magic Packet to enable DP communication
   * Required for LeapMMW 5.8G hybrid devices that don't show cluster 61184
   * Source: Z2M configureMagicPacket + dataQuery sequence
   */
  async _sendTuyaMagicPacket(zclNode) {
    try {
      this.log('[RADAR] 🪄 Sending Tuya Magic Packet (LeapMMW 5.8G hybrid)...');

      const ep1 = zclNode?.endpoints?.[1];
      if (!ep1) {
        this.log('[RADAR] ⚠️ No endpoint 1 for magic packet');
        return;
      }

      // Step 1: Read basic cluster (Z2M configureMagicPacket)
      const basicCluster = ep1.clusters?.basic || ep1.clusters?.genBasic;
      if (basicCluster && typeof basicCluster.readAttributes === 'function') {
        try {
          await basicCluster.readAttributes(['manufacturerName', 'modelId', 'powerSource']);
          this.log('[RADAR] ✅ Basic cluster read (magic packet step 1)');
        } catch (e) {
          this.log('[RADAR] ⚠️ Basic cluster read failed:', e.message);
        }
      }

      // Step 2: Try to access Tuya cluster and send dataQuery
      const tuyaCluster = ep1.clusters?.tuya || ep1.clusters?.[61184] || ep1.clusters?.manuSpecificTuya;
      if (tuyaCluster) {
        // MCU Version Request
        if (typeof tuyaCluster.mcuVersionRequest === 'function') {
          try {
            await tuyaCluster.mcuVersionRequest({});
            this.log('[RADAR] ✅ MCU Version Request sent');
          } catch (e) { /* ignore */ }
        }

        // Data Query
        if (typeof tuyaCluster.dataQuery === 'function') {
          try {
            await tuyaCluster.dataQuery({});
            this.log('[RADAR] ✅ Data Query sent');
          } catch (e) { /* ignore */ }
        }
      } else {
        this.log('[RADAR] ℹ️ No Tuya cluster found - device may use IAS Zone only');
      }

      this.log('[RADAR] ✅ Magic packet sequence complete');
    } catch (e) {
      this.log('[RADAR] ⚠️ Magic packet error:', e.message);
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
            // Try common lux DPs: 12, 102, 103, 104, 106
            const luxDPs = [12, 102, 103, 104, 106];
            for (const dp of luxDPs) {
              if (config.dpMap?.[dp]?.cap === 'measure_luminance') {
                await this._requestSpecificDP(zclNode, dp);
                break; // Only poll first matching lux DP
              }
            }
          }
          
          // v5.5.930: Poll temp/humidity DPs for HOBEIAN 10G multi-sensors
          if (config.hasTemperature || config.hasHumidity) {
            this.log(`[RADAR] 🌡️ Polling temp/humidity DPs...`);
            // DP101=humidity, DP111=temperature for HOBEIAN 10G
            if (config.dpMap?.[101]?.cap === 'measure_humidity') {
              await this._requestSpecificDP(zclNode, 101);
            }
            if (config.dpMap?.[111]?.cap === 'measure_temperature') {
              await this._requestSpecificDP(zclNode, 111);
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
   * v5.5.793: Enhanced cleanup on device removal
   */
  onDeleted() {
    this._cleanupTimers();
    super.onDeleted?.();
  }

  /**
   * v5.5.793: Cleanup on uninit (driver reload, app restart)
   */
  async onUninit() {
    this._cleanupTimers();
    await super.onUninit?.();
  }

  /**
   * v5.5.793: Centralized timer cleanup
   */
  _cleanupTimers() {
    // Clear polling interval
    if (this._pollingInterval) {
      clearInterval(this._pollingInterval);
      this._pollingInterval = null;
    }

    // Clear enrollment check interval
    if (this._enrollmentCheckInterval) {
      clearInterval(this._enrollmentCheckInterval);
      this._enrollmentCheckInterval = null;
    }

    // Clear any pending debounce timers
    if (this._presenceDebounceTimer) {
      clearTimeout(this._presenceDebounceTimer);
      this._presenceDebounceTimer = null;
    }

    // Clear motion throttle state
    this._motionThrottle = null;

    // Clear inference engine state
    if (this._presenceInference) {
      this._presenceInference = null;
    }

    // Clear DP auto-discovery state
    if (this._dpAutoDiscovery) {
      this._dpAutoDiscovery = null;
    }

    // Clear lux oscillation state for this device
    const deviceId = this.getData()?.id;
    if (deviceId && luxOscillationState.has(deviceId)) {
      luxOscillationState.delete(deviceId);
    }

    this.log('[RADAR] 🧹 All timers and state cleaned up');
  }
}

module.exports = PresenceSensorRadarDevice;
