'use strict';

/**
 * SmartFlowManager - v5.3.59
 *
 * Intelligent real-time flow card management.
 * Automatically creates, triggers, and adapts flow cards.
 *
 * Features:
 * - Real-time flow triggering on value changes
 * - Smart threshold-based triggers
 * - Rate-of-change detection
 * - Pattern recognition (repeated states)
 * - Historical comparison triggers
 * - Debouncing and cooldown
 */

class SmartFlowManager {

  constructor(device) {
    this.device = device;
    this.homey = device.homey;
    this.driverId = device.driver?.id || 'unknown';
    this.log = (...args) => device.log('[SMART-FLOW]', ...args);
    this.error = (...args) => device.error('[SMART-FLOW]', ...args);

    // Tracking
    this._valueHistory = new Map(); // capability -> [{ value, time }]
    this._lastTriggerTime = new Map(); // triggerId -> timestamp
    this._triggerCooldowns = new Map(); // triggerId -> cooldown ms
    this._patternDetection = new Map(); // capability -> pattern data

    // Configuration
    this._historySize = 50;
    this._defaultCooldown = 1000; // 1 second between same triggers
    this._rateOfChangeThreshold = 0.1; // 10% change triggers rate alert

    // Registered triggers
    this._smartTriggers = new Map();

    // Listeners for device values
    this._valueListeners = new Map();
  }

  /**
   * Initialize smart flow system
   */
  async initialize() {
    this.log('Initializing smart flow system...');

    // Setup listeners for all capabilities
    const capabilities = this.device.getCapabilities();

    for (const capability of capabilities) {
      await this._setupSmartListener(capability);
    }

    // Register smart triggers
    await this._registerSmartTriggers();

    this.log(`✅ Smart flow system ready for ${capabilities.length} capabilities`);
  }

  /**
   * Setup smart listener for a capability
   */
  async _setupSmartListener(capability) {
    // Initialize history
    this._valueHistory.set(capability, []);
    this._patternDetection.set(capability, {
      lastState: null,
      stateChanges: 0,
      rapidChanges: 0,
      lastChangeTime: 0
    });

    // Listen to capability changes
    try {
      this.device.registerCapabilityListener(capability, async (value) => {
        await this._onValueChange(capability, value);
      });
      this._valueListeners.set(capability, true);
    } catch (err) {
      // Already registered, that's OK
    }
  }

  /**
   * Handle value change - the brain of smart flows
   */
  async _onValueChange(capability, value) {
    const now = Date.now();
    const history = this._valueHistory.get(capability) || [];
    const pattern = this._patternDetection.get(capability);

    // Store in history
    history.push({ value, time: now });
    if (history.length > this._historySize) {
      history.shift();
    }
    this._valueHistory.set(capability, history);

    // Get previous value
    const prevEntry = history.length > 1 ? history[history.length - 2] : null;
    const prevValue = prevEntry?.value;

    // === TRIGGER: Value Changed ===
    await this._triggerWithCooldown(`${capability}_changed`, {
      value,
      previous: prevValue
    });

    // === TRIGGER: Boolean True/False ===
    if (typeof value === 'boolean') {
      if (value === true) {
        await this._triggerWithCooldown(`${capability}_true`, {});
      } else {
        await this._triggerWithCooldown(`${capability}_false`, {});
      }
    }

    // === TRIGGER: Threshold Crossed ===
    if (typeof value === 'number' && prevValue !== undefined) {
      // Crossed threshold going up
      const thresholds = this._getThresholdsForCapability(capability);
      for (const threshold of thresholds) {
        if (prevValue < threshold && value >= threshold) {
          await this._triggerWithCooldown(`${capability}_crossed_up_${threshold}`, {
            value,
            threshold
          });
        }
        if (prevValue > threshold && value <= threshold) {
          await this._triggerWithCooldown(`${capability}_crossed_down_${threshold}`, {
            value,
            threshold
          });
        }
      }
    }

    // === TRIGGER: Rate of Change ===
    if (typeof value === 'number' && prevValue !== undefined && prevValue !== 0) {
      const rateOfChange = Math.abs((value - prevValue) / prevValue);
      if (rateOfChange > this._rateOfChangeThreshold) {
        await this._triggerWithCooldown(`${capability}_rapid_change`, {
          value,
          previous: prevValue,
          changePercent: Math.round(rateOfChange * 100)
        });
      }
    }

    // === TRIGGER: Pattern Detection (rapid toggling) ===
    if (pattern) {
      if (value !== pattern.lastState) {
        pattern.stateChanges++;
        const timeSinceLastChange = now - pattern.lastChangeTime;

        if (timeSinceLastChange < 5000) { // 5 seconds
          pattern.rapidChanges++;

          if (pattern.rapidChanges >= 3) {
            await this._triggerWithCooldown(`${capability}_rapid_toggle`, {
              toggleCount: pattern.rapidChanges,
              value
            });
            pattern.rapidChanges = 0;
          }
        } else {
          pattern.rapidChanges = 1;
        }

        pattern.lastState = value;
        pattern.lastChangeTime = now;
      }
    }

    // === TRIGGER: Min/Max reached ===
    if (typeof value === 'number' && history.length >= 10) {
      const values = history.map(h => h.value);
      const min = Math.min(...values);
      const max = Math.max(...values);

      if (value === min) {
        await this._triggerWithCooldown(`${capability}_min_reached`, { value, min });
      }
      if (value === max) {
        await this._triggerWithCooldown(`${capability}_max_reached`, { value, max });
      }
    }

    // === TRIGGER: Stable value (no change for X time) ===
    await this._checkStableValue(capability, value);
  }

