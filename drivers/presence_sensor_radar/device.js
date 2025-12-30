'use strict';

const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');

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
    ],
    battery: false,
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
  // v5.5.306: RONNY FIX #760 - REMOVED invertPresence!
  // User reports: "Yes when outside and no when inside" with invertPresence:true
  // This means invertPresence was CAUSING the bug, not fixing it
  // These devices report correctly: 0=none, 1=presence, 2=move
  // ─────────────────────────────────────────────────────────────────────────────
  'ZY_M100_CEILING_24G': {
    configName: 'ZY_M100_CEILING_24G',
    sensors: [
      '_TZE200_gkfbdvyx', '_TZE204_gkfbdvyx',
    ],
    battery: false,
    hasIlluminance: true,
    needsPolling: true,
    invertPresence: false,  // v5.5.306: FIXED - Do NOT invert (was causing wrong behavior)
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_enum' },    // 0=none, 1=presence, 2=move
      2: { cap: null, internal: 'motion_sensitivity' },      // 0-10
      3: { cap: null, internal: 'detection_distance_min' },  // ×0.1 = meters
      4: { cap: null, internal: 'detection_distance_max' },  // ×0.1 = meters
      9: { cap: 'measure_distance', divisor: 10 },           // ×0.1 = meters (PRIMARY)
      101: { cap: null, internal: 'distance_tracking' },     // switch
      102: { cap: null, internal: 'presence_sensitivity' },  // 1-10
      103: { cap: 'measure_luminance', type: 'lux_direct' }, // lux direct (PRIMARY)
      104: { cap: 'alarm_motion', type: 'presence_enum' },   // motion state enum (fallback)
      105: { cap: null, internal: 'fading_time' },           // 1-1500 sec
      // v5.5.286: FALLBACK DPs - some firmware uses these instead
      12: { cap: 'measure_luminance', type: 'lux_direct' },  // lux fallback (iadro9bf style)
      109: { cap: 'measure_distance', divisor: 100 },        // distance fallback (TZE284 style)
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
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_bool' },
      4: { cap: 'measure_battery', divisor: 1 },
      9: { cap: 'measure_luminance', divisor: 1 },
      15: { cap: 'measure_battery', divisor: 1 },
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TYPE D: ZY-M100-S_2 LOW DP VARIANTS (Ronny #728 + Z2M #30326)
  // CONFIRMED: These devices use LOW DPs (1-9, 101-104), NOT high DPs!
  // Sources: HA t/862007, Z2M #27212, #30326, ZHA #3969, Reddit
  // WARNING: fading_time may not work as expected (Z2M #30326 user report)
  // v5.5.304: PRESENCE=NULL FIRMWARE BUG WORKAROUND (works with Tuya gateway)
  // Strategies: 1) Aggressive DP1 polling 2) Distance-based inference 3) Time sync
  // ─────────────────────────────────────────────────────────────────────────────
  'TZE284_IADRO9BF': {
    configName: 'TZE284_IADRO9BF',
    sensors: [
      // v5.5.280: Ronny's device - confirmed LOW DP layout
      '_TZE284_iadro9bf',
      '_TZE204_iadro9bf',
      // v5.5.281: Added from HA t/862007 external converter fingerprint
      '_TZE204_qasjif9e',
      '_TZE284_qasjif9e',  // TZE284 variant
      '_TZE204_ztqnh5cg',
      '_TZE284_ztqnh5cg',  // TZE284 variant
      // v5.5.281: Added from Z2M discussions - same LOW DP layout
      '_TZE204_sbyx0lm6',
      '_TZE284_sbyx0lm6',
    ],
    battery: false,
    hasIlluminance: true,
    needsPolling: true,
    invertPresence: false,
    // v5.5.315: INTELLIGENT INFERENCE for presence=null firmware bug
    // Research: Z2M #27212 reports presence always null on this sensor
    // Solution: Calculate presence from distance, lux changes, and activity patterns
    useIntelligentInference: true,  // NEW: Enable smart inference engine
    useDistanceInference: true,     // Infer presence from distance > 0
    useAggressivePolling: true,     // Poll DP1 every 10s instead of 30s
    needsTimeSync: true,            // Send time sync like Tuya gateway
    // v5.5.315: Firmware-specific handling
    // appVersion 74: Usually works, presence DP functional
    // appVersion 78: Often has presence=null bug, needs inference
    firmwareQuirks: {
      74: { presenceWorking: true, inferenceWeight: 0.3 },
      78: { presenceWorking: false, inferenceWeight: 0.9 },
    },
    dpMap: {
      // DP1: Presence - MAY BE NULL on some firmware! Use inference as fallback
      1: { cap: 'alarm_motion', type: 'presence_bool', useInference: true },
      // DP2: Radar sensitivity (0-9)
      2: { cap: null, internal: 'radar_sensitivity' },
      // DP3: Minimum range (÷100 = meters)
      3: { cap: null, internal: 'min_range', divisor: 100 },
      // DP4: Maximum range (÷100 = meters) - USED FOR INFERENCE MAX RANGE
      4: { cap: null, internal: 'max_range', divisor: 100, feedInference: true },
      // DP6: Self-test result (enum: 0=testing, 1=success, 2=failure)
      6: { cap: null, internal: 'self_test' },
      // DP9: Target distance - KEY FOR INFERENCE! distance>0 = presence
      9: { cap: 'measure_distance', divisor: 100, feedInference: true },
      // DP12: Lux fallback - FEEDS INFERENCE (lux changes = movement)
      12: { cap: 'measure_luminance', type: 'lux_direct', feedInference: true },
      // DP101: Detection delay (÷10 = seconds)
      101: { cap: null, internal: 'detection_delay', divisor: 10 },
      // DP102: LUX - FEEDS INFERENCE
      102: { cap: 'measure_luminance', type: 'lux_direct', feedInference: true },
      // DP104: Illuminance - FEEDS INFERENCE
      104: { cap: 'measure_luminance', type: 'lux_direct', feedInference: true },
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
    dpMap: {
      1: { cap: 'alarm_motion', type: 'presence_enum' },
      104: { cap: 'measure_luminance', type: 'lux_direct' },
      109: { cap: 'measure_distance', divisor: 100 },
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TYPE G: TZ3000 PIR Sensors (standard PIR, not radar)
  // Uses ZCL occupancy cluster primarily
  // ─────────────────────────────────────────────────────────────────────────────
  'TZ3000_PIR': {
    sensors: [
      '_TZ3000_8bxrzyxz', '_TZ3000_aigddb2b',
      '_TZ3000_ky0fq4ho', '_TZ3210_fkzihax8',
      '_TZ321C_fkzihax8',
    ],
    battery: true,
    useZcl: true,
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
    case 'presence_bool':
      // v5.5.306: CRITICAL FIX - value=0 means NO presence, value=1 means presence
      result = value === 1 || value === true || value === 'presence';
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

// v5.5.314: Presence debouncing for _TZE204_gkfbdvyx (Ronny #775)
// Requires 2 consecutive same-state reports before changing presence
function debouncePresence(presence, manufacturerName, deviceId) {
  if (!deviceId || !manufacturerName.includes('gkfbdvyx')) {
    return presence;  // No debouncing for other devices
  }

  const state = presenceDebounceState.get(deviceId) || { lastPresence: null, stableCount: 0 };

  if (state.lastPresence === presence) {
    state.stableCount++;
  } else {
    state.stableCount = 1;
  }
  state.lastPresence = presence;
  presenceDebounceState.set(deviceId, state);

  // Require 2 consecutive same-state reports to change presence
  if (state.stableCount >= 2) {
    console.log(`[PRESENCE-DEBOUNCE] ✅ ${manufacturerName}: presence=${presence} (stable x${state.stableCount})`);
    return presence;
  }

  // Return previous stable value until we get consistent reports
  const previousStable = presenceDebounceState.get(deviceId + '_stable')?.presence ?? presence;
  console.log(`[PRESENCE-DEBOUNCE] 🔇 ${manufacturerName}: ignoring flicker ${previousStable} -> ${presence} (count=${state.stableCount})`);

  if (state.stableCount >= 2) {
    presenceDebounceState.set(deviceId + '_stable', { presence });
  }

  return previousStable;
}

// v5.5.314: Lux smoothing state (prevents 30-2000 fluctuations)
// Ronny forum #775: _TZE284_iadro9bf lux showing 30 and 2000 every 15 sec
const luxSmoothingState = new Map();  // deviceId -> { lastLux, timestamp }

// v5.5.314: Presence debouncing state (prevents random on/off)
// Ronny forum #775: _TZE204_gkfbdvyx sending presence randomly
const presenceDebounceState = new Map();  // deviceId -> { lastPresence, timestamp, stableCount }

// v5.5.316: REGRESSION FIX - Restored proper lux handling
// Research: Z2M #27212 shows _TZE284_iadro9bf reports direct lux (e.g., 282), NOT raw ADC
// Research: SmartHomeScene confirms ZY-M100 spec is 0-2000 LUX
// FIXED: v5.5.314 smoothing was too aggressive, v5.5.283 auto-detect was wrong
function transformLux(value, type, manufacturerName = '', deviceId = null) {
  let lux = value;
  const originalValue = value;

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

  // v5.5.316: Soft clamp with warning, not hard override
  if (lux > maxLux) {
    console.log(`[LUX-FIX] ⚠️ Value ${lux} exceeds ${maxLux} for ${manufacturerName} (allowing, may be valid)`);
    // Only clamp if REALLY extreme (> 3x max)
    if (lux > maxLux * 3) {
      lux = maxLux;
    }
  }

  lux = Math.max(0, Math.round(lux));

  // v5.5.316: FIXED LUX SMOOTHING - Only suppress EXTREME fluctuations
  // Previous bug: 30% threshold blocked legitimate changes
  // NEW: Only suppress if jumping between extremes (< 100 ↔ > 1500)
  if (deviceId && isZYM100Series) {
    const state = luxSmoothingState.get(deviceId) || { lastLux: null, timestamp: 0, extremeCount: 0 };
    const now = Date.now();
    const timeSinceLastUpdate = now - state.timestamp;

    if (state.lastLux !== null) {
      // v5.5.316: ONLY suppress extreme oscillations (low↔high flip-flop)
      const isExtremeLow = lux < 100;
      const isExtremeHigh = lux > 1500;
      const wasExtremeLow = state.lastLux < 100;
      const wasExtremeHigh = state.lastLux > 1500;

      // Detect flip-flop pattern: low→high→low or high→low→high within 30 seconds
      const isFlipFlop = (isExtremeLow && wasExtremeHigh) || (isExtremeHigh && wasExtremeLow);

      if (isFlipFlop && timeSinceLastUpdate < 30000) {
        state.extremeCount++;
        if (state.extremeCount >= 2) {
          // Confirmed flip-flop pattern - suppress
          console.log(`[LUX-SMOOTH] 🔇 Flip-flop detected ${manufacturerName}: ${state.lastLux} ↔ ${lux} (suppressing)`);
          return state.lastLux;
        }
      } else {
        state.extremeCount = 0;  // Reset counter for normal changes
      }
    }

    // Update smoothing state
    luxSmoothingState.set(deviceId, { lastLux: lux, timestamp: now, extremeCount: state.extremeCount });
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
   */
  _getSensorConfig() {
    if (!this._sensorConfig) {
      const mfr = this._getManufacturerName();
      this._sensorConfig = getSensorConfig(mfr);
      this.log(`[RADAR] 🔍 ManufacturerName resolved: "${mfr}" → config: ${this._sensorConfig.configName || 'DEFAULT'}`);
    }
    return this._sensorConfig;
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

    // v5.5.284: Get invertPresence flag from config (not manufacturerName which can be empty)
    const invertPresence = config.invertPresence || false;
    const configName = config.configName || 'DEFAULT';

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
   */
  _handleTuyaResponse(data) {
    if (!data) return;

    // Mark device as available when we receive data
    this.setAvailable().catch(() => { });

    const dpId = data.dp || data.dpId || data.datapoint;

    // v5.5.310: FIXED - Handle DP12 and DP103 locally, NOT via HybridSensorBase!
    // Problem: HybridSensorBase universal profile maps DP103 to temperature, not lux
    // Solution: Handle lux DPs (12, 102, 103, 104) directly here using local dpMap config
    const config = this._getSensorConfig();
    const dpMap = config.dpMap || {};

    // Check if this DP is a lux DP in our config - handle locally
    if (dpMap[dpId]?.cap === 'measure_luminance') {
      const luxValue = this._parseBufferValue(data.value || data.data);
      const mfr = this._getManufacturerName();
      const deviceId = this.getData()?.id;
      const finalLux = transformLux(luxValue, dpMap[dpId].type || 'lux_direct', mfr, deviceId);
      this.log(`[RADAR-LUX] ☀️ DP${dpId} → measure_luminance = ${finalLux} lux (local config)`);
      this.setCapabilityValue('measure_luminance', finalLux).catch(() => { });

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
    this.setCapabilityValue('measure_distance', distanceMeters).catch(() => { });
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
   * v5.5.293: FIXED presence debounce with inversion support
   * - Applies invertPresence transform before debouncing
   * - Fixes "presence flashes for 0.5s" issue with proper inversion
   */
  _handlePresenceWithDebounce(rawPresence, dpId) {
    const now = Date.now();
    const DEBOUNCE_MS = 2000; // 2 seconds

    // v5.5.293: Apply inversion transform BEFORE debounce logic
    const config = this._getSensorConfig();
    const invertPresence = config.invertPresence || false;
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
          this.setCapabilityValue('measure_luminance', Math.round(lux)).catch(() => { });
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
        });

        iasZone.onZoneStatusChangeNotification = (payload) => {
          const status = payload?.zoneStatus || 0;
          const motion = (status & 0x03) !== 0;
          this.log(`[RADAR] IAS Zone notification: ${status} -> motion: ${motion}`);
          this.setCapabilityValue('alarm_motion', motion).catch(() => { });
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
