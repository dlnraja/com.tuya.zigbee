'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      VIRTUAL TELEMETRY COMPENSATION & ADAPTATION ENGINE - v5.6.1            ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  Intelligent software-level hardware compensation & anti-spam adaptation     ║
 * ║  Gathers, validates, smoothes, and emulates telemetry data when physical     ║
 * ║  sensors are missing, buggy, partial, or incoherent.                         ║
 * ║                                                                              ║
 * ║  FEATURES:                                                                   ║
 * ║  - Virtual Power Emulation (nominal load / dim ratio when on)                ║
 * ║  - Virtual Energy Integration (calculating kWh from active state over time)  ║
 * ║  - Telemetry Validation & Despiking (ignores erratic readings)               ║
 * ║  - Anti-Spam Gating & Cooldowns (prevents rapid capability flip-flops)       ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

class VirtualTelemetryCompensationEngine {
  constructor(device) {
    this.device = device;
    this.homey = device.homey;
    this._destroyed = false;

    this.log = (...args) => {
      if (!this._destroyed) device.log('[V-COMPENSATE]', ...args);
    };
    this.error = (...args) => {
      if (!this._destroyed) device.error('[V-COMPENSATE]', ...args);
    };

    // Telemetry tracking state
    this._state = {
      virtualPowerEnabled: false,
      virtualEnergyEnabled: false,
      lastPowerValue: 0,
      lastEnergyValue: 0,
      lastIntegrationTime: Date.now(),
      integratedEnergyAccumulator: 0, // In kWh
      consecutiveZeroPowerCount: 0,
      telemetryHistory: new Map(), // capability -> array of recent samples
    };

    // Safe Adaptation Listening State (Anti-Spam)
    this._adaptationGating = {
      cooldowns: new Map(), // capability -> timestamp of last change
      observations: new Map(), // capability -> { count, lastAction, firstSeen }
      globalLastChangeTime: 0,
    };

    // Cooldown and Epoch configurations
    this.CONFIG = {
      MIN_OBSERVATION_EPOCH_MS: 10 * 60 * 1000, // 10 minutes observation window
      MIN_OBSERVATION_COUNT: 5,                  // Must see 5 consecutive matching reports
      CAPABILITY_COOLDOWN_MS: 24 * 60 * 60 * 1000, // 24 hours cooldown per capability change
      GLOBAL_COOLDOWN_MS: 60 * 1000,             // 1 minute cooldown between any UI changes
      MAX_HEURISTIC_POWER_WATT: 10000,           // Filter out impossible power spikes
      DEFAULT_NOMINAL_POWER: {
        switch: 10,       // 10W default estimated load
        outlet: 15,       // 15W default
        light: 8,         // 8W LED default
        other: 5,
      }
    };

    this._integrationInterval = null;
  }

  /**
   * Initialize the engine
   */
  async initialize() {
    this.log('Initializing compensation engine...');

    try {
      // Restore state from device store
      const stored = await this.device.getStoreValue('v_telemetry_store') || {};
      if (stored.integratedEnergyAccumulator !== undefined) {
        this._state.integratedEnergyAccumulator = stored.integratedEnergyAccumulator;
      }
      if (stored.adaptationObservations) {
        this._adaptationGating.observations = new Map(Object.entries(stored.adaptationObservations));
      }
      if (stored.adaptationCooldowns) {
        this._adaptationGating.cooldowns = new Map(Object.entries(stored.adaptationCooldowns));
      }
      this._state.lastIntegrationTime = Date.now();
    } catch (err) {
      this.error('Failed to restore store state:', err.message);
    }

    // Determine if virtual power should be activated based on settings
    this.evaluateEmulationSettings();

    // Start energy integration daemon (runs every 10 seconds)
    this._startEnergyIntegration();

    this.log('✅ Compensation engine initialized');
  }

