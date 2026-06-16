'use strict';

/**
 * VirtualPresenceDetector - Core engine for inferring room presence
 *
 * v1.0.0: Orchestrates PresenceConfidenceScorer + RoomSignalAggregator to provide
 * real-time room occupancy estimation without a dedicated presence sensor.
 *
 * Integrates with:
 *   - HealthMonitor: Uses device health status to weight signal reliability
 *   - DynamicCapabilityManager: Auto-discovers new signal sources
 *   - FlowCardManager: Triggers presence/clear flow cards
 *
 * Architecture:
 *   VirtualPresenceDetector is instantiated once per presence_detector device.
 *   It owns a PresenceConfidenceScorer and a RoomSignalAggregator.
 *   The driver (device.js) creates it in onInit and feeds it with settings.
 */

const EventEmitter = require('events');
const PresenceConfidenceScorer = require('./PresenceConfidenceScorer');
const RoomSignalAggregator = require('./RoomSignalAggregator');

/** Presence state machine */
const PRESENCE_STATE = Object.freeze({
  CLEAR: 'clear',           // No presence detected
  UNCERTAIN: 'uncertain',   // Low confidence, not yet confirmed
  PRESENT: 'present',       // High confidence, room occupied
});

class VirtualPresenceDetector extends EventEmitter {
  /**
   * @param {Object} homey - Homey App instance
   * @param {Object} options
   * @param {string} options.deviceId - The presence_detector device ID
   * @param {string[]} options.monitoredDeviceIds - Device IDs to watch
   * @param {number} [options.presenceThreshold=40] - Confidence >= this => PRESENT
   * @param {number} [options.absenceThreshold=10] - Confidence <= this => CLEAR
   * @param {number} [options.timeoutMs=600000] - How long after last signal to auto-clear (10 min)
   * @param {number} [options.decayHalfLifeMs=300000] - Signal half-life (5 min)
   * @param {Object} [options.timeOfDay] - Time-of-day modulation config
   * @param {Function} [options.logger] - Injectable logger
   */
  constructor(homey, options = {}) {
    super();

    this._homey = homey;
    this._deviceId = options.deviceId;
    this._monitoredDeviceIds = options.monitoredDeviceIds || [];
    this._presenceThreshold = options.presenceThreshold || 40;
    this._absenceThreshold = options.absenceThreshold || 10;
    this._timeoutMs = options.timeoutMs || 600000; // 10 min default
    this._logger = options.logger || (() => {});

    /** @type {string} Current presence state */
    this._state = PRESENCE_STATE.CLEAR;

    /** @type {number} Current confidence (0-100) */
    this._confidence = 0;

    /** @type {number} Timestamp of last signal of any kind */
    this._lastSignalTime = 0;

    /** @type {number} Timestamp when presence was first detected */
    this._presenceDetectedAt = null;

    /** @type {NodeJS.Timeout|null} Auto-clear timer */
    this._autoClearTimer = null;

    /** @type {NodeJS.Timeout|null} Evaluation timer */
    this._evaluationTimer = null;

    /** @type {boolean} */
    this._destroyed = false;

    // Create scorer
    this._scorer = new PresenceConfidenceScorer({
      decayHalfLifeMs: options.decayHalfLifeMs,
      timeOfDay: options.timeOfDay,
      logger: this._logger,
    });

    // Create aggregator
    this._aggregator = new RoomSignalAggregator(homey, this._scorer, {
      logger: this._logger,
      onConfidenceChange: (result) => this._onConfidenceChanged(result),
    });
  }

  /**
   * Start the presence detection engine.
   * Call from device.js onInit() after settings are available.
   */
  async start() {
    if (this._destroyed) return;

    this._logger(`[PRESENCE] Starting VirtualPresenceDetector for ${this._monitoredDeviceIds.length} devices`);

    // Initialize the aggregator with our device list
    await this._aggregator.initialize(this._monitoredDeviceIds);

    // Start periodic evaluation (every 30s)
    this._evaluationTimer = setInterval(() => {
      this._periodicEvaluation();
    }, 30000);

    this._logger('[PRESENCE] Engine started');
  }

