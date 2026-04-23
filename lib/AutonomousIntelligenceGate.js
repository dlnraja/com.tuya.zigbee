'use strict';
const { safeParse, safeMultiply } = require('./utils/tuyaUtils.js');

/**
 *  AUTONOMOUS INTELLIGENCE GATE (v1.0.0)
 * 
 * Implements high-level heuristic analysis and confidence-based 
 * device profiling. Enables the Universal Engine to self-correct 
 * its own DP mappings based on real-world data patterns.
 * 
 * Logic Level: Opus 4.6 Superior Heuristics
 */
class AutonomousIntelligenceGate {

  constructor(device) {
    this.device = device;
    this.history = {};
    this.confidenceMap = {}; // dpId -> { capability: score }
  }

  /**
   * Analyze an incoming data point and update confidence scores.
   * @param {number} dp - The Data Point ID
   * @param {any} value - The raw value received
   */
  process(dp, value) {
    if (!this.history[dp]) this.history[dp] = [];
    this.history[dp].push({ val: value, ts: Date.now() });

    // Keep history lean (last 20 samples for better trend analysis)
    if (this.history[dp].length > 20) this.history[dp].shift();

    // A8: NaN Safety - use safeDivide/safeMultiply
  this._analyzePattern(dp, value);
    if (!analysis || analysis.capability === 'unknown') return;

    this._updateConfidence(dp, analysis);
    
    // v1.1.0: Detect "Stuck" patterns in real-time
    const isStuck = this._detectStuckPattern(dp);
    if (isStuck && dp === 1) {
      this.device.log(`[INTEL-GATE]  DP1 STUCK PATTERN DETECTED - Increasing heuristic weight for distance DPs`);
      this._stuckMode = true;
    }

    // If confidence is significantly high for a different mapping, flag it
    const currentConfidence = this.confidenceMap[dp]?.[analysis.capability] || 0;if (currentConfidence > 0.85 && analysis.capability !== this._getCurrentMapping(dp)) {
      this.device.log(`[INTEL-GATE]  High confidence heuristic detected for DP ${dp}: ${analysis.capability} (Confidence: ${currentConfidence.toFixed(2)})`);
      this._applySelfHealing(dp, analysis.capability);
    }
  }

  _analyzePattern(dp, value) {
    // Heuristic: Temperature pattern (decimal number, 5-45 range common)
    if (typeof value === 'number' && value > 50 && value < 450) {
      return { capability: 'measure_temperature', score: 0.9, divisor: 10 };
    }

    // Heuristic: Presence/Motion Detection
    if (dp === 1) {
      if (typeof value === 'boolean' || value === 0 || value === 1) {
        return { capability: 'alarm_motion', score: 0.9 };
      }
    }

    // Heuristic: Target Distance (Radar) - v1.1.0
    // If DP reports values that fluctuate slightly in cm/m range
    if (dp === 104 || dp === 12) {
      if (typeof value === 'number' && value > 0 && value < 1000) {
        return { capability: 'target_distance', score: 0.95 };
      }
    }

    // Heuristic: Battery pattern (0-100, rarely changes, usually integer)
    if (dp === 15 || dp === 101 || dp === 4) {
      if (typeof value === 'number' && value >= 0 && value <= 100) {
        return { capability: 'measure_battery', score: 0.95 };
      }
    }

    // Heuristic: Illuminance (Lux)
    if (dp === 103 || dp === 101 || dp === 7) {
      if (typeof value === 'number' && value >= 0 && value <= 10000) {
        // High lux values usually indicates measure_luminance
        if (value > 100) return { capability: 'measure_luminance', score: 0.85 };
      }
    }

    return { capability: 'unknown', score: 0 };
  }

  _detectStuckPattern(dp) {
    const history = this.history[dp];
    if (!history || history.length < 10) return false;

    // Check if the last 10 values are identical
    const last10 = history.slice(-10);
    const firstVal = last10[0].val;
    const allSame = last10.every(h => h.val === firstVal);

    if (allSame) {
      // Check timing: if they came in rapidly (e.g. every 20s as reported for IADRO9BF)
      const duration = last10[last10.length - 1].ts - last10[0].ts;
      const avgInterval = duration / 10;
      if (avgInterval < 30000) return true; // Less than 30s interval
    }

    return false;
  }

  _updateConfidence(dp, analysis) {
    if (!this.confidenceMap[dp]) this.confidenceMap[dp] = {};
    
    let current = this.confidenceMap[dp][analysis.capability];
    if (typeof current !== 'number' || !Number.isFinite(current)) {
      current = 0.5;
    }

    const score = (typeof analysis.score === 'number' && Number.isFinite(analysis.score)) ? analysis.score : 0;
    
    // Exponential moving average for score - v1.1.1: Guaranteed NaN safety
    const nextConfidence = (safeMultiply(current, 0.7)) + (safeMultiply(score, 0.3));
    this.confidenceMap[dp][analysis.capability] = Number.isFinite(nextConfidence) ? nextConfidence : 0.5;
  }

  _getCurrentMapping(dp) {
    return this.device.dpMappings?.[dp]?.capability;
  }

  _applySelfHealing(dp, capability) {
    // Only self-heal if the device supports the capability
    if (this.device.hasCapability(capability)) {
      this.device.log(`[SELF-HEAL]  Automatically re-mapping DP ${dp} to ${capability} based on live heuristics.`);
      // Dynamic injection of mapping
      if (!this.device.dpMappings) this.device.dpMappings = {};
      this.device.dpMappings[dp] = { capability: capability };
    }
  }

  /**
   * v1.1.0: External hook for stuck mode (manually triggered by device.js)
   */
  setStuckMode(stuck) {
    this._stuckMode = stuck;
    if (stuck) {
      this.device.log('[INTEL-GATE]  Manual Stuck Mode enabled - Inference reliability prioritized');
    }
  }

  /**
   * v1.1.0: Check if device is in stuck mode
   * @returns {boolean}
   */
  isStuckMode() {
    return !!this._stuckMode;
  }
}

module.exports = AutonomousIntelligenceGate;