  /**
   * Re-evaluates if virtual power/energy should be active
   */
  evaluateEmulationSettings() {
    const hasPhysicalPower = this.device.hasCapability('measure_power');
    const emulationSetting = this.device.getSetting('virtual_power_emulation') || 'auto'; // 'active', 'disabled', 'auto'

    if (emulationSetting === 'active') {
      this._state.virtualPowerEnabled = true;
      this.log('🔌 Virtual power emulation forced ACTIVE');
    } else if (emulationSetting === 'disabled') {
      this._state.virtualPowerEnabled = false;
      this.log('🔌 Virtual power emulation DISABLED');
    } else {
      // 'auto' mode: active if device has no physical power monitoring but is a switch/light
      const isPowerControllable = this.device.hasCapability('onoff') || this.device.hasCapability('dim');
      this._state.virtualPowerEnabled = !hasPhysicalPower && isPowerControllable;
      if (this._state.virtualPowerEnabled) {
        this.log('🔌 Virtual power emulation AUTO-ACTIVATED (no physical measure_power capability found)');
      }
    }

    // Virtual Energy calculation is active if virtual power is enabled or physical energy is missing
    const hasPhysicalEnergy = this.device.hasCapability('meter_power');
    this._state.virtualEnergyEnabled = this._state.virtualPowerEnabled || !hasPhysicalEnergy;
  }

  /**
   * Processes raw telemetry, detecting spikes, dropouts, and applying software smoothing
   * @param {string} capability - Homey capability ID
   * @param {number} value - Raw value
   * @returns {Object} { validatedValue, isEstimated, isSuspicious }
   */
  processTelemetry(capability, value) {
    if (typeof value !== 'number') return { validatedValue: value, isEstimated: false, isSuspicious: false };

    // Get history for capability
    if (!this._state.telemetryHistory.has(capability)) {
      this._state.telemetryHistory.set(capability, []);
    }
    const history = this._state.telemetryHistory.get(capability);

    // Track sample
    history.push({ value, ts: Date.now() });
    if (history.length > 20) history.shift();

    let validatedValue = value;
    let isSuspicious = false;
    let isEstimated = false;

    // 1. Spiking Filter (Despiking heuristic)
    if (capability === 'measure_power') {
      if (value > this.CONFIG.MAX_HEURISTIC_POWER_WATT) {
        this.log(`⚠️ Suspicious power spike detected: ${value} W - suppressing`);
        isSuspicious = true;
        // Fallback to average or last valid value
        validatedValue = this._getLastValidValue(capability) || 0;
      }

      // 2. Hardware Freeze/Incoherence Detection
      // If power remains exactly 0 while the state is ON, it is incoherent!
      const isOn = this.device.hasCapability('onoff') ? this.device.getCapabilityValue('onoff') : false;
      if (isOn && value === 0) {
        this._state.consecutiveZeroPowerCount++;
        if (this._state.consecutiveZeroPowerCount >= 5) {
          isSuspicious = true;
          isEstimated = true;
          // Compensate using virtual calculation
          validatedValue = this.calculateNominalPowerEstimate();
          this.log(`⚠️ Physical power frozen at 0W while active. Software compensation applied: ${validatedValue}W`);
        }
      } else {
        this._state.consecutiveZeroPowerCount = 0;
      }
    }

    // Keep state updated
    if (capability === 'measure_power') {
      this._state.lastPowerValue = validatedValue;
    } else if (capability === 'meter_power') {
      this._state.lastEnergyValue = validatedValue;
    }

    return { validatedValue, isEstimated, isSuspicious };
  }