  /**
   * Stop the detection engine and clean up.
   */
  async stop() {
    if (this._destroyed) return;
    this._destroyed = true;

    if (this._evaluationTimer) {
      clearInterval(this._evaluationTimer);
      this._evaluationTimer = null;
    }

    if (this._autoClearTimer) {
      clearTimeout(this._autoClearTimer);
      this._autoClearTimer = null;
    }

    this._aggregator.destroy();
    this.removeAllListeners();

    this._logger('[PRESENCE] Engine stopped');
  }

  /**
   * Update settings (called when user changes device settings).
   * @param {Object} settings
   */
  updateSettings(settings) {
    if (settings.presence_threshold !== undefined) {
      this._presenceThreshold = settings.presence_threshold;
    }
    if (settings.absence_threshold !== undefined) {
      this._absenceThreshold = settings.absence_threshold;
    }
    if (settings.timeout_minutes !== undefined) {
      this._timeoutMs = settings.timeout_minutes * 60000;
    }
    if (settings.decay_half_life_seconds !== undefined) {
      this._scorer.setDecayHalfLife(settings.decay_half_life_seconds * 1000);
    }
    if (settings.time_of_day_enabled !== undefined) {
      this._scorer.setTimeOfDayConfig({
        enabled: settings.time_of_day_enabled,
        nightStartHour: settings.night_start_hour,
        nightEndHour: settings.night_end_hour,
        nightMultiplier: settings.night_multiplier,
      });
    }
  }

  /**
   * Add a device to monitoring (e.g., from DynamicCapabilityManager).
   */
  addDevice(deviceId) {
    this._monitoredDeviceIds.push(deviceId);
    this._aggregator.addDevice(deviceId);
  }

  /**
   * Remove a device from monitoring.
   */
  removeDevice(deviceId) {
    this._monitoredDeviceIds = this._monitoredDeviceIds.filter(id => id !== deviceId);
    this._aggregator.removeDevice(deviceId);
  }

  /**
   * Manually force presence (for flow card action).
   */
  forcePresent() {
    this._scorer.recordSignal('manual_override', Date.now(), 50);
    const result = this._scorer.calculate();
    this._onConfidenceChanged(result, true);
  }

  /**
   * Manually force absence (for flow card action).
   */
  forceClear() {
    this._scorer.clearAll();
    this._setState(PRESENCE_STATE.CLEAR);
    this._confidence = 0;
    this._presenceDetectedAt = null;
    this._clearAutoClearTimer();
    this._emitState();
  }

  // ─── Getters ────────────────────────────────────────────────────────────────

  get state() { return this._state; }
  get confidence() { return this._confidence; }
  get isPresent() { return this._state === PRESENCE_STATE.PRESENT; }
  get presenceDetectedAt() { return this._presenceDetectedAt; }

  /**
   * Get presence duration in minutes since first detected.
   * @returns {number} Minutes, 0 if not present
   */
  get presenceDurationMinutes() {
    if (!this._presenceDetectedAt) return 0;
    return Math.round((Date.now() - this._presenceDetectedAt) / 60000);
  }

  /**
   * Get detailed status for diagnostics.
   */
  getStatus() {
    return {
      state: this._state,
      confidence: this._confidence,
      isPresent: this.isPresent,
      presenceDurationMinutes: this.presenceDurationMinutes,
      lastSignalTime: this._lastSignalTime,
      monitoredDevices: this._monitoredDeviceIds.length,
      activeSignals: this._scorer.getActiveSignals(),
    };
  }

  // ─── Internal ───────────────────────────────────────────────────────────────

