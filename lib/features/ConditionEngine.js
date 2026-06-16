'use strict';

/**
 * ConditionEngine - Flexible Condition Evaluation
 * FEATURE #85
 *
 * Evaluates complex condition trees for flow card triggers:
 *   - Device state conditions (capability value comparisons)
 *   - Time conditions (before/after, day-of-week, date range)
 *   - Logical operators (AND, OR, NOT, XOR)
 *   - Duration-based conditions (state held for N seconds)
 *   - Compound conditions with nesting
 *   - Comparison operators: ==, !=, >, <, >=, <=, in, not_in, between
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

class ConditionEngine extends EventEmitter {
  constructor(homey, options = {}) {
    super();
    this.homey = homey;
    this.cacheTimeoutMs = options.cacheTimeoutMs || 5000;
    this._conditionCache = new Map();
    this._durationTrackers = new Map(); // key: conditionId, value: { startedAt, conditionMet }
    this._destroyed = false;

    // Condition evaluators registry
    this._evaluators = new Map();
    this._registerBuiltinEvaluators();
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Evaluate a condition tree.
   *
   * @param {Object|Array} condition - Condition or array of conditions
   * @param {Object} [context] - Available data for evaluation
   * @returns {Promise<boolean>}
   */
  async evaluate(condition, context = {}) {
    if (this._destroyed) return false;
    if (Array.isArray(condition)) {
      return this._evaluateAnd(condition, context);
    }
    return this._evaluateNode(condition, context);
  }

  /**
   * Evaluate multiple conditions with AND logic.
   * @param {Array} conditions
   * @param {Object} context
   * @returns {Promise<boolean>}
   */
  async evaluateAll(conditions, context = {}) {
    return this._evaluateAnd(conditions, context);
  }

  /**
   * Evaluate multiple conditions with OR logic.
   * @param {Array} conditions
   * @param {Object} context
   * @returns {Promise<boolean>}
   */
  async evaluateAny(conditions, context = {}) {
    return this._evaluateOr(conditions, context);
  }

  /**
   * Register a custom condition evaluator.
   * @param {string} type - Condition type identifier
   * @param {Function} evaluator - async (params, context) => boolean
   */
  registerEvaluator(type, evaluator) {
    this._evaluators.set(type, evaluator);
  }

  /**
   * Start tracking a duration-based condition.
   * @param {string} conditionId
   * @param {boolean} conditionMet
   */
  startDurationTracking(conditionId, conditionMet) {
    if (!this._durationTrackers.has(conditionId)) {
      this._durationTrackers.set(conditionId, {
        startedAt: Date.now(),
        conditionMet,
        lastUpdate: Date.now()
      });
    } else {
      const tracker = this._durationTrackers.get(conditionId);
      if (tracker.conditionMet !== conditionMet) {
        // Condition state changed, reset timer
        tracker.startedAt = Date.now();
        tracker.conditionMet = conditionMet;
        tracker.lastUpdate = Date.now();
      } else {
        tracker.lastUpdate = Date.now();
      }
    }
  }

  /**
   * Check if a duration condition has been held for the required time.
   * @param {string} conditionId
   * @param {number} durationMs
   * @returns {boolean}
   */
  checkDurationCondition(conditionId, durationMs) {
    const tracker = this._durationTrackers.get(conditionId);
    if (!tracker || !tracker.conditionMet) return false;
    return (Date.now() - tracker.startedAt) >= durationMs;
  }

  /* ------------------------------------------------------------------ */
  /*  Internal evaluation                                                */
  /* ------------------------------------------------------------------ */

  async _evaluateNode(condition, context) {
    if (!condition) return false;

    // Check cache
    const cacheKey = this._getCacheKey(condition, context);
    const cached = this._conditionCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeoutMs) {
      return cached.result;
    }

    let result;

    // Logical operators
    if (condition.operator) {
      switch (condition.operator) {
      case 'and':
        result = await this._evaluateAnd(condition.conditions || [], context);
        break;
      case 'or':
        result = await this._evaluateOr(condition.conditions || [], context);
        break;
      case 'not':
        result = !(await this._evaluateNode(condition.condition, context));
        break;
      default:
        result = await this._evaluateTypeCondition(condition, context);
        break;
      }
    } else {
      result = await this._evaluateTypeCondition(condition, context);
    }

    // Cache result
    this._conditionCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }

  async _evaluateTypeCondition(condition, context) {
    const type = condition.type;
    const evaluator = this._evaluators.get(type);
    if (evaluator) {
      return evaluator(condition.params || condition, context);
    }

    // Built-in type handlers
    switch (type) {
    case 'device_capability':
      return this._evalDeviceCapability(condition.params || condition, context);
    case 'time':
    case 'time_window':
      return this._evalTimeWindow(condition.params || condition, context);
    case 'day_of_week':
      return this._evalDayOfWeek(condition.params || condition, context);
    case 'date_range':
      return this._evalDateRange(condition.params || condition, context);
    case 'duration':
      return this._evalDuration(condition.params || condition, context);
    case 'always':
      return true;
    case 'never':
      return false;
    default:
      this.homey?.log?.(`[ConditionEngine] Unknown condition type: ${type}`);
      return false;
    }
  }

  async _evaluateAnd(conditions, context) {
    for (const c of conditions) {
      if (this._destroyed) return false;
      if (!(await this._evaluateNode(c, context))) return false;
    }
    return true;
  }

  async _evaluateOr(conditions, context) {
    for (const c of conditions) {
      if (this._destroyed) return false;
      if (await this._evaluateNode(c, context)) return true;
    }
    return false;
  }

  /* ------------------------------------------------------------------ */
  /*  Built-in evaluators                                                */
  /* ------------------------------------------------------------------ */

  _registerBuiltinEvaluators() {
    // Device capability comparison
    this._evaluators.set('device_capability', (params, ctx) => {
      return this._evalDeviceCapability(params, ctx);
    });

    // Time window
    this._evaluators.set('time_window', (params, ctx) => {
      return this._evalTimeWindow(params, ctx);
    });
  }

  async _evalDeviceCapability(params, context) {
    const { deviceId, capability, operator, value } = params;
    if (!deviceId || !capability) return false;

    let actualValue;
    if (context.deviceStates && context.deviceStates[deviceId]) {
      actualValue = context.deviceStates[deviceId][capability];
    } else if (this.homey?.drivers) {
      const device = this.homey.drivers.getDeviceById?.(deviceId);
      if (device) {
        actualValue = device.getCapabilityValue?.(capability);
      }
    }

    if (actualValue === undefined || actualValue === null) return false;

    return this._compare(actualValue, operator, value);
  }

  _evalTimeWindow(params) {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentTime = hour * 60 + minute;

    const startHour = params.startHour ?? 0;
    const startMinute = params.startMinute ?? 0;
    const endHour = params.endHour ?? 23;
    const endMinute = params.endMinute ?? 59;

    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime < endTime;
    }
    // Wraps around midnight
    return currentTime >= startTime || currentTime < endTime;
  }

  _evalDayOfWeek(params) {
    const now = new Date();
    const day = now.getDay();
    const days = params.days || params.daysOfWeek || [];
    return days.includes(day);
  }

  _evalDateRange(params) {
    const now = Date.now();
    const start = params.startDate ? new Date(params.startDate).getTime() : 0;
    const end = params.endDate ? new Date(params.endDate).getTime() : Infinity;
    return now >= start && now <= end;
  }

  _evalDuration(params) {
    const { conditionId, durationMs } = params;
    if (!conditionId) return false;
    return this.checkDurationCondition(conditionId, durationMs || 0);
  }

  /* ------------------------------------------------------------------ */
  /*  Comparison engine                                                  */
  /* ------------------------------------------------------------------ */

  _compare(actual, operator, expected) {
    switch (operator) {
    case '==':
    case 'equals':
      return actual === expected;
    case '!=':
    case 'not_equals':
      return actual !== expected;
    case '>':
    case 'gt':
      return Number(actual) > Number(expected);
    case '<':
    case 'lt':
      return Number(actual) < Number(expected);
    case '>=':
    case 'gte':
      return Number(actual) >= Number(expected);
    case '<=':
    case 'lte':
      return Number(actual) <= Number(expected);
    case 'in':
      return Array.isArray(expected) && expected.includes(actual);
    case 'not_in':
      return Array.isArray(expected) && !expected.includes(actual);
    case 'between':
      if (Array.isArray(expected) && expected.length === 2) {
        const num = Number(actual);
        return num >= Number(expected[0]) && num <= Number(expected[1]);
      }
      return false;
    case 'contains':
      return String(actual).includes(String(expected));
    case 'starts_with':
      return String(actual).startsWith(String(expected));
    default:
      return actual === expected;
    }
  }

  _getCacheKey(condition, context) {
    try {
      return JSON.stringify({ c: condition, ctx: Object.keys(context) });
    } catch (_e) {
      return `${Date.now()}_${Math.random()}`;
    }
  }

  /**
   * Clear the condition cache.
   */
  clearCache() {
    this._conditionCache.clear();
  }

  /**
   * Destroy and cleanup.
   */
  destroy() {
    this._destroyed = true;
    this._conditionCache.clear();
    this._durationTrackers.clear();
    this._evaluators.clear();
    this.removeAllListeners();
  }
}

module.exports = ConditionEngine;