  /**
   * Performs virtual power emulation based on active state and load profiles
   * Called whenever onoff state or dim value changes.
   */
  async updateEmulatedPower() {
    if (!this._state.virtualPowerEnabled) return;

    try {
      const isOn = this.device.hasCapability('onoff') ? this.device.getCapabilityValue('onoff') : false;
      let power = 0;

      if (isOn) {
        const nominalLoad = this.calculateNominalPowerEstimate();
        const dimRatio = this.device.hasCapability('dim') ? (this.device.getCapabilityValue('dim') || 1) : 1;
        power = parseFloat((nominalLoad * dimRatio).toFixed(2));
      }

      this._state.lastPowerValue = power;

      // Safe update capability
      if (this.device.hasCapability('measure_power')) {
        await this.device.setCapabilityValue('measure_power', power);
        this.log(`🔌 Virtual Power updated: ${power} W (Emulated)`);
      }
    } catch (err) {
      this.error('Failed to update emulated power:', err.message);
    }
  }

  /**
   * Calculates the nominal power estimate based on settings or defaults
   */
  calculateNominalPowerEstimate() {
    // Check if user set a custom load setting
    const customLoad = this.device.getSetting('virtual_load_watt');
    if (customLoad !== undefined && customLoad > 0) {
      return customLoad;
    }

    // Otherwise use default profile based on class
    const deviceClass = this.device.getClass() || 'other';
    return this.CONFIG.DEFAULT_NOMINAL_POWER[deviceClass] || this.CONFIG.DEFAULT_NOMINAL_POWER.other;
  }

  /**
   * Starts the software energy integration daemon
   */
  _startEnergyIntegration() {
    if (this._integrationInterval) {
      clearInterval(this._integrationInterval);
    }

    // Integrate power every 10 seconds
    this._integrationInterval = setInterval(async () => {
      await this.integrateEnergy();
    }, 10000);
  }

  /**
   * Integration logic: integrates power over time to calculate simulated meter_power
   */
  async integrateEnergy() {
    if (this._destroyed) return;

    try {
      const now = Date.now();
      const dtMs = now - this._state.lastIntegrationTime;
      this._state.lastIntegrationTime = now;

      if (dtMs <= 0) return;

      // Emulate or retrieve power W
      let currentPower = 0;
      if (this._state.virtualPowerEnabled) {
        currentPower = this._state.lastPowerValue;
      } else if (this.device.hasCapability('measure_power')) {
        currentPower = this.device.getCapabilityValue('measure_power') || 0;
      }

      // Accumulate energy: kWh = (Watts * ms) / (3600000 * 1000)
      const additionalKwh = (currentPower * dtMs) / 3600000000;
      this._state.integratedEnergyAccumulator += additionalKwh;

      // Update Homey capability if virtual energy calculation is active
      if (this._state.virtualEnergyEnabled && this.device.hasCapability('meter_power')) {
        const physicalEnergy = this.device.getCapabilityValue('meter_power') || 0;
        
        // Either overwrite or add depending on mapping strategy
        const finalEnergy = parseFloat((physicalEnergy + additionalKwh).toFixed(4));
        await this.device.setCapabilityValue('meter_power', finalEnergy);
      }

      // Save state periodically to persist energy accumulation
      await this._saveState();
    } catch (err) {
      // Silent error or retry
    }
  }

  /**
   * Retrieves the last non-suspicious value from history
   */
  _getLastValidValue(capability) {
    const history = this._state.telemetryHistory.get(capability);
    if (!history || history.length === 0) return null;

    for (let i = history.length - 1; i >= 0; i--) {
      if (capability === 'measure_power' && history[i].value <= this.CONFIG.MAX_HEURISTIC_POWER_WATT) {
        return history[i].value;
      }
    }
    return null;
  }