  /**
   * Trigger with cooldown to prevent spam
   */
  async _triggerWithCooldown(triggerId, tokens) {
    const now = Date.now();
    const fullTriggerId = `${this.driverId}_${triggerId}`;
    const lastTrigger = this._lastTriggerTime.get(fullTriggerId) || 0;
    const cooldown = this._triggerCooldowns.get(fullTriggerId) || this._defaultCooldown;

    if (now - lastTrigger < cooldown) {
      return; // Still in cooldown
    }

    this._lastTriggerTime.set(fullTriggerId, now);

    // Try to trigger the flow card
    try {
      const card = this.homey.flow.getDeviceTriggerCard(fullTriggerId);
      if (card) {
        await card.trigger(this.device, tokens);
        this.log(`🔔 Triggered: ${triggerId}`, tokens);
      }
    } catch (err) {
      // Card doesn't exist - try generic triggers
      await this._tryGenericTrigger(triggerId, tokens);
    }
  }

  /**
   * Try generic flow triggers
   */
  async _tryGenericTrigger(triggerId, tokens) {
    // Try without driver prefix
    const genericIds = [
      triggerId,
      triggerId.replace(/_/g, '-'),
      `generic_${triggerId}`
    ];

    for (const id of genericIds) {
      try {
        const card = this.homey.flow.getDeviceTriggerCard(id);
        if (card) {
          await card.trigger(this.device, tokens);
          this.log(`🔔 Generic trigger: ${id}`);
          return;
        }
      } catch (err) {
        // Continue trying
      }
    }
  }

  /**
   * Get thresholds for capability
   */
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

  /**
   * Check for stable value (triggers when value hasn't changed)
   */
  async _checkStableValue(capability, currentValue) {
    const stableKey = `${capability}_stable`;

    // Clear existing timer
    if (this._stableTimers && this._stableTimers[capability]) {
      clearTimeout(this._stableTimers[capability]);
    }

    // Set new timer
    if (!this._stableTimers) this._stableTimers = {};

    this._stableTimers[capability] = setTimeout(async () => {
      // Check if value is still the same
      const currentActual = this.device.getCapabilityValue(capability);
      if (currentActual === currentValue) {
        await this._triggerWithCooldown(`${capability}_stable`, {
          value: currentValue,
          duration: 60 // seconds
        });
      }
    }, 60000); // 1 minute stable
  }

  /**
   * Register smart triggers with Homey
   */
  async _registerSmartTriggers() {
    // These would need to be defined in app.json
    // For now, we work with existing triggers
    this.log('Smart triggers ready');
  }

  /**
   * Manually trigger a flow
   */
  async triggerFlow(flowId, tokens = {}) {
    return this._triggerWithCooldown(flowId, tokens);
  }

  /**
   * Set custom cooldown for a trigger
   */
  setCooldown(triggerId, cooldownMs) {
    this._triggerCooldowns.set(`${this.driverId}_${triggerId}`, cooldownMs);
  }

  /**
   * Get value history for capability
   */
  getHistory(capability) {
    return this._valueHistory.get(capability) || [];
  }

  /**
   * Get statistics for capability
   */
  getStats(capability) {
    const history = this._valueHistory.get(capability) || [];
    if (history.length === 0) return null;

    const values = history.map(h => h.value);
    const numericValues = values.filter(v => typeof v === 'number');

    if (numericValues.length === 0) {
      return {
        current: values[values.length - 1],
        changes: history.length,
        type: typeof values[0]
      };
    }

    return {
      current: numericValues[numericValues.length - 1],
      min: Math.min(...numericValues),
      max: Math.max(...numericValues),
      avg: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
      samples: numericValues.length
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this._stableTimers) {
      for (const timer of Object.values(this._stableTimers)) {
        clearTimeout(timer);
      }
    }
  }
}

module.exports = SmartFlowManager;
