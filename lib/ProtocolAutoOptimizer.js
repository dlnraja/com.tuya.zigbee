'use strict';

const { EventEmitter } = require('events');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║          PROTOCOL AUTO-OPTIMIZER - v5.5.63                                   ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  Centralized hybrid protocol management for ALL drivers                      ║
 * ║                                                                              ║
 * ║  FEATURES:                                                                   ║
 * ║  1. Listens to BOTH Tuya DP AND Zigbee ZCL protocols                         ║
 * ║  2. After 15 minutes, identifies which protocol actually works               ║
 * ║  3. Pauses unused methods to avoid errors/timeouts                           ║
 * ║  4. Handles exotic Chinese implementations gracefully                        ║
 * ║                                                                              ║
 * ║  USAGE:                                                                      ║
 * ║  const optimizer = new ProtocolAutoOptimizer(device);                        ║
 * ║  await optimizer.initialize(zclNode);                                        ║
 * ║                                                                              ║
 * ║  // Register data hits from your listeners:                                  ║
 * ║  optimizer.registerHit('tuya', dpId, value);                                 ║
 * ║  optimizer.registerHit('zcl', clusterName, value);                           ║
 * ║                                                                              ║
 * ║  // Check if protocol is active before calling methods:                      ║
 * ║  if (optimizer.isActive('tuya')) { ... }                                     ║
 * ║  if (optimizer.isActive('zcl')) { ... }                                      ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// Optimization decision time (15 minutes)
const DECISION_DELAY_MS = 15 * 60 * 1000;

// Protocol types
const PROTOCOL = {
  TUYA: 'tuya',
  ZCL: 'zcl',
  IAS: 'ias',
  RAW: 'raw',
};

class ProtocolAutoOptimizer extends EventEmitter {

  constructor(device, options = {}) {
    super();
    this.device = device;
    this.options = {
      decisionDelay: options.decisionDelay || DECISION_DELAY_MS,
      verbose: options.verbose !== false,
      persistDecision: options.persistDecision !== false,
      ...options
    };

    // Protocol statistics
    this.stats = {
      tuya: { hits: 0, lastHit: null, dps: new Set() },
      zcl: { hits: 0, lastHit: null, clusters: new Set() },
      ias: { hits: 0, lastHit: null },
      raw: { hits: 0, lastHit: null },
    };

    // Protocol active states
    this.active = {
      tuya: true,
      zcl: true,
      ias: true,
      raw: true,
    };

    // Decision state
    this.decided = false;
    this.decidedMode = null;
    this.decisionTimeout = null;
    this.startTime = Date.now();

    this._log('Created');
  }

  _log(...args) {
    if (this.options.verbose && this.device?.log) {
      this.device.log('[AUTO-OPT]', ...args);
    }
  }

  /**
   * Initialize the optimizer
   */
  async initialize(zclNode) {
    this._log('════════════════════════════════════════════════════════');
    this._log('Initializing Protocol Auto-Optimizer');
    this._log('════════════════════════════════════════════════════════');

    // Check for saved decision
    if (this.options.persistDecision) {
      const saved = await this._loadSavedDecision();
      if (saved) {
        this._log(`📋 Loaded saved decision: ${saved}`);
        this._applyDecision(saved, false);
        return;
      }
    }

    // Schedule decision
    this._scheduleDecision();

    this._log(`⏰ Decision scheduled in ${this.options.decisionDelay / 60000} minutes`);
    this._log('👀 Watching ALL protocols: Tuya DP, ZCL, IAS Zone, Raw frames');
  }

  /**
   * Register a hit for a protocol
   * Call this whenever you receive data from any protocol
   */
  registerHit(protocol, identifier, value) {
    if (!this.stats[protocol]) {
      this._log(`⚠️ Unknown protocol: ${protocol}`);
      return;
    }

    const stat = this.stats[protocol];
    stat.hits++;
    stat.lastHit = Date.now();

    // Track specific identifiers
    if (protocol === 'tuya' && identifier) {
      stat.dps.add(identifier);
    } else if (protocol === 'zcl' && identifier) {
      stat.clusters.add(identifier);
    }

    // Emit event
    this.emit('hit', protocol, identifier, value);

    // Log first few hits
    if (stat.hits <= 3) {
      this._log(`📥 ${protocol.toUpperCase()} hit #${stat.hits}: ${identifier} = ${JSON.stringify(value)}`);
    }
  }

  /**
   * Check if a protocol is still active (not paused)
   */
  isActive(protocol) {
    return this.active[protocol] !== false;
  }