  /**
   * ANTI-SPAM ADAPTATION GATING & SAFE LISTENING
   * Decides if a dynamic capability adjustment is allowed to be applied to the device.
   * 
   * Strategy:
   * 1. Check if the capability change is in Cooldown (no more than once per 24 hours).
   * 2. Increment observation counts over an Epoch. Requires at least 5 matches and a 10-minute window.
   * 3. Prevents consecutive UI changes within 1 minute of each other to avoid layout fluttering.
   * 
   * @param {string} capability - Homey capability ID
   * @param {string} action - 'ADD' or 'REMOVE'
   * @returns {boolean} True if safe and authorized to execute, False if gated
   */
  gateAdaptation(capability, action) {
    const now = Date.now();

    // 1. Enforce global safety cooldown between any UI changes to prevent layout flickering
    if (now - this._adaptationGating.globalLastChangeTime < this.CONFIG.GLOBAL_COOLDOWN_MS) {
      this.log(`🛑 [GATE] Gated: global UI update cooldown active (${Math.round((this.CONFIG.GLOBAL_COOLDOWN_MS - (now - this._adaptationGating.globalLastChangeTime)) / 1000)}s remaining)`);
      return false;
    }

    // 2. Enforce individual capability cooldown
    const lastChange = this._adaptationGating.cooldowns.get(capability) || 0;
    if (now - lastChange < this.CONFIG.CAPABILITY_COOLDOWN_MS) {
      this.log(`🛑 [GATE] Gated: capability ${capability} is in cooldown (expires in ${Math.round((this.CONFIG.CAPABILITY_COOLDOWN_MS - (now - lastChange)) / 3600000)} hours)`);
      return false;
    }

    // 3. Track observation confidence over a sliding window
    if (!this._adaptationGating.observations.has(capability)) {
      this._adaptationGating.observations.set(capability, {
        count: 0,
        lastAction: action,
        firstSeen: now,
      });
    }

    const obs = this._adaptationGating.observations.get(capability);

    // If direction changed, reset observation stats
    if (obs.lastAction !== action) {
      obs.count = 1;
      obs.lastAction = action;
      obs.firstSeen = now;
      this.log(`ℹ️ [GATE] State shift detected for ${capability} -> action changed to ${action}. Resetting observation window.`);
      this._saveState().catch(() => {});
      return false;
    }

    obs.count++;
    const epochDuration = now - obs.firstSeen;

    this.log(`📊 [GATE] Observing ${capability} for ${action}: consecutive=${obs.count}/${this.CONFIG.MIN_OBSERVATION_COUNT}, time=${Math.round(epochDuration / 1000)}s/${this.CONFIG.MIN_OBSERVATION_EPOCH_MS / 1000}s`);

    // Verify if observations meet both count and epoch duration thresholds
    const isCountMet = obs.count >= this.CONFIG.MIN_OBSERVATION_COUNT;
    const isEpochMet = epochDuration >= this.CONFIG.MIN_OBSERVATION_EPOCH_MS;

    if (!isCountMet || !isEpochMet) {
      this._saveState().catch(() => {});
      return false;
    }

    // Gating check passed!
    this.log(`🟢 [GATE] Gating PASSED for ${capability} (${action}). Proceeding with modification.`);

    // Record change to update cooldowns
    this._adaptationGating.cooldowns.set(capability, now);
    this._adaptationGating.globalLastChangeTime = now;
    
    // Reset observation stats after successful authorization
    this._adaptationGating.observations.delete(capability);

    this._saveState().catch(() => {});
    return true;
  }

  /**
   * Persists tracking and gating data to the device store
   */
  async _saveState() {
    if (this._destroyed) return;

    try {
      await this.device.setStoreValue('v_telemetry_store', {
        integratedEnergyAccumulator: this._state.integratedEnergyAccumulator,
        adaptationObservations: Object.fromEntries(this._adaptationGating.observations),
        adaptationCooldowns: Object.fromEntries(this._adaptationGating.cooldowns),
        savedAt: Date.now(),
      });
    } catch (err) {
      // Silent error or ignore during shutdown
    }
  }

  /**
   * Destroys the engine and clears any intervals or timers
   */
  destroy() {
    this._destroyed = true;
    if (this._integrationInterval) {
      clearInterval(this._integrationInterval);
      this._integrationInterval = null;
    }
  }
}

module.exports = VirtualTelemetryCompensationEngine;