  /**
   * @private - Called by aggregator when confidence changes
   */
  _onConfidenceChanged(result, force = false) {
    if (this._destroyed) return;

    this._confidence = result.confidence;
    this._lastSignalTime = Date.now();

    const prevState = this._state;

    // State machine transitions
    if (result.confidence >= this._presenceThreshold) {
      if (this._state !== PRESENCE_STATE.PRESENT) {
        this._setState(PRESENCE_STATE.PRESENT);
      }
      this._resetAutoClearTimer();
    } else if (result.confidence <= this._absenceThreshold) {
      if (this._state !== PRESENCE_STATE.CLEAR) {
        this._setState(PRESENCE_STATE.CLEAR);
      }
      this._clearAutoClearTimer();
    } else {
      // In the uncertain zone
      if (this._state === PRESENCE_STATE.CLEAR && result.confidence > this._absenceThreshold) {
        this._setState(PRESENCE_STATE.UNCERTAIN);
      }
    }

    // Emit confidence update regardless of state change
    this.emit('confidence', {
      confidence: result.confidence,
      state: this._state,
      signals: result.signals,
      isNight: result.isNight,
      changed: prevState !== this._state,
    });
  }

  /**
   * @private - Transition to a new state
   */
  _setState(newState) {
    const prevState = this._state;
    this._state = newState;

    if (newState === PRESENCE_STATE.PRESENT && prevState !== PRESENCE_STATE.PRESENT) {
      this._presenceDetectedAt = Date.now();
      this._logger(`[PRESENCE] PRESENCE DETECTED (confidence: ${this._confidence}%)`);
      this.emit('presence_detected', {
        confidence: this._confidence,
        timestamp: this._presenceDetectedAt,
      });
    } else if (newState === PRESENCE_STATE.CLEAR && prevState !== PRESENCE_STATE.CLEAR) {
      this._logger(`[PRESENCE] PRESENCE CLEARED (was present for ${this.presenceDurationMinutes} min)`);
      this.emit('presence_cleared', {
        durationMinutes: this.presenceDurationMinutes,
        timestamp: Date.now(),
      });
      this._presenceDetectedAt = null;
    }
  }

  /**
   * @private - Emit current state for UI capabilities
   */
  _emitState() {
    this.emit('confidence', {
      confidence: this._confidence,
      state: this._state,
      signals: [],
      isNight: false,
      changed: true,
    });
  }

  /**
   * @private - Auto-clear timer to force CLEAR after timeout
   */
  _resetAutoClearTimer() {
    this._clearAutoClearTimer();
    this._autoClearTimer = setTimeout(() => {
      if (this._state === PRESENCE_STATE.PRESENT) {
        this._logger(`[PRESENCE] Auto-clear triggered after ${this._timeoutMs / 1000}s timeout`);
        this._setState(PRESENCE_STATE.CLEAR);
        this._confidence = 0;
        this._emitState();
      }
    }, this._timeoutMs);
  }

  /**
   * @private - Clear the auto-clear timer
   */
  _clearAutoClearTimer() {
    if (this._autoClearTimer) {
      clearTimeout(this._autoClearTimer);
      this._autoClearTimer = null;
    }
  }

  /**
   * @private - Periodic evaluation for decay-only updates (no new signals)
   */
  _periodicEvaluation() {
    if (this._destroyed) return;

    const result = this._scorer.calculate();

    // Only update if no recent signal event (the callback handles signal-driven updates)
    if (result.confidence !== this._confidence) {
      this._confidence = result.confidence;

      // Apply decay-based state transitions
      if (this._confidence <= this._absenceThreshold && this._state !== PRESENCE_STATE.CLEAR) {
        this._logger(`[PRESENCE] Decay to CLEAR (confidence: ${this._confidence}%)`);
        this._setState(PRESENCE_STATE.CLEAR);
        this._clearAutoClearTimer();
        this._emitState();
      } else if (this._confidence > this._absenceThreshold && this._confidence < this._presenceThreshold && this._state === PRESENCE_STATE.PRESENT) {
        // Still above absence threshold but below presence threshold while previously present
        // Don't immediately clear - rely on auto-clear timer
      }
    }
  }
}

module.exports = VirtualPresenceDetector;
module.exports.PRESENCE_STATE = PRESENCE_STATE;
