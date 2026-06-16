'use strict';

/**
 * PresenceConfidenceScorer - Multi-signal confidence scoring engine
 *
 * v1.0.0: Calculates presence confidence (0-100%) from multiple device signals.
 * Uses temporal decay, weighted signal contributions, and time-of-day modulation.
 *
 * Signal types and base weights:
 *   - motion        : 35 (strongest single indicator)
 *   - light_on      : 15 (someone turned on a light)
 *   - dimmer_change : 10 (someone adjusted brightness)
 *   - temperature   : 10 (body heat drift)
 *   - humidity      :  5 (body moisture / HVAC response)
 *   - energy        : 10 (appliance usage)
 *   - door_contact  : 15 (entry/exit event)
 *   - button_press  :  5 (manual interaction)
 *
 * Temporal behaviour:
 *   Each signal decays exponentially with a configurable half-life.
 *   Confidence is the sum of all live (non-expired) signals, capped at 100.
 *
 * Time-of-day modulation:
 *   Night hours (configurable, default 23:00-06:00) apply a 0.7x multiplier
 *   because fewer devices fire (people are sleeping), so remaining signals
 *   carry proportionally less weight.
 */

/** Signal type constants */
const SIGNAL = Object.freeze({
  MOTION: 'motion',
  LIGHT_ON: 'light_on',
  DIMMER_CHANGE: 'dimmer_change',
  TEMPERATURE: 'temperature',
  HUMIDITY: 'humidity',
  ENERGY: 'energy',
  DOOR_CONTACT: 'door_contact',
  BUTTON_PRESS: 'button_press',
});

/** Default base weights per signal type */
const DEFAULT_WEIGHTS = Object.freeze({
  [SIGNAL.MOTION]: 35,
  [SIGNAL.LIGHT_ON]: 15,
  [SIGNAL.DIMMER_CHANGE]: 10,
  [SIGNAL.TEMPERATURE]: 10,
  [SIGNAL.HUMIDITY]: 5,
  [SIGNAL.ENERGY]: 10,
  [SIGNAL.DOOR_CONTACT]: 15,
  [SIGNAL.BUTTON_PRESS]: 5,
});

class PresenceConfidenceScorer {
  /**
   * @param {Object} [options]
   * @param {Object} [options.weights] - Override base weights per signal type
   * @param {number} [options.decayHalfLifeMs=300000] - Signal half-life in ms (default 5 min)
   * @param {number} [options.maxConfidence=100] - Maximum confidence value
   * @param {Object} [options.timeOfDay] - Time-of-day modulation config
   * @param {boolean} [options.timeOfDay.enabled=false]
   * @param {number} [options.timeOfDay.nightStartHour=23]
   * @param {number} [options.timeOfDay.nightEndHour=6]
   * @param {number} [options.timeOfDay.nightMultiplier=0.7]
   * @param {Function} [options.logger] - Injectable logger (defaults to no-op)
   */
  constructor(options = {}) {
    this._weights = Object.assign({}, DEFAULT_WEIGHTS, options.weights || {});
    this._decayHalfLifeMs = options.decayHalfLifeMs || 300000; // 5 min
    this._maxConfidence = options.maxConfidence || 100;
    this._timeOfDay = {
      enabled: options.timeOfDay?.enabled || false,
      nightStartHour: options.timeOfDay?.nightStartHour ?? 23,
      nightEndHour: options.timeOfDay?.nightEndHour ?? 6,
      nightMultiplier: options.timeOfDay?.nightMultiplier ?? 0.7,
    };
    this._logger = options.logger || (() => {});

    // Active signal ledger: Map<signalType, { weight, timestamp }>
    this._activeSignals = new Map();
  }

