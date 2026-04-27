'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../utils/tuyaUtils.js');

/**
 * SmartFlowManager - v5.3.59
 */
class SmartFlowManager {
  constructor(device) {
    this.device = device;
    this.homey = device.homey;
    this.driverId = device.driver?.id || 'unknown';
    this.log = (...args) => device.log('[SMART-FLOW]', ...args);
    this.error = (...args) => device.error('[SMART-FLOW]', ...args);

    this._valueHistory = new Map();
    this._lastTriggerTime = new Map();
    this._triggerCooldowns = new Map();
    this._patternDetection = new Map();

    this._historySize = 50;
    this._defaultCooldown = 1000;
    this._rateOfChangeThreshold = 0.1;

    this._smartTriggers = new Map();
    this._valueListeners = new Map();
  }

  async initialize() {
    this.log('Initializing smart flow system...');
    const capabilities = this.device.getCapabilities();
    for (const capability of capabilities) {
      await this._setupSmartListener(capability);
    }
    await this._registerSmartTriggers();
    this.log(` Smart flow system ready for ${capabilities.length} capabilities`);
  }

  async _setupSmartListener(capability) {
    this._valueHistory.set(capability, []);
    this._patternDetection.set(capability, {
      lastState: null,
      stateChanges: 0,
      rapidChanges: 0,
      lastChangeTime: 0
    });

    try {
      this.device.registerCapabilityListener(capability, async (value) => {
        await this._onValueChange(capability, value);
      });
      this._valueListeners.set(capability, true);
    } catch (err) {}
  }

  async _onValueChange(capability, value) {
    const now = Date.now();
    const history = this._valueHistory.get(capability) || [];
    const pattern = this._patternDetection.get(capability);

    history.push({ value, time: now });
    if (history.length > this._historySize) history.shift();
    this._valueHistory.set(capability, history);

    const prevEntry = history.length > 1 ? history[history.length - 2] : null;
    const prevValue = prevEntry?.value;

    await this._triggerWithCooldown(`${capability}_changed`, { value, previous: prevValue });

    if (typeof value === 'boolean') {
      await this._triggerWithCooldown(`${capability}_${value}`, {});
    }

    if (typeof value === 'number' && prevValue !== undefined) {
      const thresholds = this._getThresholdsForCapability(capability);
      for (const threshold of thresholds) {
        if (prevValue < threshold && value >= threshold) {
          await this._triggerWithCooldown(`${capability}_crossed_up_${threshold}`, { value, threshold });
        }
        if (prevValue > threshold && value <= threshold) {
          await this._triggerWithCooldown(`${capability}_crossed_down_${threshold}`, { value, threshold });
        }
      }
      
      if (prevValue !== 0) {
        const rateOfChange = Math.abs((value - prevValue) / prevValue);
        if (rateOfChange > this._rateOfChangeThreshold) {
          await this._triggerWithCooldown(`${capability}_rapid_change`, {
            value,
            previous: prevValue,
            changePercent: Math.round(rateOfChange * 100)
          });
        }
      }
    }

    if (pattern && value !== pattern.lastState) {
      pattern.stateChanges++;
      const timeSinceLastChange = now - pattern.lastChangeTime;
      if (timeSinceLastChange < 5000) {
        pattern.rapidChanges++;
        if (pattern.rapidChanges >= 3) {
          await this._triggerWithCooldown(`${capability}_rapid_toggle`, { toggleCount: pattern.rapidChanges, value });
          pattern.rapidChanges = 0;
        }
      } else {
        pattern.rapidChanges = 1;
      }
      pattern.lastState = value;
      pattern.lastChangeTime = now;
    }

    if (typeof value === 'number' && history.length >= 10) {
      const values = history.map(h => h.value);
      if (value === Math.min(...values)) await this._triggerWithCooldown(`${capability}_min_reached`, { value, min: value });
      if (value === Math.max(...values)) await this._triggerWithCooldown(`${capability}_max_reached`, { value, max: value });
    }

    await this._checkStableValue(capability, value);
  }

  async _triggerWithCooldown(triggerId, tokens) {
    const now = Date.now();
    const fullTriggerId = `${this.driverId}_${triggerId}`;
    const lastTrigger = this._lastTriggerTime.get(fullTriggerId) || 0;
    const cooldown = this._triggerCooldowns.get(fullTriggerId) || this._defaultCooldown;

    if (now - lastTrigger < cooldown) return;
    this._lastTriggerTime.set(fullTriggerId, now);

    try {
      const card = this.device._getFlowCard(fullTriggerId, 'trigger');
      if (card) {
        await card.trigger(this.device, tokens);
        this.log(` Triggered: ${triggerId}`, tokens);
      } else {
        await this._tryGenericTrigger(triggerId, tokens);
      }
    } catch (err) {
      await this._tryGenericTrigger(triggerId, tokens);
    }
  }

  async _tryGenericTrigger(triggerId, tokens) {
    const genericIds = [triggerId, triggerId.replace(/_/g, '-'), `generic_${triggerId}`];
    for (const id of genericIds) {
      try {
        const card = this.device._getFlowCard(id, 'trigger');
        if (card) {
          await card.trigger(this.device, tokens);
          return;
        }
      } catch (err) {}
    }
  }

  _getThresholdsForCapability(capability) {
    const thresholds = {
      measure_temperature: [0, 10, 20, 25, 30, 35],
      measure_humidity: [30, 40, 50, 60, 70, 80],
      measure_luminance: [10, 50, 100, 500, 1000],
      measure_power: [100, 500, 1000, 2000, 3000],
      measure_battery: [10, 20, 50, 80],
      dim: [25, 50, 75],
      windowcoverings_set: [25, 50, 75]
    };
    return thresholds[capability] || [];
  }

  async _checkStableValue(capability, currentValue) {
    if (this._stableTimers && this._stableTimers[capability]) clearTimeout(this._stableTimers[capability]);
    if (!this._stableTimers) this._stableTimers = {};
    this._stableTimers[capability] = setTimeout(async () => {
      if (this.device.getCapabilityValue(capability) === currentValue) {
        await this._triggerWithCooldown(`${capability}_stable`, { value: currentValue, duration: 60 });
      }
    }, 60000);
  }

  async _registerSmartTriggers() {
    this.log('Smart triggers ready');
  }

  async triggerFlow(flowId, tokens = {}) {
    return this._triggerWithCooldown(flowId, tokens);
  }

  setCooldown(triggerId, cooldownMs) {
    this._triggerCooldowns.set(`${this.driverId}_${triggerId}`, cooldownMs);
  }

  getHistory(capability) {
    return this._valueHistory.get(capability) || [];
  }

  getStats(capability) {
    const history = this._valueHistory.get(capability) || [];
    if (history.length === 0) return null;
    const values = history.map(h => h.value);
    const numericValues = values.filter(v => typeof v === 'number');
    if (numericValues.length === 0) return { current: values[values.length - 1], changes: history.length };
    return {
      current: numericValues[numericValues.length - 1],
      min: Math.min(...numericValues),
      max: Math.max(...numericValues),
      avg: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
      samples: numericValues.length
    };
  }

  destroy() {
    if (this._stableTimers) {
      for (const timer of Object.values(this._stableTimers)) clearTimeout(timer);
    }
  }
}

module.exports = SmartFlowManager;
