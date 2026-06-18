'use strict';
// v9.0.40: Rejoin Detector - Burst-based power-restore detection
// Inspired by gpmachado/com.gpm.homesuite rejoin detection
// Detects power-restore rejoin by monitoring 3+ DP bursts within 600ms
// (all gangs dump state simultaneously after power restore)

/**
 * RejoinDetector - Detects device rejoin via DP burst analysis
 */
class RejoinDetector {
  constructor(device, options = {}) {
    this.device = device;
    this._burstWindow = [];
    this._burstThreshold = options.burstThreshold || 3;     // DPs to trigger
    this._burstWindowMs = options.burstWindowMs || 600;     // Window duration
    this._cooldownMs = options.cooldownMs || 30000;          // Dedup cooldown
    this._lastRejoinAt = 0;
    this._commandGuardMs = options.commandGuardMs || 2000;   // Suppress after commands
    this._lastCommandAt = 0;
  }

  /**
   * Call this when a DP update is received
   * Returns true if rejoin detected
   */
  trackDP() {
    const now = Date.now();

    // Suppress command echo: a flow toggling N gangs produces N responses in <600ms
    if (now - this._lastCommandAt < this._commandGuardMs) return false;

    // Cooldown dedup
    if (now - this._lastRejoinAt < this._cooldownMs) return false;

    // Track burst
    this._burstWindow = this._burstWindow.filter(t => now - t < this._burstWindowMs);
    this._burstWindow.push(now);

    // Detect burst
    if (this._burstWindow.length >= this._burstThreshold) {
      this._lastRejoinAt = now;
      this._burstWindow = [];
      return true;
    }

    return false;
  }

  /**
   * Call this when a command is sent (to suppress echo detection)
   */
  markCommand() {
    this._lastCommandAt = Date.now();
  }

  /**
   * Reset the detector
   */
  reset() {
    this._burstWindow = [];
    this._lastRejoinAt = 0;
  }
}

module.exports = RejoinDetector;