  /**
   * Get current protocol mode
   */
  getMode() {
    if (!this.decided) return 'hybrid';
    return this.decidedMode;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      decided: this.decided,
      mode: this.decidedMode,
      elapsed: Date.now() - this.startTime,
      protocols: { ...this.stats },
      active: { ...this.active },
    };
  }

  /**
   * Schedule the decision after delay
   */
  _scheduleDecision() {
    if (this.decisionTimeout) {
      clearTimeout(this.decisionTimeout);
    }

    this.decisionTimeout = this.device?.homey?.setTimeout?.(() => {
      this._makeDecision();
    }, this.options.decisionDelay) || setTimeout(() => {
      this._makeDecision();
    }, this.options.decisionDelay);
  }

  /**
   * Make the optimization decision
   */
  _makeDecision() {
    this._log('════════════════════════════════════════════════════════');
    this._log('⚡ PROTOCOL OPTIMIZATION DECISION');
    this._log('════════════════════════════════════════════════════════');
    this._log(`Tuya hits: ${this.stats.tuya.hits} (DPs: ${[...this.stats.tuya.dps].join(',')})`);
    this._log(`ZCL hits: ${this.stats.zcl.hits} (clusters: ${[...this.stats.zcl.clusters].join(',')})`);
    this._log(`IAS hits: ${this.stats.ias.hits}`);
    this._log(`Raw hits: ${this.stats.raw.hits}`);

    // Determine the best mode
    const tuyaActive = this.stats.tuya.hits > 0;
    const zclActive = this.stats.zcl.hits > 0;
    const iasActive = this.stats.ias.hits > 0;

    let mode;
    if (tuyaActive && !zclActive && !iasActive) {
      mode = 'tuya_only';
    } else if (!tuyaActive && (zclActive || iasActive)) {
      mode = 'zcl_only';
    } else if (tuyaActive && (zclActive || iasActive)) {
      mode = 'hybrid';
    } else {
      mode = 'unknown';
    }

    this._applyDecision(mode, true);

    // Emit decision event
    this.emit('decision', mode, this.getStats());
  }

  /**
   * Apply a decision
   */
  _applyDecision(mode, save = true) {
    this.decided = true;
    this.decidedMode = mode;

    switch (mode) {
      case 'tuya_only':
        this.active.tuya = true;
        this.active.zcl = false;
        this.active.ias = false;
        this._log('✅ Decision: TUYA DP ONLY');
        this._log('⏸️ Pausing ZCL methods (unused)');
        break;

      case 'zcl_only':
        this.active.tuya = false;
        this.active.zcl = true;
        this.active.ias = true;
        this._log('✅ Decision: ZCL/IAS ONLY');
        this._log('⏸️ Pausing Tuya DP methods (unused)');
        break;

      case 'hybrid':
        this.active.tuya = true;
        this.active.zcl = true;
        this.active.ias = true;
        this._log('✅ Decision: HYBRID MODE (both active)');
        break;

      default:
        this._log('⚠️ No data received - keeping all active');
        break;
    }

    // Save decision
    if (save && this.options.persistDecision) {
      this._saveDecision(mode);
    }

    this._log('════════════════════════════════════════════════════════');
  }

  /**
   * Force a specific mode (manual override)
   */
  forceMode(mode) {
    this._log(`🔧 Force mode: ${mode}`);
    this._applyDecision(mode, true);
  }

  /**
   * Reset to hybrid mode
   */
  reset() {
    this._log('🔄 Resetting to hybrid mode');
    this.decided = false;
    this.decidedMode = null;
    this.active = { tuya: true, zcl: true, ias: true, raw: true };
    this.stats = {
      tuya: { hits: 0, lastHit: null, dps: new Set() },
      zcl: { hits: 0, lastHit: null, clusters: new Set() },
      ias: { hits: 0, lastHit: null },
      raw: { hits: 0, lastHit: null },
    };
    this.startTime = Date.now();
    this._scheduleDecision();
  }

  /**
   * Save decision to device store
   */
  async _saveDecision(mode) {
    try {
      await this.device?.setStoreValue?.('protocol_mode', mode);
      await this.device?.setStoreValue?.('protocol_decision_time', Date.now());
      this._log(`💾 Saved decision: ${mode}`);
    } catch (e) {
      this._log('⚠️ Could not save decision:', e.message);
    }
  }

  /**
   * Load saved decision from device store
   */
  async _loadSavedDecision() {
    try {
      const mode = await this.device?.getStoreValue?.('protocol_mode');
      const time = await this.device?.getStoreValue?.('protocol_decision_time');

      // Expire after 7 days
      if (mode && time && (Date.now() - time) < 7 * 24 * 60 * 60 * 1000) {
        return mode;
      }
    } catch (e) {
      // Ignore
    }
    return null;
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.decisionTimeout) {
      clearTimeout(this.decisionTimeout);
      this.decisionTimeout = null;
    }
    this.removeAllListeners();
  }
}

// Export
module.exports = ProtocolAutoOptimizer;
module.exports.PROTOCOL = PROTOCOL;
module.exports.DECISION_DELAY_MS = DECISION_DELAY_MS;
