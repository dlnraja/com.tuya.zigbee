'use strict';
const { safeParse, safeMultiply, safeAdd } = require('./utils/tuyaUtils.js');

/**
 *  AUTONOMOUS INTELLIGENCE GATE (v1.1.2)
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
    this._stuckMode = false;
  }

  /**
   * Analyze an incoming data point and update confidence scores.
   * v1.1.2: Added support for capability names and skip logic.
   * @param {number|string} dp - The Data Point ID or Capability Name
   * @param {any} value - The raw value received
   * @returns {Object} { skip: boolean, reason: string }
   */
  process(dp, value) {
    // If dp is a string (capability), try to find its primary DP
    let dpId = dp;
    if (typeof dp === 'string') {
      // Find DP that maps to this capability
      const mappings = this.device.dpMappings || {};
      const found = Object.entries(mappings).find(([id, map]) => map.capability === dp);
      if (found) {
        dpId = parseInt(found[0], 10);
      }
    }

    if (typeof dpId !== 'number' || isNaN(dpId)) {
      // If we still don't have a numeric DP, we can't track history effectively
      // but we can still perform basic heuristic checks
      return { skip: false };
    }

    if (!this.history[dpId]) this.history[dpId] = [];
    this.history[dpId].push({ val: value, ts: Date.now() });

    // Keep history lean (last 20 samples for better trend analysis)
    if (this.history[dpId].length > 20) this.history[dpId].shift();

    const analysis = this._analyzePattern(dpId, value);
    if (!analysis || analysis.capability === 'unknown') return { skip: false };

    this._updateConfidence(dpId, analysis);
    
    // v1.1.0: Detect "Stuck" patterns in real-time
    const isStuck = this._detectStuckPattern(dpId);
    if (isStuck && dpId === 1) {
      this.device.log(`[INTEL-GATE]  DP1 STUCK PATTERN DETECTED - Increasing heuristic weight for distance DPs`);
      this._stuckMode = true;
    }

    // v1.1.2: SKIP LOGIC - Re-challenging the radar noise filter
    // If confidence is low and it's a "move" state (value 2), we might want to skip it
    // if other sensors (distance) don't corroborate.
    const currentConfidence = this.confidenceMap[dpId]?.[analysis.capability] || 0.5;
    
    // Example skip logic: If DP1=2 (move) but confidence is < 0.3 (maybe noise?)
    if (dpId === 1 && value === 2 && currentConfidence < 0.3) {
       return { skip: true, reason: 'Low confidence move state (potential noise)' };
    }

    // If confidence is significantly high for a different mapping, flag it
    if (currentConfidence > 0.85 && analysis.capability !== this._getCurrentMapping(dpId)) {
      this.device.log(`[INTEL-GATE]  High confidence heuristic detected for DP ${dpId}: ${analysis.capability} (Confidence: ${currentConfidence.toFixed(2)})`);
      this._applySelfHealing(dpId, analysis.capability);
    }

    return { skip: false };
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
      if (value === 2) {
        // v1.1.2: Value 2 is "moving" presence. We treat it as presence but with lower initial score
        // until corroborated by distance changes.
        return { capability: 'alarm_motion', score: 0.6 };
      }
    }

    // Heuristic: Target Distance (Radar) - v1.1.0
    if (dp === 104 || dp === 12 || dp === 9) {
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
      // Check timing: if they came in rapidly
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
    
    // Exponential moving average for score
    const nextConfidence = safeAdd(safeMultiply(current, 0.7), safeMultiply(score, 0.3));
    this.confidenceMap[dp][analysis.capability] = Number.isFinite(nextConfidence) ? nextConfidence : 0.5;
  }

  _getCurrentMapping(dp) {
    return this.device.dpMappings?.[dp]?.capability;
  }

  _applySelfHealing(dp, capability) {
    if (this.device.hasCapability(capability)) {
      this.device.log(`[SELF-HEAL]  Automatically re-mapping DP ${dp} to ${capability} based on live heuristics.`);
      if (!this.device.dpMappings) this.device.dpMappings = {};
      this.device.dpMappings[dp] = { capability: capability };
    }
  }

  setStuckMode(stuck) {
    this._stuckMode = stuck;
    if (stuck) {
      this.device.log('[INTEL-GATE]  Manual Stuck Mode enabled - Inference reliability prioritized');
    }
  }

  isStuckMode() {
    return !!this._stuckMode;
  }
}

module.exports = AutonomousIntelligenceGate;
