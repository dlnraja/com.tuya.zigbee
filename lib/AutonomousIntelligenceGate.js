'use strict';

/**
 * 🤖 AUTONOMOUS INTELLIGENCE GATE (v1.0.0)
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

    // Keep history lean (last 10 samples)
    if (this.history[dp].length > 10) this.history[dp].shift();

    const analysis = this._analyzePattern(dp, value);
    this._updateConfidence(dp, analysis);
    
    // If confidence is significantly high for a different mapping, flag it
    if (analysis.score > 0.85 && analysis.capability !== this._getCurrentMapping(dp)) {
      this.device.log(`[INTEL-GATE] 🧠 High confidence heuristic detected for DP ${dp}: ${analysis.capability} (Score: ${analysis.score})`);
      this._applySelfHealing(dp, analysis.capability);
    }
  }

  _analyzePattern(dp, value) {
    // Heuristic: Temperature pattern (decimal number, 5-45 range common)
    if (typeof value === 'number' && value > 50 && value < 450) {
      return { capability: 'measure_temperature', score: 0.9, divisor: 10 };
    }

    // Heuristic: Binary pattern (0/1 or bool)
    if (value === 0 || value === 1 || typeof value === 'boolean') {
      const driver = this.device.driver.id;
      if (driver.includes('sensor_motion')) return { capability: 'alarm_motion', score: 0.9 };
      if (driver.includes('switch')) return { capability: 'onoff', score: 0.8 };
    }

    // Heuristic: Battery pattern (0-100, rarely changes, usually integer)
    if (dp === 15 || dp === 101 || dp === 4) {
      if (typeof value === 'number' && value >= 0 && value <= 100) {
        return { capability: 'measure_battery', score: 0.95 };
      }
    }

    return { capability: 'unknown', score: 0 };
  }

  _updateConfidence(dp, analysis) {
    if (!this.confidenceMap[dp]) this.confidenceMap[dp] = {};
    const current = this.confidenceMap[dp][analysis.capability] || 0;
    this.confidenceMap[dp][analysis.capability] = (current + analysis.score) / 2;
  }

  _getCurrentMapping(dp) {
    return this.device.dpMappings?.[dp]?.capability;
  }

  _applySelfHealing(dp, capability) {
    // Only self-heal if the device supports the capability
    if (this.device.hasCapability(capability)) {
      this.device.log(`[SELF-HEAL] 🧊 Automatically re-mapping DP ${dp} to ${capability} based on live heuristics.`);
      // Dynamic injection of mapping
      if (!this.device.dpMappings) this.device.dpMappings = {};
      this.device.dpMappings[dp] = { capability: capability };
    }
  }
}

module.exports = AutonomousIntelligenceGate;
