'use strict';
const CI = require('../../lib/utils/CaseInsensitiveMatcher');
const { getManufacturer, getModelId } = require('../../lib/helpers/DeviceDataHelper');

const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');

const { CLUSTERS } = require('../../lib/constants/ZigbeeConstants.js');


const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// v5.5.793: VALIDATION CONSTANTS - Centralized thresholds for data validation
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
 * â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
 * â•‘      (RADAR / mmWAVE) PRESENCE SENSOR - v5.5.315 INTELLIGENT INFERENCE         â•‘
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£
 * â•‘  v5.5.315: INTELLIGENT PRESENCE INFERENCE for presence=null firmware bug   â•‘
 * â•‘  Sources: Z2M #27212, #30326, #8939, HA t/862007, ZHA #3969, Reddit        â•‘
 * â•‘  - SMART INFERENCE: Uses distance, lux changes, ZCL clusters as fallback   â•‘
 * â•‘  - FIRMWARE DETECTION: Handles appVersion 74 vs 78 differences             â•‘
 * â•‘  - ACTIVITY TRACKING: Monitors multiple DPs to deduce presence state       â•‘
 * â•‘  - v5.5.314: Lux smoothing + presence debouncing                           â•‘
 * â•‘  - v5.5.301: DP102=LUX fix for _TZE284_iadro9bf (Ronny #752)              â•‘
 * â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 */

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// v5.5.315: INTELLIGENT PRESENCE INFERENCE ENGINE
// Calculates presence from multiple data sources when DP1 returns null
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const IntelligentPresenceInference = require('../../lib/helpers/IntelligentPresenceInference');

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// v5.5.364: INTELLIGENT DP AUTO-DISCOVERY ENGINE
// Automatically detects and learns DP mappings for unknown devices
// Works when manufacturerName is not in any SENSOR_CONFIG
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const IntelligentDPAutoDiscovery = require('../../lib/helpers/IntelligentDPAutoDiscovery');

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// INTELLIGENT SENSOR CONFIGURATION DATABASE
// Each entry defines the specific DP mappings for a manufacturerName
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const SENSOR_CONFIGS = require('../../lib/data/SensorConfigs');

// Build reverse lookup: manufacturerName -> config
// v5.7.41: Use LOWERCASE keys for case-insensitive matching
const MANUFACTURER_CONFIG_MAP = {};
for (const [configName, config] of Object.entries(SENSOR_CONFIGS)) {
  for (const mfr of config.sensors) {
    MANUFACTURER_CONFIG_MAP[mfr.toLowerCase()] = { ...config, configName };
  }
}

// Get sensor config by manufacturerName and optional modelId
// v7.4.11: HARDENED - Centralized dual-key resolution (Mfr + ModelId)
function getSensorConfig(manufacturerName, modelId = null) {
  const mfr = CI.normalize(manufacturerName);
  const model = CI.normalize(modelId || '');

  // 1. DUAL-KEY MATCH (Manufacturer + Model ID)
  if (CI.equalsCI(mfr, 'HOBEIAN') || CI.equalsCI(mfr, 'hobeian')) {
    if (CI.containsCI(model, 'ZG-204ZM')) return { ...SENSOR_CONFIGS.HOBEIAN_ZG204ZM, configName: 'HOBEIAN_ZG204ZM' };
    if (CI.containsCI(model, 'ZG-204ZV')) return { ...SENSOR_CONFIGS.ZG_204ZV_MULTISENSOR, configName: 'ZG_204ZV_MULTISENSOR' };
    if (CI.containsCI(model, 'ZG-227Z') || CI.containsCI(model, 'ZG-227')) return { ...SENSOR_CONFIGS.HOBEIAN_10G_MULTI, configName: 'HOBEIAN_10G_MULTI' };
    if (CI.containsCI(model, 'ZG-204ZL')) return { ...SENSOR_CONFIGS.ZG_204ZL_PIR, configName: 'ZG_204ZL_PIR' };
    
    return { ...SENSOR_CONFIGS.HOBEIAN_ZG204ZM, configName: 'HOBEIAN_ZG204ZM_FALLBACK' };
  }

  // 2. EXACT MANUFACTURER MATCH
  const config = MANUFACTURER_CONFIG_MAP[mfr];
  if (config) return config;

  // 3. PATTERN MATCHING
  if (manufacturerName) {
    const knownVariants = ['iadro9bf', 'qasjif9e', 'ztqnh5cg', 'sbyx0lm6'];
    if (knownVariants.some(variant => CI.containsCI(manufacturerName, variant))) {
      return { ...SENSOR_CONFIGS.TZE284_IADRO9BF, configName: 'TZE284_IADRO9BF_PATTERN' };
    }
  }

  return SENSOR_CONFIGS.DEFAULT;
}

// Transform presence value based on type
// v5.5.306: RONNY FIX #760 - Fixed this.log() bug in standalone function
// BUG: transformPresence was using this.log() but it's not a class method!
function transformPresence(value, type, invertPresence = false, configName = '') {
  let result;

  // v5.5.306: Handle null/undefined FIRST before any processing
  // v5.8.29: CRITICAL FIX (FinnKje forum) - null/undefined ALWAYS = no motion
  // Previously invertPresence turned null into true, causing false triggers every 5min
  if (value === null || value === undefined) {
    console.log(`[PRESENCE-FIX] âšï¸null/undefined presence for ${configName}, defaulting to false`);
    return false;
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
      // v7.5.0: RE-CHALLENGE - Don't ignore "move" state (2) anymore.
      // Let the AutonomousIntelligenceGate filter it if it's noise.
      result = true;
    } else {
      console.log(`[PRESENCE-FIX] âšï¸ gkfbdvyx: unknown enum value ${value}`);
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
    console.log(`[PRESENCE-FIX] ðŸ”„ INVERTING presence for ${configName}: raw=${value} -> parsed=${result} -> final=${inverted}`);
    return inverted;  // INVERT the result for buggy firmware
  }

  return result;
}

// v5.5.319: ENHANCED Presence debouncing for _TZE204_gkfbdvyx (Ronny #765)
// Problem: "turns on random even when nobody is in the room"
// Solution: Require 3 consecutive same-state reports AND minimum time gap
// Also add hysteresis: harder to turn ON than to turn OFF
function debouncePresence(presence, manufacturerName, deviceId) {
  if (!deviceId || !CI.containsCI(manufacturerName, 'gkfbdvyx')) {
    return presence;  // No debouncing for other devices
  }

  const now = Date.now();
  const state = presenceDebounceState.get(deviceId) || {
    lastPresence: presence,
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
    console.log(`[PRESENCE-DEBOUNCE] ðŸ”‡ ${manufacturerName}: ignoring (ON=${state.onCount}/${requiredOnCount}, OFF=${state.offCount}/${requiredOffCount})`);
  }

  state.stablePresence = newStablePresence;
  state.lastPresence = presence;
  presenceDebounceState.set(deviceId, state);

  return newStablePresence;
}

// v5.5.314: Presence debouncing state (prevents random on/off)
// Ronny forum #775: _TZE204_gkfbdvyx sending presence randomly
const presenceDebounceState = new Map();  // deviceId -> { lastPresence: presence, timestamp, stableCount }

// v5.5.316: REGRESSION FIX - Restored proper lux handling
// Research: Z2M #27212 shows _TZE284_iadro9bf reports direct lux (e.g. * 282), NOT raw ADC
// v5.5.314: Ultra-aggressive lux smoothing for oscillating sensors
// Problem: _TZE284_iadro9bf flips between 30 and 2000 lux every few seconds
// Solution: 60s smoothing window + oscillation detection
// v5.5.357: RONNY FORUM FIX - Enhanced oscillation lock for 30â†”2000 flip
function transformLux(rawValue, type, manufacturerName = '', deviceId = null) {
  // v5.5.316: Direct lux reporting confirmed (no conversion needed)
  let lux = typeof rawValue === 'number' ? rawValue : 0;

  // v5.5.793: HARD CLAMP to max AND detect 30â†”2000 oscillation
  if (lux > VALIDATION.LUX_ZYM100_MAX) {
    console.log(`[LUX] ðŸ”’ Clamped ${lux} -> ${VALIDATION.LUX_ZYM100_MAX} (max spec limit)`);
    lux = VALIDATION.LUX_ZYM100_MAX;
  }

  // v5.5.357: OSCILLATION DETECTION - Lock value when 30â†”2000 flip detected
  if (!luxOscillationState.has(deviceId)) {
    luxOscillationState.set(deviceId, {
      history: [],
      locked: false,
      lockedValue,
      lockTime: 0
    });
  }
  const oscState = luxOscillationState.get(deviceId);

  // Track recent values
  oscState.history.push({ value: lux, time: Date.now() });
  if (oscState.history.length > 5) oscState.history.shift();

  // Detect oscillation pattern: 30â†’2000â†’30 within 30 seconds
  if (oscState.history.length >= 3) {
    const recent = oscState.history.slice(-3);
    const hasLowValue = recent.some(r => r.value < 100);
    const hasHighValue = recent.some(r => r.value > 1500);
    const timeSpan = recent[recent.length - 1].time - recent[0].time;

    if (hasLowValue && hasHighValue && timeSpan < 30000) {
      if (!oscState.locked) {
        // First oscillation detected - lock to the LOWER stable value
        const stableValue = recent.find(r => r.value < 100)?.value || 30;oscState.locked = true;
        oscState.lockedValue = stableValue;
        oscState.lockTime = Date.now();
        console.log(`[LUX] ðŸ”’ OSCILLATION DETECTED: Locking to ${stableValue} lux (pattern: ${recent.map(r => r.value).join('â†’')})`);
      }
    }
  }

  // If locked, return locked value for next 2 minutes
  if (oscState.locked) {
    const lockDuration = Date.now() - oscState.lockTime;
    if (lockDuration < TIMING.LUX_OSCILLATION_LOCK_MS) { // v5.5.793: Use constant
      console.log(`[LUX] ðŸ”’ LOCKED: Using ${oscState.lockedValue} instead of ${lux} (${Math.round(lockDuration / 1000)}s into lock)`);
      lux = oscState.lockedValue;
    } else {
      // Lock expired
      console.log('[LUX] ðŸ”“ LOCK EXPIRED after 2 minutes, returning to normal');
      oscState.locked = false;
      oscState.lockedValue = null;
    }
  }

  // v5.5.318: NaN/undefined protection - return 0 for invalid values
  if (lux === null || lux === undefined || typeof lux !== 'number' || isNaN(lux)) {
    console.log(`[LUX-FIX] âšï¸ Invalid lux value (${lux}) for ${manufacturerName}, returning 0`);
    return 0;
  }

  let originalValue = lux;

  // v5.5.264: Handle different lux types
  if (type === 'lux_raw') {
    // Raw ADC value - apply conversion ONLY for sensors that actually need it
    // Based on Z2M issue #18950: some sensors report raw ADC values
    if (rawValue > 0) {
      lux = Math.round(rawValue);
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
    lux = safeMultiply(rawValue, 10);
  }

  // v5.5.316: SMART MAX LUX - Different sensors have different ranges
  // ZY-M100: 0-2000 lux (SmartHomeScene review)
  // Some industrial sensors: up to 10000 lux
  let maxLux = 10000;  // Default high limit - don't clamp unless really needed

  // v5.5.316: Only apply strict 2000 limit for KNOWN ZY-M100 series sensors
  
  const isZYM100Series = CI.containsCI(manufacturerName, ['iadro9bf', 'gkfbdvyx', 'qasjif9e', 'sxm7l9xa']);
  if (isZYM100Series) {
    maxLux = 2000;  // ZY-M100 confirmed 0-2000 lux range
  }

  // v5.5.316: FIXED - Only auto-detect raw ADC for values > 50000 (clearly wrong)
  // Previous bug: Ã·100 if > 10000 broke sensors reporting legitimate high lux
  if (lux > 50000) {
    const converted = Math.round(lux);
    console.log(`[LUX-FIX] 📊 Extreme value detected for ${manufacturerName}: ${originalValue} -> ${converted} lux`);
    lux = converted;
  }

  // v5.5.320: HARD CLAMP for ZY-M100 series (Ronny #760: lux showing 2200 when max is 2000)
  // These sensors are confirmed 0-2000 lux range - anything above is sensor noise
  if (lux > maxLux && isZYM100Series) {
    console.log(`[LUX-FIX] ðŸ”’ Hard clamp for ZY-M100: ${lux} â†’ ${maxLux} lux`);
    lux = maxLux;
  } else if (lux > maxLux) {
    // For other sensors, still allow higher values but warn
    console.log(`[LUX-FIX] âšï¸ Value ${lux} exceeds ${maxLux} for ${manufacturerName} (allowing)`);
  }

  lux = Math.max(0, Math.round(lux));

  // v5.5.319: AGGRESSIVE LUX SMOOTHING for known problematic sensors
  // Ronny #775: _TZE284_iadro9bf still oscillating 30â†”2000 every 15 seconds
  // Solution: Once flip-flop is detected, lock to stable value for 60 seconds
  if (deviceId && isZYM100Series) {
    const state = luxSmoothingState.get(deviceId) || {
      lastLux,
      stableLux,  // v5.5.319: Track stable value
      timestamp: 0,
      extremeCount: 0,
      lockedUntil: 0    // v5.5.319: Lock period after flip-flop detection
    };
    const now = Date.now();
    const timeSinceLastUpdate = now - state.timestamp;

    // v5.5.319: If we're in locked mode, always return stable value
    if (state.lockedUntil > now && state.stableLux !== null) {
      console.log(`[LUX-SMOOTH] ðŸ”’ Locked mode: returning stable ${state.stableLux} (ignoring ${lux})`);
      return state.stableLux;
    }

    if (state.lastLux !== null) {
      // v5.5.319: Detect extreme oscillation (30â†”2000 pattern from Ronny report)
      const isExtremeLow = lux < 100;
      const isExtremeHigh = lux > 1500;
      const wasExtremeLow = state.lastLux < 100;
      const wasExtremeHigh = state.lastLux > 1500;

      // Detect flip-flop pattern
      const isFlipFlop = (isExtremeLow && wasExtremeHigh) || (isExtremeHigh && wasExtremeLow);

      if (isFlipFlop && timeSinceLastUpdate < 30000) {
        state.extremeCount++;
        console.log(`[LUX-SMOOTH] âšï¸ Flip-flop #${state.extremeCount}: ${state.lastLux} â†” ${lux}`);

        if (state.extremeCount >= 1) {
          // v5.5.326: RONNY #760 - Ultra-aggressive lock for iadro9bf (2 minutes)
          const isIadro9bf = CI.containsCI(manufacturerName, 'iadro9bf');
          const lockDuration = isIadro9bf ? 120000 : 60000;  // 2min for iadro9bf, 1min for others
          state.stableLux = Math.min(state.lastLux, lux);
          state.lockedUntil = now + lockDuration;
          console.log(`[LUX-SMOOTH] ðŸ”’ Locking to ${state.stableLux} for ${lockDuration/1000}s (flip-flop, iadro9bf=${isIadro9bf})`);
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
    console.log(`[DISTANCE-FIX] âšï¸ Invalid distance value for ${manufacturerName}: ${originalValue}`);
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
    const withDiv100 = value * 100;  // cm to m
    const withDiv10 = safeMultiply(value, 10);    // dm to m
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
      console.log(`[DISTANCE-FIX] 🔧 Auto-detected divisor for ${manufacturerName}: ${divisor} â†’ ${effectiveDivisor}`);
      distanceDivisorCache.set(cacheKey, effectiveDivisor);
    }
  }

  let distance = safeDivide(value, divisor);

  // v5.5.793: Use validation constants for range check
  if (distance < VALIDATION.DISTANCE_MIN) distance = VALIDATION.DISTANCE_MIN;
  if (distance > VALIDATION.DISTANCE_MAX) {
    console.log(`[DISTANCE-FIX] ðŸ“ Distance clamped for ${manufacturerName}: ${distance}m -> ${VALIDATION.DISTANCE_MAX}m`);
    distance = VALIDATION.DISTANCE_MAX;
  }

  const result = Math.round(distance * 100)/100; // 2 decimal places
  console.log(`[DISTANCE-FIX] ✅ ${manufacturerName}: ${originalValue} (Ã·${effectiveDivisor}) -> ${result}m`);
  return result;
}

class PresenceSensorRadarDevice extends UnifiedSensorBase {

  /**
   * v5.5.277: Get manufacturerName with multiple fallback methods
   * Ronny fix: this.getData()?.manufacturerName was returning empty!
   * v5.7.48: Don't cache empty values - retry on each call until we get a valid name
   */
    _getManufacturerName() {
    return getManufacturer(this);
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
    // v5.8.77: Also re-check if config is a FALLBACK (e.g. HOBEIAN_10G_MULTI_FALLBACK)
    if (this._sensorConfig) {
      const cachedConfigName = this._sensorConfig.configName || 'DEFAULT';
      const isFallback = cachedConfigName === 'DEFAULT' || cachedConfigName.endsWith('_FALLBACK');
      if (isFallback && mfr && mfr.length > 0) {
        this.log(`[RADAR] ðŸ”„ Re-checking config: mfr="${mfr}", was fallback "${cachedConfigName}"`);
        this._sensorConfig = null; // Force re-lookup
      } else {
        return this._sensorConfig;
      }
    }
    
    // v5.5.984: Peter_van_Werkhoven HOBEIAN fix - check multiple sources for modelId
    // v5.8.77: Added zclNode.modelId + _cachedModelId â€” fixes HOBEIAN ZG-204ZM wrong config
    const settings = this.getSettings() || {};
    const modelId = getModelId(this);
    this._sensorConfig = getSensorConfig(mfr, modelId);
    this.log(`[RADAR] ðŸ” ManufacturerName: "${mfr}", ModelId: "${modelId}" â†’ config: ${this._sensorConfig.configName || 'DEFAULT'}`);

    // v5.5.364: Initialize auto-discovery for DEFAULT/unknown devices
    if (this._sensorConfig.configName === 'DEFAULT') {
      if (!this._dpAutoDiscovery) {
        this._dpAutoDiscovery = new IntelligentDPAutoDiscovery(this);
        this.log(`[RADAR] 🧠AUTO-DISCOVERY MODE: Learning DP patterns for unknown device "${mfr}"`);
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
      this.log(`[RADAR] 🧠Using config: ${config.configName || 'DEFAULT'} for ${mfr || '(empty mfr)'}`);
      this._lastLoggedMfr = mfr;
    }

    // v5.5.318: Get invertPresence from user setting OR config
    // User setting takes precedence over config default
    const settings = this.getSettings() || {};
    const invertPresence = settings.invert_presence ?? config.invertPresence ?? false;
    const configName = config.configName || 'DEFAULT';

    if (invertPresence) {
      this.log(`[RADAR] ðŸ”„ Presence inversion ENABLED (setting=${settings.invert_presence}, config=${config.invertPresence})`);
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
      } else if (dpConfig.cap === 'measure_luminance.distance') {
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
          transform: dpConfig.divisor ? (v) => safeDivide(v, dpConfig.divisor) : undefined,
        };
      } else if (dpConfig.internal) {
        // Internal setting DP
        mappings[dp] = {
          internal: dpConfig.internal,
          writable: true,
          divisor: dpConfig.divisor || 1,
        };
      } else if (dpConfig.setting) {
        // v5.11.18: Handle setting-type DPs (e.g. DP122=motion_detection_mode)
        // These were silently dropped, causing "unmapped DP" warnings
        mappings[dp] = {
          internal: dpConfig.setting,
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
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'ssIasZone',
          attributeName: 'zoneStatus',
          minInterval: 0,
          maxInterval: 3600,
          minChange: 1,
        },
        {
          cluster: 'msIlluminanceMeasurement',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 50,
        },
        {
          cluster: 'msTemperatureMeasurement',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 50,
        },
        {
          cluster: 'msRelativeHumidity',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 100,
        },
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    // v5.7.34: Use _getManufacturerName() for consistent multi-source retrieval
    const mfr = this._getManufacturerName();
    const config = this._getSensorConfig();

    this.log('[REFACTORED-HYBRID] â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
    this.log('[RADAR] v5.5.315 INTELLIGENT PRESENCE INFERENCE');
    this.log(`[RADAR] ManufacturerName: ${mfr}`);
    this.log(`[RADAR] Config: ${config.configName || 'ZY_M100_STANDARD (default)'}`);
    this.log(`[RADAR] Power: ${config.battery ? 'BATTERY (EndDevice )' : 'MAINS (Router)'}`);
    this.log(`[RADAR] Illuminance: ${config.hasIlluminance !== false ? 'YES' : 'NO'}`);
    this.log(`[RADAR] Polling: ${config.needsPolling ? 'ENABLED (30s interval )' : 'DISABLED'}`);
    this.log(`[RADAR] DPs: ${Object.keys(config.dpMap || {}).join(', ') || 'ZCL only'}`);
    this.log(`[RADAR] 🧠Intelligent Inference: ${config.useIntelligentInference ? 'ENABLED' : 'DISABLED'}`);
    this.log('[RADAR] â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');

    // v5.5.268: Track received DPs for debugging
    this._receivedDPs = new Set();
    this._lastPresenceUpdate = 0;

    // v5.8.65: Detect Tuya DP cluster availability (Pete's _TZE200_3towulqd has NO cluster CLUSTERS.TUYA_EF00!)
    // If no Tuya DP cluster â†’ noIasMotion MUST be overridden, IAS Zone is the ONLY motion source
    const ep1Check = zclNode?.endpoints?.[1];
    this._hasTuyaDPCluster = !!(ep1Check?.clusters?.tuya || ep1Check?.clusters?.[CLUSTERS.TUYA_EF00] ||
      ep1Check?.clusters?.['tuya'] || ep1Check?.clusters?.['CLUSTERS.TUYA_EF00'] || ep1Check?.clusters?.manuSpecificTuya);
    if (!this._hasTuyaDPCluster && config.noIasMotion) {
      this.log('[RADAR] âšï¸ v5.8.65: Device has NO Tuya DP cluster (CLUSTERS.TUYA_EF00) but noIasMotion=true!');
      this.log('[RADAR] âšï¸ Overriding noIasMotionâ†’false: IAS Zone is the ONLY motion source');
      config.noIasMotion = false;
      this._noIasMotionOverride = false;
      // v5.8.88: ZCL-only variant has no temp/humidity clusters either (Pete's _TZE200_3towulqd interview)
      // Override multisensor config flags to prevent orphan capabilities
      if (!config.noTemperature || !config.noHumidity) {
        this.log('[RADAR] âšï¸ v5.8.88: ZCL-only device â†’ forcing noTemperature=true, noHumidity=true');
        config.noTemperature = true;
        config.noHumidity = true;
      }
    }
    this.log(`[RADAR] Tuya DP cluster: ${this._hasTuyaDPCluster ? 'YES' : 'NO (ZCL-only)'}`);

    // v5.5.315: Initialize Intelligent Presence Inference Engine
    if (config.useIntelligentInference) {
      this._presenceInference = new IntelligentPresenceInference(this);
      this.log('[RADAR] 🧠Inference engine initialized for presence=null workaround');

      // Try to get firmware version for firmware-specific handling
      this._detectFirmwareVersion(zclNode);
    }

    // v5.5.990: Permissive mode for ZCL-only variants (Patrick_Van_Deursen #1297)
    // These devices don't have Tuya DP cluster but work fine with ZCL
    if (config.permissiveMode) {
      this.log('[RADAR] ðŸ”“ PERMISSIVE MODE: ZCL-only variant (no Tuya DP required)');
      this.log('[RADAR] Using ZCL clusters: IAS Zone (motion), illuminanceMeasurement (lux), powerConfiguration (battery)');
    }

    // Battery sensors: minimal init to avoid timeouts
    if (config.battery) {
      this.log('[RADAR] âš¡ BATTERY MODE: Using minimal init (passive listeners only)');

      this.zclNode = zclNode;

      // Add battery capability
      if (!this.hasCapability('measure_battery')) {
        try {
          await this.addCapability('measure_battery');
          this.log('[RADAR] ✅ Added measure_battery');
        } catch (e) { /* ignore */ }
      }

      // v5.8.7: ALWAYS set up ZCL clusters permissively for battery devices
      // Regardless of config, try to listen on ALL available ZCL clusters
      // This handles HOBEIAN variants that may use ZCL, Tuya DP, or both
      this.log('[RADAR] 📡 Setting up ZCL clusters (permissive - all available)');
      await this._setupZclClusters(zclNode).catch(e => {
        this.log('[RADAR] âšï¸ ZCL cluster setup partial failure (non-critical):', e.message);
      });

      // v5.8.7: Non-blocking cluster binding so sleepy device sends reports to Homey
      const ep1 = zclNode?.endpoints?.[1];
      if (ep1) {
        for (const cName of ['iasZone', 'ssIasZone', 'genPowerCfg', 'powerConfiguration',
          'msIlluminanceMeasurement', 'msOccupancySensing', 'msTemperatureMeasurement', 'msRelativeHumidity']) {
          const cl = ep1.clusters?.[cName];if (cl?.bind) { cl.bind().catch(() => {}); }
        }
        this.log('[RADAR] 📡 Non-blocking cluster binding initiated');
      }

      // Setup passive listeners only (no queries)
      this._setupPassiveListeners(zclNode);

      // Mark as available immediately
      await this.setAvailable().catch(() => { });

      // v5.8.43: PR#125 michelhelsdingen - One-time battery + DP refresh after device wakes up
      setTimeout(async () => {
        try {
          const ep1 = zclNode?.endpoints?.[1];
          // Try ZCL PowerConfiguration read
          const powerCluster = ep1?.clusters?.genPowerCfg || ep1?.clusters?.powerConfiguration;
          if (powerCluster?.readAttributes) {
            const attrs = await powerCluster.readAttributes(['batteryPercentageRemaining', 'batteryVoltage']);
            if (attrs?.batteryPercentageRemaining !== undefined && attrs.batteryPercentageRemaining !== 255) {
              const battery = Math.min(100, Math.round(attrs.batteryPercentageRemaining));
              this.log(`[RADAR] ðŸ”‹ Battery read: ${attrs.batteryPercentageRemaining} -> ${battery}%`);
              this.setCapabilityValue('measure_battery', battery).catch(() => {});
            } else if (attrs?.batteryVoltage && !this.getCapabilityValue('measure_battery')) {
              const battery = Math.min(100, Math.max(0, Math.round(attrs.batteryVoltage - safeMultiply(20, 10))));
              this.log(`[RADAR] ðŸ”‹ Battery voltage: ${attrs.batteryVoltage/10}V -> ${battery}%`);
              this.setCapabilityValue('measure_battery', battery).catch(() => {});
            }
          }
          // Also try Tuya dataQuery to get all DPs including DP110
          const tuyaCluster = ep1?.clusters?.tuya || ep1?.clusters?.[CLUSTERS.TUYA_EF00];
          if (tuyaCluster?.dataQuery) {
            await tuyaCluster.dataQuery({} );
            this.log('[RADAR] 📡 Battery: Tuya DP query sent');
          }
        } catch (e) {
          this.log('[RADAR] â„¹ï¸ Battery read deferred (device may be asleep)');
        }
      }, 5000);

      this.log('[RADAR] ✅ Battery sensor ready (passive mode)');
      return;
    }

    // PIR sensors: use ZCL primarily
    if (config.useZcl) {
      this.log('[RADAR] 📡 ZCL MODE: Using ZCL occupancy cluster');
      await super.onNodeInit({ zclNode });
    this._registerCapabilityListeners(); // rule-12a injected
      await this._setupZclClusters(zclNode);
      this.log('[RADAR] ✅ PIR sensor ready (ZCL mode)');
      return;
    }    await super.onNodeInit({ zclNode });
    await this._setupZclClusters(zclNode);    // This was missing and caused presence not to work on TZE284 devices
    await this._setupTuyaDPListeners(zclNode);

    // v5.5.518: Send Tuya magic packet for devices that need it (LeapMMW 5.8G hybrid)
    // These devices don't show cluster CLUSTERS.TUYA_EF00 in interview but still use Tuya DPs
    if (config.needsMagicPacket) {
      await this._sendTuyaMagicPacket(zclNode);
    }

    await new Promise(r => setTimeout(r, 3000));
    this.log('[RADAR] Force DP poll after magic packet');
    await this._requestDPRefresh(zclNode);    // noBatteryCapability flag ensures battery is NEVER shown for these devices
    if ((config.noBatteryCapability || config.mainsPowered || !config.battery) && this.hasCapability('measure_battery')) {
      try {this.log('[RADAR] ðŸ”‹ Removed measure_battery (mains-powered, no battery spam)');
      } catch (e) { /* ignore */ }
    }

    // v5.5.325: Also disable battery monitoring completely for gkfbdvyx
    if (config.noBatteryCapability) {
      this._batteryMonitoringDisabled = true;
      this.log('[RADAR] ðŸ”‹ Battery monitoring DISABLED for this device');
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
      this.log('[RADAR] 🧠Intelligent adapter configured with sensor flags');

      // Let intelligent adapter decide based on real data instead of immediate removal
      // It will remove after learning phase if no data, or keep if data detected
    } else {
      // Fallback to static removal if intelligent adapter not available
      // v5.5.329: Remove temperature capability for PIR-only sensors (forum #788)
      if (config.noTemperature && this.hasCapability('measure_temperature')) {
        try {
          await this.removeCapability('measure_temperature');
          this.log('[RADAR] ðŸŒ¡ï¸ Removed measure_temperature (not supported by this device)');
        } catch (e) { /* ignore */ }
      }

      // v5.5.329: Remove humidity capability for PIR-only sensors (forum #788)
      if (config.noHumidity && this.hasCapability('measure_humidity')) {
        try {
          await this.removeCapability('measure_humidity');
          this.log('[RADAR] ðŸ’§ Removed measure_humidity (not supported by this device)');
        } catch (e) { /* ignore */ }
      }
    }

    // v5.5.903: CAPABILITY MANAGEMENT - Add/remove based on device config
    // Z2M research: ZG-204ZV does NOT have measure_luminance.distance (static_detection_distance is a SETTING, not measurement)
    const hasDistanceDP = config.dpMap && Object.values(config.dpMap).some(dp => dp.cap === 'measure_luminance.distance');
    const hasLuxDP = config.hasIlluminance || (config.dpMap && Object.values(config.dpMap).some(dp => dp.cap === 'measure_luminance'));
    
    // Add capabilities that ARE supported
    if (hasLuxDP && !this.hasCapability('measure_luminance')) {
      try {
        await this.addCapability('measure_luminance');
        this.log('[RADAR] ✅ Added measure_luminance (config supports it)');
      } catch (e) { /* ignore */ }
    }
    
    if (hasDistanceDP && !this.hasCapability('measure_luminance.distance')) {
      try {
        await this.addCapability('measure_luminance.distance');
        this.log('[RADAR] ✅ Added measure_luminance.distance (config supports it)');
      } catch (e) { /* ignore */ }
    }
    
    // v5.5.903: REMOVE orphan capabilities that are NOT supported by this device
    // Fixes Peter's ZG-204ZV showing "Distance" from previous pairing
    if (!hasDistanceDP && this.hasCapability('measure_luminance.distance')) {
      try {
        await this.removeCapability('measure_luminance.distance');
        this.log('[RADAR] 🧹 Removed orphan measure_luminance.distance (not supported by this sensor)');
      } catch (e) { /* ignore */ }
    }

    // v5.11.3: Remove orphan measure_luminance if not supported (e.g. _TZE200_crq3r3la)
    if (!hasLuxDP && this.hasCapability('measure_luminance')) {
      try {
        await this.removeCapability('measure_luminance');
        this.log('[RADAR] 🧹 Removed orphan measure_luminance (not supported by this sensor)');
      } catch (e) { /* ignore */ }
    }

    // v5.5.852: ADD temperature/humidity for sensors that support them (ZG-204ZV fix)
    // Peter_van_Werkhoven forum #1203: ZG-204ZV should have temp+humidity
    if (!config.noTemperature && !this.hasCapability('measure_temperature')) {
      try {
        await this.addCapability('measure_temperature');
        this.log('[RADAR] ðŸŒ¡ï¸ Added measure_temperature (sensor supports it)');
      } catch (e) { /* ignore */ }
    }
    if (!config.noHumidity && !this.hasCapability('measure_humidity')) {
      try {
        await this.addCapability('measure_humidity');
        this.log('[RADAR] ðŸ’§ Added measure_humidity (sensor supports it)');
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
        this.log('[RADAR] ðŸ”‹ Added measure_battery (sensor supports it)');
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
    if (!ep1 ) return;

    // Listen for Tuya DP reports (cluster CLUSTERS.TUYA_EF00)
    // v5.8.30: Enhanced with ALL event names (4x4_Pete battery sensor fix)
    try {
      const tuyaCluster = ep1.clusters?.tuya || ep1.clusters?.[CLUSTERS.TUYA_EF00] ||
        ep1.clusters?.['tuya'] || ep1.clusters?.['CLUSTERS.TUYA_EF00'] || ep1.clusters?.manuSpecificTuya;
      if (tuyaCluster?.on) {
        const events = ['response', 'reporting', 'datapoint', 'dataReport', 'dataResponse', 'report', 'data', 'set'];
        for (const event of events) {
          try {
            tuyaCluster.on(event, (data) => {
              this._handleTuyaResponse(data);
      });
          } catch (e) { /* ignore */ }
        }
        this.log('[RADAR] ✅ Passive Tuya listener configured (all events)');
      }
    } catch (e) { /* ignore */ }    try {
      if (zclNode?.on) {
        zclNode.on('command', (cmd) => {
          if (cmd.cluster === CLUSTERS.TUYA_EF00 || cmd.cluster === 'tuya') {
            this._handleTuyaResponse(cmd.data || cmd);
          }
        });
      }
    } catch (e) { /* ignore */ }

    // Listen for occupancy reports
    try {
      const occCluster = ep1.clusters?.msOccupancySensing;if (occCluster?.on) {
        occCluster.on('attr.occupancy', (v) => {
          const rawOccupied = (v & 0x01) !== 0;
          const occupied = this._applyPresenceInversion(rawOccupied);
          this.log(`[RADAR] Occupancy: raw=${rawOccupied} â†’ ${occupied}`);
          this.setCapabilityValue('alarm_motion', occupied).catch(() => { });
          this._triggerPresenceFlows(occupied);
      });
        this.log('[RADAR] ✅ Passive occupancy listener configured');
      }
    } catch (e) { /* ignore */ }

    // v5.8.7: PERMISSIVE IAS Zone listener (HOBEIAN ZG-204ZM uses IAS Zone 1280 for motion)
    // v5.8.43: PR#125 michelhelsdingen - Skip IAS motion for sensors where DP is authoritative
    try {
      const iasZone = ep1.clusters?.iasZone || ep1.clusters?.ssIasZone || ep1.clusters?.[1280];
      const permissiveConfig = this._getSensorConfig?.() || {};if (iasZone?.on) {
        iasZone.on('attr.zoneStatus', (status) => {
          const sn = typeof status === 'number' ? status : (status?.data?.[0] || 0);
          const raw = (sn & 0x03) !== 0;
          const motion = this._applyPresenceInversion(raw );
          if (permissiveConfig.noIasMotion && this._hasTuyaDPCluster !== false) {
            this.log(`[RADAR] IAS zoneStatus: ${sn} â†’ SKIPPED (noIasMotion, has Tuya DP)`);
            return;
          }
          this.log(`[RADAR] IAS zoneStatus: ${sn} â†’ ${motion}`);
          this.setCapabilityValue('alarm_motion', motion).catch(() => {});
          this._triggerPresenceFlows(motion);
      });
        if (!iasZone.onZoneStatusChangeNotification) {
          iasZone.onZoneStatusChangeNotification = (p) => {
            const s = p?.zoneStatus ?? p?.data?.[0] ?? 0;
            const motion = this._applyPresenceInversion((s & 0x03) !== 0);
            if (permissiveConfig.noIasMotion && this._hasTuyaDPCluster !== false) {
              this.log(`[RADAR] IAS notification: ${s} â†’ SKIPPED (noIasMotion, has Tuya DP)`);
              return;
            }
            this.log(`[RADAR] IAS notification: ${s} â†’ ${motion}`);
            this.setCapabilityValue('alarm_motion', motion).catch(() => {});
            this._triggerPresenceFlows(motion);
          };
        }
        this.log('[RADAR] ✅ Passive IAS Zone listener configured');
      }
    } catch (e) { /* ignore */ }

    // v5.8.7: Permissive ZCL listeners - auto-add capabilities from any protocol
    this._setupPermissiveZclListeners(ep1);
  }

  /**
   * v5.8.7: Permissive ZCL listeners for battery devices
   * Dynamically adds capabilities when ZCL data arrives from any cluster
   */
  _setupPermissiveZclListeners(ep1) {
    if (!ep1) return;
    const self = this;
    const config = this._getSensorConfig?.() || {};const listen = (cluster, attr, cb) => {
      try { if (cluster?.on) cluster.on(attr, cb);} catch (e) { /* ignore */ }
    };

    // v5.8.86: JJ10 forum fix - respect noTemperature/noHumidity config flags
    // Previously, ZCL listeners would re-add capabilities that were removed by orphan cleanup
    listen(ep1.clusters?.msTemperatureMeasurement, 'attr.measuredValue', async (v) => {
      if (config.noTemperature) return;
      const t = v * 100;
      if (t <= -40 || t >= 100) return;
      if (!self.hasCapability('measure_temperature'))
        await self.addCapability('measure_temperature').catch(() => {});
      self.setCapabilityValue('measure_temperature', t).catch(() => {});
      });

    listen(ep1.clusters?.msRelativeHumidity, 'attr.measuredValue', async (v) => {
      if (config.noHumidity) return;
      const h = v * 100;
      if (h < 0 || h > 100) return;
      if (!self.hasCapability('measure_humidity'))
        await self.addCapability('measure_humidity').catch(() => {});
      self.setCapabilityValue('measure_humidity', h).catch(() => {});
      });

    listen(ep1.clusters?.msIlluminanceMeasurement, 'attr.measuredValue', async (v) => {
      const lux = parseFloat(Math.round(Math.pow(10, (v - 1) / 10000)));
      if (!self.hasCapability('measure_luminance'))
        await self.addCapability('measure_luminance').catch(() => {});
      self.setCapabilityValue('measure_luminance', lux).catch(() => {});
      });

    // v5.11.3: Add throttle to prevent duplicate unthrottled battery updates
    // Root cause of Patrick_Van_Deursen battery oscillation (100%â†”1%):
    // _setupZclClusters registers a throttled listener, but this permissive one
    // was firing unthrottled on every attr report, bypassing the throttle.
    let lastPermBattUpdate = 0;
    let lastPermBattValue = null;
    const battThrottleMs = config.batteryThrottleMs || 300000;
    listen(ep1.clusters?.genPowerCfg || ep1.clusters?.powerConfiguration, 'attr.batteryPercentageRemaining', async (v) => {
      if (v === undefined || v === 255) return;
      const b = Math.min(100, Math.round(v));
      const now = Date.now();
      if (now - lastPermBattUpdate < battThrottleMs) return;
      if (lastPermBattValue !== null && Math.abs(b - lastPermBattValue) < 5) return;
      lastPermBattUpdate = now;
      lastPermBattValue = b;
      if (!self.hasCapability('measure_battery'))
        await self.addCapability('measure_battery').catch(() => {});
      self.setCapabilityValue('measure_battery', b).catch(() => {});
      });
  }

  /**
   * v5.5.790: Apply presence inversion for ZCL paths
   * Forum INT-001: _TZE284_iadro9bf motion ALWAYS YES - ZCL not using invertPresence
   */
  _applyPresenceInversion(occupied) {
    const config = this._getSensorConfig();
    const settings = this.getSettings() || {};
    const invertPresence = settings.invert_presence ?? config.invertPresence ?? false;
    
    if (invertPresence ) {
      const inverted = !occupied;
      this.log(`[RADAR] ðŸ”„ ZCL presence inversion: ${occupied} â†’ ${inverted}`);
      return inverted;
    }
    return occupied;
  }

  /**
   * v5.5.277: Parse Buffer data to integer value
   * Ronny fix: data.data was Buffer [0,0,13,70] â†’ need to parse to 3398
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
      return parseInt(data , 10);
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
      dataFormat: Array.isArray(rawValue?.data ) ? `Buffer[${rawValue.data.join(' , ')}]` : typeof rawValue
    };

    // Special logging for problem DPs reported in forum
    if ([1, 9, 12, 104, 105, 112].includes(dpId)) {
      this.log(`[DIAG] ðŸ” DP${dpId} (${dpConfig?.cap || 'unmapped'}): ${JSON.stringify(diagnosticInfo)}`);
    }

    // Detect passive reporting issues
    // v5.8.76: Fix false positive â€” 0 is a valid value (e.g. DP1=0 means no presence)
    if (dpConfig && (value === null || value === undefined) && rawValue) {
      this.log(`[DIAG] âšï¸ DP${dpId} parsing failed - passive reporting issue? Raw: ${JSON.stringify(rawValue)}`);
    }

    // Log missing expected DPs
    const expectedDPs = Object.keys(dpMap).map(Number);
    const missingDPs = expectedDPs.filter(dp => !this._receivedDPs.has(dp));
    if (missingDPs.length > 0) {
      this.log(`[DIAG] ðŸ“ Missing DPs for ${mfr}: [${missingDPs.join(', ')}] (may be passive only)`);
    }
  }

  /**
   * v5.5.304: ENHANCED Tuya response handler with presence=null workaround
   * - Coordinate with UnifiedSensorBase to avoid dual processing
   * - Only handle special presence DPs locally (1, 105, 112)
   * - v5.5.304: DISTANCE-BASED PRESENCE INFERENCE for firmware bug workaround
   * - v5.5.364: AUTO-DISCOVERY integration for unknown devices
   */
  _handleTuyaResponse(data) {
    if (!data) return;

    // Mark device as available when we receive data
    this.setAvailable().catch(() => { });

    let dpId = data.dp || data.dpId || data.datapoint;
    
    // v7.5.0: Feed all DPs to AutonomousIntelligenceGate for heuristic learning
    const rawVal = this._parseBufferValue(data.value || data.data);
    if (this._intelGate && dpId !== undefined) {
      this._intelGate.process(dpId, rawVal);
    }

    // v5.8.39: Handle COMPOUND DP frames (3reality multi-DP-in-one)
    // When data.length (declared DP size) < actual buffer, slice and parse sub-DPs
    const rawBuf = data.data || data.value;
    if (dpId !== undefined && Buffer.isBuffer(rawBuf) && typeof data.length === 'number'
        && data.length > 0 && rawBuf.length > data.length && rawBuf.length > 4) {
      this.log(`[RADAR] 🔄 Compound frame: DP${dpId} declared=${data.length}B, buffer=${rawBuf.length}B`);
      const dpSlice = rawBuf.slice(0, data.length);
      const remaining = rawBuf.slice(data.length);
      // Replace data with sliced value for this DP
      data = { ...data, data: dpSlice, value: dpSlice };
      // Parse remaining bytes as TLV sub-DPs
      let off = 0;
      while (off + 4 <= remaining.length) {
        const subDp = remaining.readUInt8(off);
        const subType = remaining.readUInt8(off + 1);
        const subLen = remaining.readUInt16BE(off + 2);
        if (subDp === 0 || subDp > 200 || subLen > 64 || off + 4 + subLen > remaining.length) break;
        const subData = remaining.slice(off + 4, off + 4 + subLen);
        off += 4 + subLen;
        this.log(`[RADAR] 🔄 Compound sub-DP${subDp}: type=${subType}, len=${subLen}, hex=${subData.toString('hex')}`);
        this._handleTuyaResponse({ dp: subDp, datatype: subType, length: subLen, data: subData });
      }
    }

    // v5.8.30: Raw Tuya frame parsing fallback (4x4_Pete battery sensor fix)
    // When data arrives via node-level command listener, it may be a raw Buffer
    // Format: [seq:2][dp:1][type:1][len:2][data:len]
    if (dpId === undefined && data.data && (Buffer.isBuffer(data.data) || Array.isArray(data.data))) {
      const bytes = Buffer.isBuffer(data.data) ? data.data : Buffer.from(data.data);
      if (bytes.length >= 7) {
        const dp = bytes[2];
        const dpType = bytes[3];
        const dpLen = (bytes[4] << 8) | bytes[5];
        let value;
        if (dpType === 1 && dpLen === 1) value = bytes[6]; // Bool
        else if (dpType === 2 && dpLen === 4) value = bytes.readUInt32BE(6); // Value
        else if (dpType === 4 && dpLen === 1) value = bytes[6]; // Enum
        else value = bytes[6];
        this.log(`[RADAR] 🔧 Parsed raw frame: DP${dp} type=${dpType} len=${dpLen} value=${value}`);
        dpId = dp;
        data = { dp, value, dpType, raw: true };
      }
    }

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
      // v5.11.12: Only log first occurrence per DP to prevent spam
      this._loggedStaticDps = this._loggedStaticDps || {};
      if (!this._loggedStaticDps[dpId]) {
        this._loggedStaticDps[dpId] = true;
        this.log(`[RADAR] 📋 DP${dpId} has static mapping â†’ ${staticMapping.cap}, skipping auto-discovery`);
      }
    } else {
      // v5.5.364: AUTO-DISCOVERY - Feed all DPs to learning engine for unknown devices
      if (this._dpAutoDiscovery) {
        const rawVal = this._parseBufferValue(data.value || data.data);
        this._dpAutoDiscovery.analyzeDP(dpId, rawVal);

        // Try to apply auto-discovered mapping
        const discovered = this._dpAutoDiscovery.applyDiscoveredValue(dpId, rawVal);
        if (discovered && discovered.confidence >= 70) {
          this.log(`[AUTO-DISCOVERY] ✨ DP${dpId} â†’ ${discovered.capability} = ${discovered.value} (confidence: ${discovered.confidence}%)`);

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

    // v5.5.310: FIXED - Handle DP12 and DP103 locally, NOT via UnifiedSensorBase!
    // Problem: UnifiedSensorBase universal profile maps DP103 to temperature, not lux
    // Solution: Handle lux DPs (12, 102, 103) directly here using local dpMap config
    // Note: config and dpMap already declared above for static mapping check

    // Check if this DP is a lux DP in our config - handle locally
    if (dpMap[dpId]?.cap === 'measure_luminance') {
      const luxValue = this._parseBufferValue(data.value || data.data);
      const mfr = this._getManufacturerName();
      const deviceId = this.getData()?.id;let finalLux = transformLux(luxValue, dpMap[dpId].type || 'lux_direct', mfr, deviceId);

      // v5.7.52: CRITICAL FIX - Shared throttle with ZCL to prevent fighting
      // Track Tuya DP updates and skip if ZCL updated recently
      const now = Date.now();
      this._luxLastUpdateSource = this._luxLastUpdateSource || {};
      
      // If ZCL updated within last 5s, skip Tuya DP update to prevent fighting
      if (this._luxLastUpdateSource.zcl && now - this._luxLastUpdateSource.zcl < 5000) {
        return;
      }
      this._luxLastUpdateSource.tuya = now;

      // v5.11.12: Same-value dedup â€” skip if lux hasn't changed
      const currentLux = this.getCapabilityValue('measure_luminance') || 0;
      if (finalLux === currentLux) return;

      // v5.5.985: Peter #1282 - Lux smoothing to prevent light flickering
      if (config.luxSmoothingEnabled) {
        const minChange = config.luxMinChangePercent || 10;
        // v5.11.12: Fix change calc when currentLux=0 (was always returning 100%)
        const changePercent = currentLux > 0 ? (Math.abs(finalLux - currentLux) / currentLux) * 100 : (finalLux > 0 ? 100 : 0);
        
        if (changePercent < minChange) {
          // Ignore small changes to prevent flow triggers
          return;
        }
        this.log(`[RADAR-LUX] â˜€ï¸ DP${dpId} â†’ ${finalLux} lux (change: ${changePercent.toFixed(1)}%)`);
      } else {
        this.log(`[RADAR-LUX] â˜€ï¸ DP${dpId} â†’ ${finalLux} lux`);
      }
      
      this.setCapabilityValue('measure_luminance', parseFloat(finalLux)).catch(() => { });

      // v5.5.315: Feed lux to intelligent inference engine
      if (dpMap[dpId].feedInference) {
        this._feedLuxToInference(finalLux);
      }
      return;
    }

    // v5.5.932: PETER FIX - Handle temperature/humidity DPs locally when config specifies
    // HOBEIAN ZG-204ZV uses DP3 = temp, DP4=humidity - must apply divisor correctly!
    if (dpMap[dpId]?.cap === 'measure_temperature') {
      const rawTemp = this._parseBufferValue(data.value || data.data);
      const divisor = dpMap[dpId].divisor || 10;
      const temp = safeDivide(rawTemp, divisor);
      if (temp >= -40 && temp <= 80) {
        this.log(`[RADAR] ðŸŒ¡ï¸ DP${dpId} â†’ temperature = ${temp}Â°C (raw: ${rawTemp}, Ã·${divisor})`);
        this.setCapabilityValue('measure_temperature', temp).catch(() => { });
      } else {
        this.log(`[RADAR] âšï¸ DP${dpId} temperature out of range: ${temp}Â°C (raw: ${rawTemp})`);
      }
      return;
    }

    if (dpMap[dpId]?.cap === 'measure_humidity') {
      const rawHumid = this._parseBufferValue(data.value || data.data );
      const divisor = dpMap[dpId].divisor || 1;
      const multiplier = dpMap[dpId].multiplier || 1;
      // v5.5.987: Peter #1265 - Support multiplier for humidity (9% â†’ 90%)
      // v5.11.26: Auto-fix out-of-range - some variants report Ã—10 (700=70%)
      // while others report Ã·10 (9=90%), so multiplier:10 doesn't work for all
      let humidity = safeDivide(Math.round(rawHumid, divisor), multiplier);
      if (humidity > 100 && rawHumid > 100) {
        humidity = Math.round(rawHumid);
      }
      if (humidity >= 0 && humidity <= 100) {
        this.log(`[RADAR] ðŸ’§ DP${dpId} â†’ humidity = ${humidity}% (raw: ${rawHumid}, Ã·${divisor}, Ã—${multiplier})`);
        this.setCapabilityValue('measure_humidity', humidity).catch(() => { });
      } else {
        this.log(`[RADAR] âšï¸ DP${dpId} humidity out of range: ${humidity}% (raw: ${rawHumid})`);
      }
      return;
    }

    // v5.5.932: Handle battery DPs locally when config specifies
    // v5.5.983: 4x4_Pete forum fix - add battery throttling to prevent spam
    if (dpMap[dpId]?.cap === 'measure_battery') {
      const rawBatt = this._parseBufferValue(data.value || data.data);
      const divisor = dpMap[dpId].divisor || 1;
      const battery = safeDivide(Math.round((rawBatt, divisor)));
      if (battery >= 0 && battery <= 100) {
        // v5.5.983: Check battery throttling config
        const now = Date.now();
        const throttleMs = config?.batteryThrottleMs || 300000;// Default 5 min
        const lastBatteryUpdate = this._lastBatteryUpdate || 0;
        const currentBattery = this.getCapabilityValue('measure_battery');
        const batteryChange = Math.abs((currentBattery || 0) - battery);
        
        // Only update if: significant change (>5%) OR enough time passed OR first report
        if (batteryChange >= 5 || (now - lastBatteryUpdate) > throttleMs || lastBatteryUpdate === 0) {
          this.log(`[RADAR] ðŸ”‹ DP${dpId} â†’ battery = ${battery}% (change: ${batteryChange}%)`);
          this.setCapabilityValue('measure_battery', battery).catch(() => { });
          this._lastBatteryUpdate = now;
        } else {
          // Suppress spam - don't log to reduce noise
        }
      }
      return;
    }

    // v5.12: Fix #97 generic distance handler
    if (dpMap[dpId] && dpMap[dpId].cap === 'measure_luminance.distance') {
      const rawDist = this._parseBufferValue(data.value || data.data);
      const divisor = dpMap[dpId].divisor || 100;
      const dist = Math.round(rawDist/divisor * 100) * 100;
      if (dist >= 0 && dist <= 20) {
        this.log('[RADAR] ðŸ“ DP' + dpId + ' distance=' + dist + 'm (raw:' + rawDist + ')');
        this.setCapabilityValue('measure_luminance.distance', dist).catch(() => {});
      }
      return;
    }

    // Only filter DPs that UnifiedSensorBase handles for settings (NOT capabilities!)
    const HYBRIDSENSOR_SETTINGS_DPS = [2, 15]; // settings only,NOT temp/humidity / battery
    if (HYBRIDSENSOR_SETTINGS_DPS.includes(dpId) && !dpMap[dpId]?.cap) {
      // Let UnifiedSensorBase handle settings DPs only
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
          this.log(`[RADAR] 🧠DP1=null - using inference: presence=${inferredPresence} (confidence: ${this._presenceInference.getConfidence()}%)`);
          if (inferredPresence !== this.getCapabilityValue('alarm_motion')) {
            this._handlePresenceWithDebounce(inferredPresence , 1);
          }
          return;
        }
      }

      if (presenceValue !== null) {
        // v7.3.5: Integrate Autonomous Intelligence Gate
        if (this._intelGate) {
          const processed = this._intelGate.process('alarm_motion', presenceValue);
          if (processed && processed.skip) {
            this.log(`[RADAR] 🧠Intelligence Gate: SKIPPED presence=${presenceValue} (reason: ${processed.reason})`);
            return;
          }
        }

        // v5.5.279: Debounce presence to fix "flash 0.5s" issue
        this._handlePresenceWithDebounce(presenceValue, dpId);
        return;
      }
    }

    // v5.11.4: Only log "unknown DP" if dpMap doesn't already handle it
    // Fixes noisy DP106 logs for HOBEIAN_ZG204ZM and other configs where dpMap handles lux/settings
    if (!dpMap[dpId]) {
      this.log(`[RADAR] 📡 DP${dpId} = ${value} (unknown DP, please report to developer)`);
    }
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
        const appVersion = attrs?.appVersion;if (appVersion && this._presenceInference) {
          this._presenceInference.setFirmwareInfo(appVersion );
          this.log(`[RADAR] 📲 Detected firmware: appVersion=${appVersion}`);

          // Store for reference
          this._firmwareAppVersion = appVersion;
        }
      }
    } catch (e) {
      this.log(`[RADAR] âšï¸ Could not detect firmware version: ${e.message}`);
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
    const distanceMeters = safeDivide(rawDistance, divisor);
    this.setCapabilityValue('measure_luminance.distance', parseFloat(distanceMeters)).catch(() => { });
    this.log(`[RADAR] ðŸ“ Distance: ${distanceMeters}m (raw: ${rawDistance})`);

    // v5.5.315: Feed distance to intelligent inference engine
    if (this._presenceInference) {
      const inferredPresence = this._presenceInference.updateDistance(distanceMeters);
      const confidence = this._presenceInference.getConfidence();
      const currentPresence = this.getCapabilityValue('alarm_motion');

      // Update presence if inference differs from current state
      if (inferredPresence !== currentPresence && confidence >= 40) {
        this.log(`[RADAR] 🧠INTELLIGENT INFERENCE: presence=${inferredPresence} (confidence: ${confidence}%)`);
        this._handlePresenceWithDebounce(inferredPresence );
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
        this.log(`[RADAR] ðŸŽ¯ DISTANCE INFERENCE: presence=${inferredPresence} (distance=${distanceMeters}m, max=${maxRange}m)`);
        this._handlePresenceWithDebounce(inferredPresence , 9);
      }
      this._updatePresenceTimestamp();
    }
  }

  /**
   * v5.5.315: Feed lux value to intelligent inference engine
   * Rapid lux changes indicate movement, presence
   */
  _feedLuxToInference(luxValue) {
    if (this._presenceInference) {
      const inferredPresence = this._presenceInference.updateLux(luxValue);
      const confidence = this._presenceInference.getConfidence();
      const currentPresence = this.getCapabilityValue('alarm_motion');

      // Only update from lux if high confidence and state differs
      if (inferredPresence !== currentPresence && confidence >= 50) {
        this.log(`[RADAR] 🧠LUX-BASED INFERENCE: presence=${inferredPresence} (confidence: ${confidence}%)`);
        this._handlePresenceWithDebounce(inferredPresence , 104); // Use DP104 as source
      }
    }
  }

  /**
   * v5.5.279: Parse presence value from any format
   * Returns true, false or null if invalid
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

    // Only apply to problematic sensors (case-insensitive)
    const mfrLower = (mfr || '').toLowerCase();
    if (!mfrLower.includes('iadro9bf') && !mfrLower.includes('qasjif9e')) {
      return presence;
    }

    const now = Date.now();
    this._motionThrottle = this._motionThrottle || {
      lastUpdate: 0,
      lastValue,
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
        this.log(`[RADAR] âšï¸ STUCK MODE ACTIVATED: ${this._motionThrottle.consecutiveSame} consecutive ${presence} values - using distance inference only`);
      }
    } else {
      // Value changed - reset stuck detection
      if (this._motionThrottle.stuckMode) {
        this.log(`[RADAR] ✅ STUCK MODE CLEARED: value changed from ${this._motionThrottle.lastValue} to ${presence}`);
      }
      this._motionThrottle.consecutiveSame = 0;
      this._motionThrottle.stuckMode = false;
    }

  }

  // v5.8.50: Using centralized presence logic from UnifiedSensorBase
  
  async _setupZclClusters(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1 ) return;

    // v5.5.512: Power Configuration cluster (0x0001) for battery
    // HOBEIAN ZG-204ZM uses ZCL battery reporting
    // v5.5.988: Patrick #1288 - Add throttle to prevent battery spam (100% â†” 1-2%)
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
          const battery = Math.min(100, Math.round(v));
          
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
          this.log(`[RADAR] ðŸ”‹ ZCL Battery: ${v} -> ${battery}%`);
          this.setCapabilityValue('measure_battery', battery).catch(() => { });
      });
        powerCluster.on('attr.batteryVoltage', (v) => {
          // Backup: calculate from voltage if percentage not available
          // Typical CR2450: 3.0V full, 2.0V empty
          if (v && !this.getCapabilityValue('measure_battery')) {
            const battery = Math.min(100, Math.max(0, Math.round(v - 20)));
            this.log(`[RADAR] ðŸ”‹ ZCL Battery voltage: ${v/10}V -> ${battery}%`);
            this.setCapabilityValue('measure_battery', battery).catch(() => { });
          }
        });
        this.log('[RADAR] ✅ PowerConfiguration cluster configured (5min throttle + 5% minChange)');
      }
    } catch (e) { /* ignore */ }

    // Illuminance cluster (0x0400)
    // v5.5.986: Peter #1282 - Add throttle to prevent disco lights
    try {
      const illumCluster = ep1.clusters?.msIlluminanceMeasurement;if (illumCluster?.on) {
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
            const changePercent = (Math.abs(roundedLux - lastLuxValue / lastLuxValue) / 100);
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
        tempCluster.on('attr.measuredValue', (v ) => {
          // ZCL reports temperature in hundredths of Â°C (e.g., 2350 = 23.50Â°C)
          const temp = v * 100;
          if (temp > -40 && temp < 100) { // Sanity check
            this.log(`[RADAR] ðŸŒ¡ï¸ ZCL Temperature: ${v} -> ${temp}Â°C`);
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
        humCluster.on('attr.measuredValue', (v ) => {
          // ZCL reports humidity in hundredths of % (e.g., 6500 = 65.00%)
          const humidity = v * 100;
          if (humidity >= 0 && humidity <= 100) { // Sanity check
            this.log(`[RADAR] ðŸ’§ ZCL Humidity: ${v} -> ${humidity}%`);
            this.setCapabilityValue('measure_humidity', humidity).catch(() => { });
          }
        });
        this.log('[RADAR] ✅ Humidity cluster (0x0405) configured - ZG-204ZV fix');
      }
    } catch (e) { /* ignore */ }

    // Occupancy cluster (0x0406)
    try {
      const occCluster = ep1.clusters?.msOccupancySensing;if (occCluster?.on) {
        occCluster.on('attr.occupancy', (v) => {
          const rawOccupied = (v & 0x01) !== 0;
          const occupied = this._applyPresenceInversion(rawOccupied);
          this.log(`[RADAR] Occupancy: raw=${rawOccupied} â†’ ${occupied}`);
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
        this.log('[RADAR] â„¹ï¸ No IAS Zone cluster - skipping enrollment');
        return;
      }

      // Store reference for re-enrollment
      this._iasZoneCluster = iasZone;
      this._zclNode = zclNode;

      this.log('[RADAR] ðŸ” Starting IAS Zone enrollment (v5.5.538 with retry)...');

      // Step 1: Read current zone state
      let currentState = null;
      let currentZoneId = null;
      try {
        const attrs = await iasZone.readAttributes(['zoneState', 'zoneType', 'zoneStatus', 'zoneId']);
        this.log(`[RADAR] IAS Zone current: zoneState=${attrs?.zoneState}, zoneType=${attrs?.zoneType}, zoneId = ${attrs?.zoneId}`);currentState = attrs?.zoneState;currentZoneId = attrs?.zoneId;// If already enrolled (zoneState=1 and zoneId != 255), just setup listeners
        if ((currentState === 1 || currentState === 'enrolled') && currentZoneId !== 255) {
          this.log('[RADAR] ✅ IAS Zone already enrolled - setting up listeners only');
          await this._setupIASZoneListeners(iasZone);
          return;
        }
      } catch (e) {
        this.log(`[RADAR] âšï¸ Could not read zone state: ${e.message}`);
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
        if (!homeyIeee || homeyIeee === '0000000000000000' ) {
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
          this.log(`[RADAR] âšï¸ Could not write IAS CIE (attempt ${attempt}): ${e.message}`);
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
          this.log(`[RADAR] âšï¸ IAS Zone enrollment failed (attempt ${attempt}): ${e.message}`);
          if (attempt < 3) await new Promise(r => setTimeout(r, 1000));
        }
      }

      // Step 6: Verify enrollment after delay
      await new Promise(r => setTimeout(r, 2000));
      try {
        const verifyAttrs = await iasZone.readAttributes(['zoneState', 'zoneId']);
        this.log(`[RADAR] ðŸ” Verify enrollment: zoneState=${verifyAttrs?.zoneState}, zoneId = ${verifyAttrs?.zoneId}`);if (verifyAttrs?.zoneState === 1 || verifyAttrs?.zoneState === 'enrolled') {
          this.log('[RADAR] ✅ IAS Zone enrollment VERIFIED');} else {
          this.log('[RADAR] âšï¸ IAS Zone enrollment NOT verified - will retry on next init' );
        }
      } catch (e) {
        this.log(`[RADAR] âšï¸ Could not verify enrollment: ${e.message}`);
      }

      // Step 7: Setup zone status listeners
      await this._setupIASZoneListeners(iasZone);

      // Step 8: Start periodic enrollment check for devices that lose enrollment
      this._startEnrollmentCheck();

      this.log('[RADAR] ✅ IAS Zone enrollment complete');
    } catch (error) {
      this.log(`[RADAR] âŒ IAS Zone enrollment failed: ${error.message}`);
    }
  }

  /**
   * v5.5.538: Setup IAS Zone enroll request handler
   */
  async _setupIASZoneEnrollHandler(iasZone) {
    try {
      const enrollHandler = async (payload) => {
        this.log(`[RADAR] ðŸ“© Received zoneEnrollRequest: ${JSON.stringify(payload)}`);
        try {
          if (iasZone.zoneEnrollResponse) {
            await iasZone.zoneEnrollResponse({ enrollResponseCode: 0, zoneId: 1 });
            this.log('[RADAR] ✅ Sent zoneEnrollResponse (success, zoneId=1)');
          }
        } catch (err) {
          this.log(`[RADAR] âšï¸ zoneEnrollResponse failed: ${err.message}`);
        }
      };

      // v5.12.3: Always assign handler (SDK3 pattern) - fixes #97 NoroddH radar
      iasZone.onZoneEnrollRequest = enrollHandler;
      if (iasZone.on) {
        iasZone.on('zoneEnrollRequest', enrollHandler);
      }
      this.log('[RADAR] ✅ zoneEnrollRequest handler configured');
    } catch (e) {
      this.log(`[RADAR] âšï¸ Could not setup enrollRequest handler: ${e.message}`);
    }
  }

  /**
   * v5.5.538: Setup IAS Zone status listeners
   */
  async _setupIASZoneListeners(iasZone) {
    if (!iasZone?.on) return;

    // v5.8.43: PR#125 michelhelsdingen - Skip IAS motion for sensors where DP is authoritative (e.g. HOBEIAN 10G)
    const config = this._getSensorConfig?.() || {};// v5.8.88: Respect runtime noIasMotion override (set when device has NO Tuya DP cluster)
    const effectiveNoIasMotion = this._noIasMotionOverride !== undefined ? this._noIasMotionOverride : config.noIasMotion;

    // Attribute change listener - v5.5.790: Apply presence inversion
    iasZone.on('attr.zoneStatus', (status) => {
      const statusNum = typeof status === 'object' ? (status?.data?.[0] || 0 ) : (typeof status === 'number' ? status : 0);
      const alarm1 = (statusNum & 0x01) !== 0;
      const alarm2 = (statusNum & 0x02) !== 0;
      const rawMotion = alarm1 || alarm2;
      const motion = this._applyPresenceInversion(rawMotion);
      if (effectiveNoIasMotion) {
        this.log(`[RADAR] IAS zoneStatus attr: ${statusNum} -> raw=${rawMotion} -> SKIPPED (noIasMotion)`);
        return;
      }
      this.log(`[RADAR] IAS zoneStatus attr: ${statusNum} -> raw=${rawMotion} -> ${motion}`);
      this.setCapabilityValue('alarm_motion', motion).catch(() => { });
      this._triggerPresenceFlows(motion);
      });

    // Zone status change notification (ZCL command) - v5.5.790: Apply presence inversion
    iasZone.onZoneStatusChangeNotification = (payload) => {
      const status = payload?.zoneStatus ?? payload?.data?.[0] ?? 0;
      const rawMotion = (status & 0x03) !== 0;
      const motion = this._applyPresenceInversion(rawMotion );
      if (effectiveNoIasMotion) {
        this.log(`[RADAR] IAS notification: ${status} -> raw=${rawMotion} -> SKIPPED (noIasMotion)`);
        return;
      }
      this.log(`[RADAR] IAS zoneStatusChangeNotification: ${status} -> raw=${rawMotion} -> ${motion}`);
      this.setCapabilityValue('alarm_motion', motion).catch(() => { });
      this._triggerPresenceFlows(motion);
    };

    // v5.8.88: Opportunistic enrollment for sleepy battery devices
    let _enrollTried = false;
    iasZone.on('attr.zoneStatus', () => {
      if (_enrollTried) return;
      _enrollTried = true;
      setTimeout(async () => {
        try {
          const a = await iasZone.readAttributes(['zoneState']);
          if (a?.zoneState === 0 || a?.zoneState === 'notEnrolled') {
            this.log('[RADAR] v5.8.88: Device awake but notEnrolled â€” opportunistic enroll');
            await this._reEnrollIASZone();
          }
        } catch (e) { /* device asleep */ }
        setTimeout(() => { _enrollTried = false; }, 60000);
      }, 2000);
      });

    // Also listen for attr.zoneState to detect enrollment loss
    iasZone.on('attr.zoneState', async (state) => {
      this.log(`[RADAR] IAS zoneState changed: ${state}`);
      if (state === 0 || state === 'notEnrolled') {
        this.log('[RADAR] âšï¸ Zone became notEnrolled - attempting re-enrollment');
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
      this.log('[RADAR] ðŸ”„ Re-enrolling IAS Zone...');
      const iasZone = this._iasZoneCluster;

      // Try to enroll again
      if (iasZone.zoneEnrollResponse) {
        await iasZone.zoneEnrollResponse({ enrollResponseCode: 0, zoneId: 1 });
        this.log('[RADAR] ✅ Re-enrollment response sent');
      }
    } catch (e) {
      this.log(`[RADAR] âšï¸ Re-enrollment failed: ${e.message}`);
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
          this.log('[RADAR] âšï¸ Periodic check: enrollment lost - re-enrolling');
          await this._reEnrollIASZone();
        }
      } catch (e) {
        // Ignore read errors during periodic check
      }
    },5 * 60 * 1000); // 5 minutes

    this.log('[RADAR] ✅ Periodic enrollment check started');
  }

  /**
   * v5.5.518: Send Tuya Magic Packet to enable DP communication
   * Required for LeapMMW 5.8G hybrid devices that don't show cluster CLUSTERS.TUYA_EF00
   * Source: Z2M configureMagicPacket + dataQuery sequence
   */
  async _sendTuyaMagicPacket(zclNode) {
    try {
      this.log('[RADAR] ðŸª„ Sending Tuya Magic Packet (LeapMMW 5.8G hybrid)...');

      const ep1 = zclNode?.endpoints?.[1];
      if (!ep1) {
        this.log('[RADAR] âšï¸ No endpoint 1 for magic packet' );
        return;
      }

      // Step 1: Read basic cluster (Z2M configureMagicPacket)
      const basicCluster = ep1.clusters?.basic || ep1.clusters?.genBasic;
      if (basicCluster && typeof basicCluster.readAttributes === 'function') {
        try {
          await basicCluster.readAttributes(['manufacturerName', 'modelId', 'powerSource']);
          this.log('[RADAR] ✅ Basic cluster read (magic packet step 1)');
        } catch (e) {
          this.log('[RADAR] âšï¸ Basic cluster read failed:', e.message);
        }
      }

      // Step 2: Try to access Tuya cluster and send dataQuery
      const tuyaCluster = ep1.clusters?.tuya || ep1.clusters?.[CLUSTERS.TUYA_EF00] || ep1.clusters?.manuSpecificTuya;
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
        this.log('[RADAR] â„¹ï¸ No Tuya cluster found - device may use IAS Zone only');
      }

      this.log('[RADAR] ✅ Magic packet sequence complete' );
    } catch (e) {
      this.log('[RADAR] âšï¸ Magic packet error:', e.message);
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

    this.log('[RADAR] 🔧 Setting up Tuya DP listeners for mains-powered sensor...' );

    // Try multiple cluster access methods
    const tuyaCluster = ep1.clusters?.tuya ||
      ep1.clusters?.['tuya'] ||
      ep1.clusters?.[CLUSTERS.TUYA_EF00] ||
      ep1.clusters?.['CLUSTERS.TUYA_EF00'] ||
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
      this.log('[RADAR] âšï¸ Tuya cluster not found - trying alternative methods');

      // Try binding to EF00 cluster directly
      try {
        const { Cluster } = require('zigbee-clusters');
        const TuyaCluster = Cluster.getCluster(CLUSTERS.TUYA_EF00);
        if (TuyaCluster && ep1.bind) {
          this.log('[RADAR] 🔧 Attempting direct EF00 cluster bind' );
        }
      } catch (e) { /* ignore */ }
    }

    // Also try the node-level listeners
    try {
      if (zclNode.on) {
        zclNode.on('command', (cmd) => {
          if (cmd.cluster === CLUSTERS.TUYA_EF00 || cmd.cluster === 'tuya') {
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

    this.log(`[RADAR] ðŸ”„ Starting presence+lux polling (${pollInterval/1000}s interval, aggressive=${useAggressive})`);

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
            this.log(`[RADAR] 🧠PERIODIC INFERENCE: presence=${inferredPresence} (confidence: ${confidence}%)`);
            this._handlePresenceWithDebounce(inferredPresence , 0); // DP0 = inference source
          }
        }

        // v5.5.304: More aggressive check - poll if no update in 15s (was 60s)
        const threshold = useAggressive ? 15000 : 60000;
        if (timeSinceLastPresence > threshold) {
          this.log(`[RADAR] ðŸ”„ No presence update in ${threshold/1000}s, requesting DP refresh...`);
          await this._requestDPRefresh(zclNode);

          // v5.5.304: Also request specific DP1 (presence) directly
          await this._requestSpecificDP(zclNode , 1);
        }

        // v5.5.308: Poll lux DPs every 3rd cycle to fix "lux only updates on motion" issue
        luxPollCounter++;
        if (luxPollCounter >= 3) {
          luxPollCounter = 0;
          if (config.hasIlluminance !== false) {
            this.log('[RADAR] â˜€ï¸ Polling lux DPs...');
            // Try common lux DPs: 12, 102, 103, 104, 106
            const luxDPs = [12, 102, 103, 104, 106];
            for (const dp of luxDPs) {
              if (config.dpMap?.[dp]?.cap === 'measure_luminance') {
                await this._requestSpecificDP(zclNode, dp);
                break; // Only poll first matching lux DP
              }
            }
          }
          
          // v5.9.14: Poll temp/humidity DPs â€” check BOTH config flags AND actual capabilities
          // F8 JJ10: Stale temp/humidity when config says noTemperature but device has capability
          const hasTemp = config.hasTemperature || this.hasCapability('measure_temperature');
          const hasHumid = config.hasHumidity || this.hasCapability('measure_humidity');
          if (hasTemp || hasHumid) {
            // Common temp DPs: 3, 5, 18, 111; humidity DPs: 4, 101
            const tempDPs = [3, 5, 18, 111];
            const humidDPs = [4, 101];
            if (hasTemp) {
              for (const dp of tempDPs) {
                if (config.dpMap?.[dp]?.cap === 'measure_temperature') {
                  await this._requestSpecificDP(zclNode, dp);
                  break;
                }
              }
            }
            if (hasHumid) {
              for (const dp of humidDPs) {
                if (config.dpMap?.[dp]?.cap === 'measure_humidity') {
                  await this._requestSpecificDP(zclNode, dp);
                  break;
                }
              }
            }
          }
        }
      } catch (e) {
        this.log(`[RADAR] âšï¸ Polling error: ${e.message}`);
      }
    }, pollInterval);

    // Initial poll after 2 seconds (faster than before)
    setTimeout(() => {
      this._requestDPRefresh(zclNode);
      this._requestSpecificDP(zclNode , 1);
    }, 2000);
  }

  /**
   * v5.5.304: Send time sync to device (like Tuya gateway)
   * Some devices won't report presence until they receive time sync
   */
  async _sendTimeSync(zclNode) {
    try {
      const ep1 = zclNode?.endpoints?.[1];
      const tuyaCluster = ep1?.clusters?.tuya || ep1?.clusters?.[CLUSTERS.TUYA_EF00];
      if (!tuyaCluster ) return;

      // Zigbee epoch: 2000-01-01 00:00:00 UTC
      const ZIGBEE_EPOCH = new Date(Date.UTC(2000, 0, 1, 0, 0, 0)).getTime();
      const utcSeconds = Math.floor((Date.now() - ZIGBEE_EPOCH) / 1000);
      const localSeconds =utcSeconds + (-new Date().getTimezoneOffset() * 60);

      // Create time payload (8 bytes: UTC + Local)
      const payload = Buffer.alloc(8);
      payload.writeUInt32BE(utcSeconds, 0);
      payload.writeUInt32BE(localSeconds, 4);

      // Send time response command (0x64 = 100)
      if (tuyaCluster.command) {
        await tuyaCluster.command('mcuSyncTime', { payloadSize: 8, payload });
        this.log('[RADAR] â° Time sync sent to device');
      }
    } catch (e) {
      this.log(`[RADAR] âšï¸ Time sync failed: ${e.message}`);
    }
  }

  /**
   * v5.5.304: Request specific DP value from device
   * Tuya gateway requests DP1 specifically to get presence
   */
  async _requestSpecificDP(zclNode, dpId) {
    try {
      const ep1 = zclNode?.endpoints?.[1];
      const tuyaCluster = ep1?.clusters?.tuya || ep1?.clusters?.[CLUSTERS.TUYA_EF00];
      if (!tuyaCluster ) return;

      // Method 1: dataRequest with specific DP
      if (tuyaCluster.dataRequest) {
        await tuyaCluster.dataRequest({ dp: dpId });
        this.log(`[RADAR] 📲 Requested DP${dpId} specifically`);
        return;
      }

      // Method 2: sendData with query format
      if (tuyaCluster.sendData) {
        await tuyaCluster.sendData({
          dp: dpId,
          datatype: 1, // Bool type for presence
          data: Buffer.from([])
        });
        this.log(`[RADAR] 📲 Requested DP${dpId} via sendData`);
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
      const tuyaCluster = ep1?.clusters?.tuya || ep1?.clusters?.[CLUSTERS.TUYA_EF00];

      if (tuyaCluster?.dataQuery) {
        // Request all datapoints
        await tuyaCluster.dataQuery();
        this.log('[RADAR] 📡 DP refresh requested' );
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
   * v5.8.55: Write settings to device via Tuya DPs
   * Dynamically reads the sensor config's dpMap entries with 'setting:' property
   * and sends the corresponding Tuya DP when user changes a device setting.
   * This is critical for ZG-204ZM settings (motion_detection_mode, fading_time,
   * indicator, sensitivity) to actually reach the device hardware.
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    // Call parent onSettings first (handles generic sensor settings)
    await super.onSettings({ oldSettings, newSettings, changedKeys }).catch(e => this.error('[RADAR] super.onSettings error:', e.message));

    const config = this._getSensorConfig();
    const dpMap = config?.dpMap || {};// Build reverse map: setting_name â†’ { dp, divisor, type }
    const settingToDp = {};
    for (const [dpStr, info] of Object.entries(dpMap)) {
      if (info.setting) {
        settingToDp[info.setting] = { dp: Number(dpStr), divisor: info.divisor, min: info.min, max: info.max };
      }
    }

    for (const key of changedKeys) {
      try {
        const mapping = settingToDp[key];
        if (mapping && this.tuyaEF00Manager) {
          let val = newSettings[key];
          // Convert boolean to 0/1
          if (typeof val === 'boolean') val = val ? 1 : 0;
          // Parse string to number (parseFloat to preserve decimal steps like 0.5m)
          val = parseFloat(val) || 0;
          // Apply divisor in reverse (multiply) for distance values stored as meters
          if (mapping.divisor && mapping.divisor > 1) val = Math.round(safeMultiply(val, mapping.divisor));
          // Clamp to min/max if defined
          if (mapping.min !== undefined) val = Math.max(mapping.min, val);
          if (mapping.max !== undefined) val = Math.min(mapping.max, val);
          await this.tuyaEF00Manager.sendDP(mapping.dp, val, 'value');
          this.log(`[RADAR] [SETTINGS] ✅ ${key}=${val} â†’ DP${mapping.dp}`);
        } else if (settingToDp[key] && !this.tuyaEF00Manager) {
          this.log(`[RADAR] [SETTINGS] âšï¸ ${key}: Tuya manager not available (battery device may be sleeping)`);
        }
      } catch (err) {
        this.log(`[RADAR] [SETTINGS] âŒ ${key}: ${err.message}`);
      }
    }
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
    const deviceId = this.getData()?.id;if (deviceId && luxOscillationState.has(deviceId)) {
      luxOscillationState.delete(deviceId);
    }

    this.log('[RADAR] 🧹 All timers and state cleaned up' );
  }

  /**
   * v7.4.6: Refresh state when device announces itself (rejoin/wakeup)
   */
  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself, refreshing state...');
    if (typeof this._updateLastSeen === 'function') this._updateLastSeen();
    // Proactive data recovery if supported
    if (this._dataRecoveryManager) {
       this._dataRecoveryManager.triggerRecovery();
    }
  }
}

module.exports = PresenceSensorRadarDevice;







