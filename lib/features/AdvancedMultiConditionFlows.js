'use strict';

/**
 * Advanced Multi-Condition Flow Cards - FEATURE #43
 *
 * Enables complex multi-condition flow triggers:
 * - AND/OR condition composition
 * - Time-based conditions (time windows, day-of-week)
 * - Device state comparison (greater than, less than, equals)
 * - State duration conditions (device in state for X minutes)
 * - Compound triggers from multiple devices
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

class AdvancedMultiConditionFlows extends EventEmitter {
  constructor(homey, options = {}) {
    super();
    this.homey = homey;

    // Condition evaluation cache
    this._conditionCache = new Map();
    this._cacheTimeoutMs = options.cacheTimeoutMs || 5000;

    // State tracking for duration conditions
    this._stateHistory = new Map(); // key: deviceId_capability, value: [{ timestamp, value }]

    // Registered flow cards
    this._registeredCards = new Set();
  }

  /**
   * Register all advanced flow cards
   */
  async registerFlowCards() {
    // Multi-condition device trigger
    this._registerDeviceMultiConditionCard();

    // State duration trigger
    this._registerStateDurationCard();

    // Time window condition
    this._registerTimeWindowCard();

    // Device comparison condition
    this._registerDeviceComparisonCard();

    // Compound trigger
    this._registerCompoundTriggerCard();

    this.homey.log('[AdvancedFlows] All advanced flow cards registered');
  }

  /**
   * Register: Device multi-condition trigger
   * Fires when ALL conditions are met simultaneously
   */
  _registerDeviceMultiConditionCard() {
    const card = this.homey.flow.getTriggerCard('device_multi_condition');
    if (!card) return;

    card.registerRunListener(async (args, state) => {
      const { conditions } = args;
      if (!conditions || !Array.isArray(conditions)) return false;

      // Evaluate all conditions
      for (const condition of conditions) {
        const result = await this._evaluateCondition(condition);
        if (!result) return false;
      }

      return true;
    });

    this._registeredCards.add('device_multi_condition');
  }

  /**
   * Register: State duration trigger
   * Fires when a device state has been stable for a specified duration
   */
  _registerStateDurationCard() {
    const card = this.homey.flow.getTriggerCard('state_duration_exceeded');
    if (!card) return;

    card.registerRunListener(async (args, state) => {
      const { device, capability, requiredState, durationMinutes } = args;
      if (!device || !capability) return false;

      const key = `${device.id}_${capability}`;
      const history = this._stateHistory.get(key);

      if (!history || history.length === 0) return false;

      const now = Date.now();
      const durationMs = (durationMinutes || 1) * 60 * 1000;

      // Find how long the state has been stable
      const stableSince = this._findStableStartTime(history, requiredState);
      if (!stableSince) return false;

      return (now - stableSince) >= durationMs;
    });

    this._registeredCards.add('state_duration_exceeded');
  }

  /**
   * Register: Time window condition
   */
  _registerTimeWindowCard() {
    const condition = this.homey.flow.getConditionCard('in_time_window');
    if (!condition) return;

    condition.registerRunListener(async (args) => {
      const { startTime, endTime, daysOfWeek } = args;
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const dayOfWeek = now.getDay(); // 0=Sunday

      // Check day of week
      if (daysOfWeek && daysOfWeek.length > 0) {
        if (!daysOfWeek.includes(dayOfWeek)) return false;
      }

      // Check time window
      if (startTime && endTime) {
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        if (startMinutes <= endMinutes) {
          // Same day window (e.g., 08:00 - 22:00)
          return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
        } else {
          // Overnight window (e.g., 22:00 - 06:00)
          return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
        }
      }

      return true;
    });

    this._registeredCards.add('in_time_window');
  }

  /**
   * Register: Device comparison condition
   */
  _registerDeviceComparisonCard() {
    const condition = this.homey.flow.getConditionCard('device_value_comparison');
    if (!condition) return;

    condition.registerRunListener(async (args) => {
      const { device, capability, operator, value } = args;
      if (!device || !capability) return false;

      const currentValue = device.getCapabilityValue(capability);
      if (currentValue === null || currentValue === undefined) return false;

      switch (operator) {
      case 'gt': return currentValue > value;
      case 'gte': return currentValue >= value;
      case 'lt': return currentValue < value;
      case 'lte': return currentValue <= value;
      case 'eq': return currentValue == value;
      case 'neq': return currentValue != value;
      default: return false;
      }
    });

    this._registeredCards.add('device_value_comparison');
  }

  /**
   * Register: Compound trigger (fires when any of multiple triggers match)
   */
  _registerCompoundTriggerCard() {
    const card = this.homey.flow.getTriggerCard('compound_device_trigger');
    if (!card) return;

    card.registerRunListener(async (args, state) => {
      const { devices, capability, triggerValue } = args;
      if (!devices || !Array.isArray(devices)) return false;

      for (const device of devices) {
        const currentValue = device.getCapabilityValue(capability);
        if (currentValue === triggerValue || currentValue == triggerValue) {
          return { matchedDevice: device.getName() };
        }
      }

      return false;
    });

    this._registeredCards.add('compound_device_trigger');
  }

  /**
   * Update state history for a device capability
   * Call this from capability change handlers
   */
  updateStateHistory(deviceId, capability, value) {
    const key = `${deviceId}_${capability}`;
    if (!this._stateHistory.has(key)) {
      this._stateHistory.set(key, []);
    }

    const history = this._stateHistory.get(key);
    history.push({ timestamp: Date.now(), value });

    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Find when a specific state started being stable
   */
  _findStableStartTime(history, requiredState) {
    if (history.length === 0) return null;

    // Walk backwards from most recent
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].value !== requiredState) {
        // Found the transition point - the state started at the next entry
        return i < history.length - 1 ? history[i + 1].timestamp : null;
      }
    }

    // State has been stable for entire history
    return history[0].timestamp;
  }

  /**
   * Evaluate a condition object
   */
  async _evaluateCondition(condition) {
    const cacheKey = JSON.stringify(condition);
    const cached = this._conditionCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this._cacheTimeoutMs) {
      return cached.result;
    }

    let result = false;

    try {
      switch (condition.type) {
      case 'device_state':
        result = await this._evalDeviceState(condition);
        break;
      case 'time_window':
        result = this._evalTimeWindow(condition);
        break;
      case 'compound':
        result = await this._evalCompound(condition);
        break;
      default:
        result = false;
      }
    } catch (err) {
      this.homey.error('[AdvancedFlows] Condition evaluation error:', err.message);
      result = false;
    }

    this._conditionCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }

  async _evalDeviceState(condition) {
    const devices = this.homey.ManagerDevices.getDevices();
    for (const device of Object.values(devices)) {
      if (condition.deviceId && device.id !== condition.deviceId) continue;

      const value = device.getCapabilityValue(condition.capability);
      if (value === condition.value) return true;
    }
    return false;
  }

  _evalTimeWindow(condition) {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = (condition.start || '0:0').split(':').map(Number);
    const [endH, endM] = (condition.end || '23:59').split(':').map(Number);
    const start = startH * 60 + startM;
    const end = endH * 60 + endM;

    return minutes >= start && minutes <= end;
  }

  async _evalCompound(condition) {
    if (!condition.conditions || !Array.isArray(condition.conditions)) return false;

    const logic = condition.logic || 'and';
    for (const subCondition of condition.conditions) {
      const result = await this._evaluateCondition(subCondition);
      if (logic === 'and' && !result) return false;
      if (logic === 'or' && result) return true;
    }

    return logic === 'and';
  }

  /**
   * Get stats about registered cards and state history
   */
  getStats() {
    return {
      registeredCards: Array.from(this._registeredCards),
      stateHistorySize: this._stateHistory.size,
      conditionCacheSize: this._conditionCache.size
    };
  }

  destroy() {
    this._conditionCache.clear();
    this._stateHistory.clear();
  }
}

module.exports = AdvancedMultiConditionFlows;
