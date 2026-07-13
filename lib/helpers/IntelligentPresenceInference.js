const { safeDivide, safeMultiply, safeParse } = require('../utils/tuyaUtils.js');

/**
 * IntelligentPresenceInference - v5.5.316
 * Calculates presence from multiple data sources when DP1 returns null
 */
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
      stuckMode: false,         // v5.5.902: Device is stuck sending same value
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
      const timeDelta = safeDivide(now - state.luxTimestamp, 1000); // seconds
      if (timeDelta > 0) {
        state.luxChangeRate = Math.abs(safeDivide(lux - state.lastLux, timeDelta));
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
      this.device?.log?.(`[INFERENCE]  DP1 presence=${presence} (confidence: 95%)`);
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
      this.params.minConfidenceForPresence = 35; // Lower threshold
    } else if (appVersion >= 74) {
      this.state.firmwareType = 'v74';
      this.params.minConfidenceForPresence = 45;
    }
    this.device?.log?.(`[INFERENCE]  Firmware: appVersion=${appVersion} type=${this.state.firmwareType}`);
  }

  /**
   * v5.5.902: Set stuck mode to ignore repetitive DP1 values
   * Often caused by firmware bugs (e.g. _TZE284_iadro9bf)
   */
  setStuckMode(stuck) {
    if (this.state.stuckMode !== stuck) {
      this.state.stuckMode = stuck;
      this.device?.log?.(`[INFERENCE]  STUCK MODE: ${stuck ? 'ACTIVATED' : 'CLEARED'} (ignoring repetitive DP1)`);
      // Recalculate immediately
      this._recalculatePresence('stuck_mode_change', {});
    }
  }

  // Get current inferred presence state
  getPresence() {
    const now = Date.now();
    if (now - this.state.lastActivityTime > this.params.activityTimeoutMs) {
      if (this.state.inferredPresence) {
        this.device?.log?.('[INFERENCE]  Activity timeout - clearing presence');
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
      presenceIndicators += 10;
      confidence += 10;
    }

    // Indicator 5: DP1 value
    // v5.5.902: Ignore if device is in stuck mode (repetitive values)
    if (!state.stuckMode && state.lastPresenceDP !== null && state.lastPresenceDP !== undefined) {
      totalIndicators += 20;
      if (state.lastPresenceDP === 1 || state.lastPresenceDP === 2 || state.lastPresenceDP === true) {
        presenceIndicators += 20;
        confidence += 20;
      }
    }

    state.presenceConfidence = totalIndicators > 0
      ? Math.round((safeDivide(presenceIndicators, totalIndicators) * 100))
      : 0;

    const previousPresence = state.inferredPresence;
    state.inferredPresence = state.presenceConfidence >= this.params.minConfidenceForPresence;
    state.lastInferenceTime = now;

    if (previousPresence !== state.inferredPresence) {
      this.device?.log?.(`[INFERENCE]  ${source}: presence=${state.inferredPresence} ` +
        `(confidence: ${state.presenceConfidence}%, indicators: ${presenceIndicators}/${totalIndicators})`);
    }

    return state.inferredPresence;
  }

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

module.exports = IntelligentPresenceInference;