  /**
   * Register a signal event.
   * @param {string} signalType - One of SIGNAL constants
   * @param {number} [timestamp=Date.now()] - When the signal was observed
   * @param {number} [customWeight] - Override the default weight for this event
   */
  recordSignal(signalType, timestamp = Date.now(), customWeight) {
    const weight = customWeight !== undefined ? customWeight : this._weights[signalType];
    if (weight === undefined) {
      this._logger(`[CONFIDENCE] Unknown signal type: ${signalType}`);
      return;
    }
    this._activeSignals.set(signalType, { weight, timestamp });
  }

  /**
   * Remove a signal type from the ledger (e.g., motion cleared).
   * @param {string} signalType
   */
  clearSignal(signalType) {
    this._activeSignals.delete(signalType);
  }

  /**
   * Clear all signals (room definitely empty).
   */
  clearAll() {
    this._activeSignals.clear();
  }

  /**
   * Calculate current confidence score.
   * @returns {{ confidence: number, signals: Array<{ type: string, contribution: number }>, isNight: boolean }}
   */
  calculate() {
    const now = Date.now();
    const isNight = this._isNightTime(now);
    const timeMultiplier = isNight ? this._timeOfDay.nightMultiplier : 1.0;

    let totalConfidence = 0;
    const activeContributions = [];

    for (const [signalType, { weight, timestamp }] of this._activeSignals) {
      const ageMs = now - timestamp;
      const decay = this._decay(ageMs);
      const contribution = Math.round(weight * decay * timeMultiplier * 100) / 100;

      if (contribution >= 0.5) {
        totalConfidence += contribution;
        activeContributions.push({ type: signalType, contribution });
      } else {
        // Signal has decayed below threshold; remove it
        this._activeSignals.delete(signalType);
      }
    }

    const confidence = Math.min(Math.round(totalConfidence), this._maxConfidence);

    return {
      confidence,
      signals: activeContributions,
      isNight,
    };
  }

  /**
   * Check if a given time falls within the night window.
   * Handles wrap-around (e.g., 23:00 - 06:00).
   * @private
   */
  _isNightTime(timestamp) {
    if (!this._timeOfDay.enabled) return false;

    const date = new Date(timestamp);
    const hour = date.getHours();
    const { nightStartHour, nightEndHour } = this._timeOfDay;

    if (nightStartHour > nightEndHour) {
      // Wraps around midnight: e.g., 23 -> 6
      return hour >= nightStartHour || hour < nightEndHour;
    }
    return hour >= nightStartHour && hour < nightEndHour;
  }

  /**
   * Exponential decay function.
   * Returns 1.0 at age=0, 0.5 at age=halfLife, approaching 0.
   * @private
   */
  _decay(ageMs) {
    return Math.pow(0.5, ageMs / this._decayHalfLifeMs);
  }

  /**
   * Get the current active signals for debugging/telemetry.
   * @returns {Array<{ type: string, weight: number, age: number }>}
   */
  getActiveSignals() {
    const now = Date.now();
    const result = [];
    for (const [signalType, { weight, timestamp }] of this._activeSignals) {
      result.push({
        type: signalType,
        weight,
        age: now - timestamp,
      });
    }
    return result;
  }

  /**
   * Get the default weight for a signal type.
   * @param {string} signalType
   * @returns {number|undefined}
   */
  getWeight(signalType) {
    return this._weights[signalType];
  }

  /**
   * Update the half-life at runtime (e.g., from user settings).
   * @param {number} halfLifeMs
   */
  setDecayHalfLife(halfLifeMs) {
    if (typeof halfLifeMs === 'number' && halfLifeMs > 0) {
      this._decayHalfLifeMs = halfLifeMs;
    }
  }

  /**
   * Update time-of-day settings at runtime.
   * @param {Object} timeOfDayCfg
   */
  setTimeOfDayConfig(timeOfDayCfg) {
    Object.assign(this._timeOfDay, timeOfDayCfg);
  }
}

module.exports = PresenceConfidenceScorer;
module.exports.SIGNAL = SIGNAL;
module.exports.DEFAULT_WEIGHTS = DEFAULT_WEIGHTS;
