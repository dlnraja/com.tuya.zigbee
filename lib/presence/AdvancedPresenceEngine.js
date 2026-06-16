'use strict';

/**
 * AdvancedPresenceEngine - Multi-technology fusion and occupancy prediction
 *
 * Combines:
 *   - RoomSignalAggregator capability events
 *   - MotionAwarePresenceDetector / ZigbeeHealthMixin RSSI/LQI inputs
 *   - SignalCartography coverage map
 *   - SignalTriangulation zone estimation
 *   - NetworkPresenceCorrelation WiFi/BT proxy signals
 *   - Time-of-day pattern learning
 *   - Simple occupancy prediction using exponential smoothing
 *
 * This engine intentionally avoids hard RF triangulation math because Homey does
 * not expose raw antenna arrays or PHY-level data. Instead it uses signal-space
 * fusion, which is the same high-level pattern used by Philips Hue and SmartThings.
 */

const EventEmitter = require('events');
const PresenceConfidenceScorer = require('./PresenceConfidenceScorer');
const SignalCartography = require('./SignalCartography');
const SignalTriangulation = require('./SignalTriangulation');
const NetworkPresenceCorrelation = require('./NetworkPresenceCorrelation');

function clampNumber(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function lerp(a, b, t) {
  return a + (b - a) * clampNumber(t, 0, 1);
}

function hourOfDay(timestamp) {
  return new Date(timestamp).getHours();
}

function indexOfDay(timestamp) {
  return new Date(timestamp).getDay();
}

class AdvancedPresenceEngine extends EventEmitter {
  constructor(options = {}) {
    super();

    this._logger = typeof options.logger === 'function' ? options.logger : () => {};
    this._nowFn = typeof options.now === 'function' ? options.now : () => Date.now();
    this._destroyed = false;

    // Fusion weights
    this._weights = {
      capability: clampNumber(options.capabilityWeight ?? 0.35, 0.0, 1.0),
      radio: clampNumber(options.radioWeight ?? 0.25, 0.0, 1.0),
      triangulation: clampNumber(options.triangulationWeight ?? 0.20, 0.0, 1.0),
      network: clampNumber(options.networkWeight ?? 0.12, 0.0, 1.0),
      pattern: clampNumber(options.patternWeight ?? 0.08, 0.0, 1.0),
    };

    this._presenceThreshold = clampNumber(options.presenceThreshold || 0.38, 0.05, 0.95);
    this._clearThreshold = clampNumber(options.clearThreshold || 0.12, 0.0, 0.5);

    // Presence state
    this._score = 0;
    this._state = 'clear';
    this._lastSignalTime = 0;
    this._presenceDetectedAt = null;
    this._lastPrediction = 0;

    // Subsystems
    this._scorer = new PresenceConfidenceScorer({
      decayHalfLifeMs: options.decayHalfLifeMs || 300000,
      timeOfDay: options.timeOfDay || undefined,
      logger: this._logger,
    });
    this._cartography = new SignalCartography({
      logger: this._logger,
      now: this._nowFn,
      maxHistoryPerDevice: options.cartographyHistory || 120,
      emaAlpha: options.cartographyAlpha || 0.18,
    });
    this._triangulation = new SignalTriangulation({
      logger: this._logger,
      now: this._nowFn,
      decayPerMinute: options.triangulationDecay || 0.025,
      presenceThreshold: 0.2,
      clearThreshold: 0.05,
      diversityBonus: 0.10,
    });
    this._network = new NetworkPresenceCorrelation({
      logger: this._logger,
      now: this._nowFn,
      presenceTimeoutMs: options.networkTimeoutMs || 10 * 60 * 1000,
      recentWindowMs: options.networkRecentWindowMs || 5 * 60 * 1000,
    });

    // Time-pattern learning
    this._pattern = {
      enabled: options.patternEnabled !== false,
      learnedSlots: new Map(),
      slotMinutes: clampNumber(options.patternSlotMinutes || 30, 10, 120),
      learningRate: clampNumber(options.patternLearningRate || 0.06, 0.01, 0.2),
      maxSlots: 48,
    };

    // Timers
    this._periodicTimer = null;
  }

  /**
   * Start the engine.
   */
  start() {
    if (this._destroyed) return;
    this._network.startDecayTimer();

    this._periodicTimer = setInterval(() => {
      this._periodicTick();
    }, 30_000);

    this._logger('[ADV-PRESENCE] AdvancedPresenceEngine started');
  }

  /**
   * Stop and clean up.
   */
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;

    if (this._periodicTimer) {
      clearInterval(this._periodicTimer);
      this._periodicTimer = null;
    }

    this._network.destroy();
    this._triangulation.destroy();
    this._cartography.destroy();
    this.removeAllListeners();
    this._logger('[ADV-PRESENCE] AdvancedPresenceEngine stopped');
  }

  /**
   * Update settings at runtime.
   */
  updateSettings(settings = {}) {
    if (settings.decay_half_life_seconds !== undefined) {
      this._scorer.setDecayHalfLife(clampNumber(settings.decay_half_life_seconds, 30, 3600) * 1000);
    }
    if (settings.time_of_day_enabled !== undefined) {
      this._scorer.setTimeOfDayConfig({
        enabled: !!settings.time_of_day_enabled,
        nightStartHour: settings.night_start_hour ?? 23,
        nightEndHour: settings.night_end_hour ?? 6,
        nightMultiplier: settings.night_multiplier ?? 0.7,
      });
    }
    if (settings.presence_threshold !== undefined) {
      this._presenceThreshold = clampNumber(settings.presence_threshold / 100, 0.05, 0.95);
    }
    if (settings.absence_threshold !== undefined) {
      this._clearThreshold = clampNumber(settings.absence_threshold / 100, 0.0, 0.5);
    }
    if (settings.pattern_enabled !== undefined) {
      this._pattern.enabled = !!settings.pattern_enabled;
    }
    if (settings.pattern_slot_minutes !== undefined) {
      this._pattern.slotMinutes = clampNumber(settings.pattern_slot_minutes, 10, 120);
    }
  }

  /**
   * Register a room device for capability aggregation.
   */
  registerRoomDevice(deviceId, meta = {}) {
    if (!deviceId) return;
    this._triangulation.registerDevice(deviceId, {
      zoneId: meta.zoneId || 'default',
      weight: meta.triangulationWeight || 1.0,
      type: meta.deviceType || 'unknown',
    });
    this._cartography.registerDevice(deviceId, {
      driverId: meta.driverId || null,
      zoneId: meta.zoneId || 'default',
      role: meta.role || 'unknown',
      label: meta.label || deviceId,
    });
    this._network.registerDevice(deviceId, {
      zoneId: meta.zoneId || 'default',
      source: 'zigbee',
    });
  }

  /**
   * Register a zone / room.
   */
  registerZone(zoneId, meta = {}) {
    this._triangulation.registerZone(zoneId, meta);
  }

  /**
   * Record a capability-derived presence signal.
   */
  ingestCapabilitySignal(signal) {
    if (this._destroyed) return;

    const {
      signalType,
      weight,
      deviceId,
      timestamp = this._nowFn(),
    } = signal || {};

    if (signalType) {
      this._scorer.recordSignal(signalType, timestamp, weight);
    }

    this._lastSignalTime = Math.max(this._lastSignalTime, timestamp);

    if (deviceId) {
      this._triangulation.ingestPresenceSignal({
        zoneId: signal.zoneId || 'default',
        deviceId,
        weight: typeof weight === 'number' ? weight / 35 : 0.3,
        timestamp,
      });
    }

    this._applyFusion(timestamp);
  }

  /**
   * Ingest a raw LQI reading from a device.
   */
  ingestLqi(deviceId, lqi, timestamp = this._nowFn()) {
    if (this._destroyed) return;

    this._cartography.recordLqi(deviceId, lqi, timestamp);
    this._triangulation.ingestLqi(deviceId, lqi, timestamp);

    // Translate strong/weak LQI into a weak presence hint.
    const normalized = clampNumber(lqi, 0, 255) / 255;
    if (normalized > 0.6) {
      this._scorer.recordSignal('button_press', timestamp, Math.round(normalized * 12));
    }

    this._lastSignalTime = Math.max(this._lastSignalTime, timestamp);
    this._applyFusion(timestamp);
  }

  /**
   * Ingest a raw RSSI reading.
   */
  ingestRssi(deviceId, rssi, timestamp = this._nowFn()) {
    if (this._destroyed) return;

    // Approximate LQI from RSSI: LQI ~ (rssi + 100) / 70 * 255
    const approxLqi = clampNumber(Math.round(((rssi + 100) / 70) * 255), 0, 255);
    this.ingestLqi(deviceId, approxLqi, timestamp);
  }

  /**
   * Ingest a network-side capability event.
   */
  ingestNetworkEvent(event) {
    if (this._destroyed) return;
    this._network.ingestCapabilityEvent(event);
    this._applyFusion(event?.timestamp || this._nowFn());
  }

  /**
   * Ingest an online/offline state change.
   */
  ingestOnlineState(deviceId, isOnline, timestamp = this._nowFn()) {
    if (this._destroyed) return;
    this._network.ingestOnlineState(deviceId, isOnline, timestamp);
    this._applyFusion(timestamp);
  }

  /**
   * Ingest an external hint (e.g. from an external router app).
   */
  ingestExternalHint(hint) {
    if (this._destroyed) return;
    this._network.ingestExternalHint(hint);
    this._applyFusion(hint?.timestamp || this._nowFn());
  }

  /**
   * Force presence state from a flow card.
   */
  forcePresent(timestamp = this._nowFn()) {
    this._score = 1;
    this._setState('present', timestamp);
  }

  /**
   * Force clear state from a flow card.
   */
  forceClear(timestamp = this._nowFn()) {
    this._score = 0;
    this._scorer.clearAll();
    this._setState('clear', timestamp);
  }

  // --- getters ---

  get state() {
    return this._state;
  }

  get confidence() {
    return Math.round(this._score * 100);
  }

  get isPresent() {
    return this._state === 'present';
  }

  get presenceDetectedAt() {
    return this._presenceDetectedAt;
  }

  get presenceDurationMinutes() {
    if (!this._presenceDetectedAt) return 0;
    return Math.round((this._nowFn() - this._presenceDetectedAt) / 60000);
  }

  /**
   * Get fusion diagnostics.
   */
  getDiagnostics() {
    return {
      state: this._state,
      confidence: this.confidence,
      score: Math.round(this._score * 1000) / 1000,
      presenceThreshold: this._presenceThreshold,
      clearThreshold: this._clearThreshold,
      presenceDetectedAt: this._presenceDetectedAt,
      presenceDurationMinutes: this.presenceDurationMinutes,
      lastSignalTime: this._lastSignalTime,
      weights: Object.assign({}, this._weights),
      capability: {
        activeSignals: this._scorer.getActiveSignals(),
      },
      cartography: this._cartography.getNetworkSummary(),
      coverage: this._cartography.computeCoverageStats(),
      triangulation: this._triangulation.getDiagnostics(),
      network: this._network.getDiagnostics(),
      pattern: this._patternSummary(),
    };
  }

  destroyAll() {
    this.destroy();
  }

  // --- internals ---

  _applyFusion(timestamp) {
    const capabilityScore = clampNumber(this._scorer.calculate().confidence / 100, 0, 1);
    const coverage = this._cartography.computeCoverageStats();
    const radioScore = clampNumber((coverage.averageLqi ?? 128) / 255, 0, 1);
    const zone = this._triangulation.getEstimatedZone();
    const triangulationScore = zone ? clampNumber(zone.score * 1.2, 0, 1) : 0.05;
    const networkScore = clampNumber(this._network.getScore().score, 0, 1);
    const patternScore = this._patternEnabledScore(timestamp);

    const raw =
      capabilityScore * this._weights.capability +
      radioScore * this._weights.radio +
      triangulationScore * this._weights.triangulation +
      networkScore * this._weights.network +
      patternScore * this._weights.pattern;

    this._score = clampNumber(lerp(this._score, raw, 0.75), 0, 1);
    this._lastSignalTime = Math.max(this._lastSignalTime, timestamp);
    this._lastPrediction = timestamp;

    if (this._score >= this._presenceThreshold) {
      this._setState('present', timestamp);
    } else if (this._score <= this._clearThreshold) {
      this._setState('clear', timestamp);
    } else {
      this._setState('uncertain', timestamp);
    }

    this.emit('fusion_score', {
      score: Math.round(this._score * 1000) / 1000,
      confidence: this.confidence,
      state: this._state,
      timestamp,
    });

    this._learnPattern(timestamp, this._state === 'present' ? 1 : 0);
  }

  _setState(newState, timestamp) {
    if (this._state === newState) return;
    const prevState = this._state;
    this._state = newState;

    if (newState === 'present' && prevState !== 'present') {
      this._presenceDetectedAt = timestamp;
      this._logger(`[ADV-PRESENCE] PRESENCE DETECTED (confidence: ${this.confidence}%)`);
      this.emit('presence_detected', { confidence: this.confidence, timestamp });
    } else if (newState === 'clear' && prevState !== 'clear') {
      this._logger(`[ADV-PRESENCE] PRESENCE CLEARED (duration: ${this.presenceDurationMinutes} min)`);
      this.emit('presence_cleared', { durationMinutes: this.presenceDurationMinutes, timestamp });
      this._presenceDetectedAt = null;
    }
  }

  _periodicTick() {
    if (this._destroyed) return;

    // Let low-level subsystems decay naturally.
    this._triangulation.update(this._nowFn());
    this._applyFusion(this._nowFn());
  }

  // --- pattern learning ---

  _patternSlotKey(timestamp) {
    const date = new Date(timestamp);
    const day = indexOfDay(timestamp);
    const minutes = date.getHours() * 60 + date.getMinutes();
    const slot = Math.floor(minutes / this._pattern.slotMinutes);
    return `${day}_${slot}`;
  }

  _learnPattern(timestamp, label) {
    if (!this._pattern.enabled) return;
    const key = this._patternSlotKey(timestamp);
    const prev = this._pattern.learnedSlots.get(key) || 0.5;
    const lr = this._pattern.learningRate;
    const next = prev + lr * (label - prev);
    this._pattern.learnedSlots.set(key, clampNumber(next, 0, 1));

    // Prevent unbounded growth
    if (this._pattern.learnedSlots.size > this._pattern.maxSlots) {
      const oldestKey = this._pattern.learnedSlots.keys().next().value;
      this._pattern.learnedSlots.delete(oldestKey);
    }
  }

  _patternEnabledScore(timestamp) {
    if (!this._pattern.enabled) return 0.25;
    const key = this._patternSlotKey(timestamp);
    return clampNumber(this._pattern.learnedSlots.get(key) || 0.25, 0, 1);
  }

  _patternSummary() {
    return {
      enabled: this._pattern.enabled,
      slotMinutes: this._pattern.slotMinutes,
      learnedSlots: this._pattern.learnedSlots.size,
    };
  }
}

module.exports = AdvancedPresenceEngine;
