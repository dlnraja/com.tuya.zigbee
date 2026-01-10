'use strict';

/**
 * EnergyManager - Comprehensive Energy Monitoring System
 *
 * Features:
 * - Power threshold alerts (high/low)
 * - Energy consumption tracking
 * - Cost calculation
 * - Daily/weekly/monthly statistics
 * - Power factor monitoring
 * - Overload protection
 *
 * @version 2.0.0
 * @author Dylan Rajasekaram
 */

class EnergyManager {
  constructor(device, options = {}) {
    this.device = device;
    this.homey = device.homey;

    // Configuration
    this.options = {
      // Thresholds
      highPowerThreshold: options.highPowerThreshold || 3000, // Watts
      lowPowerThreshold: options.lowPowerThreshold || 1, // Watts (standby detection)
      overloadThreshold: options.overloadThreshold || 3680, // 16A @ 230V

      // Voltage
      nominalVoltage: options.nominalVoltage || 230, // V
      voltageTolerancePercent: options.voltageTolerancePercent || 10, // %

      // Reporting intervals
      powerReportInterval: options.powerReportInterval || 60, // seconds
      energyReportInterval: options.energyReportInterval || 300, // seconds

      // Cost calculation
      energyCostPerKwh: options.energyCostPerKwh || 0.25, // EUR/kWh
      currency: options.currency || 'EUR',

      // Enable features
      enableCostTracking: options.enableCostTracking !== false,
      enableOverloadProtection: options.enableOverloadProtection !== false,
      enableStandbyDetection: options.enableStandbyDetection !== false,

      ...options
    };

    // State
    this.state = {
      currentPower: 0,
      currentVoltage: 0,
      currentCurrent: 0,
      totalEnergy: 0,
      powerFactor: 1,

      // Statistics
      peakPower: 0,
      peakPowerTime: null,
      minPower: Infinity,

      // Daily tracking
      dailyEnergy: 0,
      dailyStartEnergy: 0,
      dailyStartTime: new Date(),

      // Session tracking
      sessionEnergy: 0,
      sessionStartTime: new Date(),

      // Alerts
      lastOverloadAlert: null,
      lastHighPowerAlert: null,
      inStandbyMode: false,

      // History (last 24 hours, hourly)
      powerHistory: [],
      energyHistory: []
    };

    // Intervals
    this._reportingInterval = null;
    this._historyInterval = null;
  }

  /**
   * Initialize the energy manager
   */
  async initialize() {
    this.device.log('[EnergyManager] Initializing...');

    // Load saved state
    await this._loadState();

    // Start reporting
    this._startReporting();

    // Start history tracking
    this._startHistoryTracking();

    // Reset daily stats at midnight
    this._scheduleDailyReset();

    this.device.log('[EnergyManager] Initialized successfully');
    return this;
  }

  /**
   * Update power reading
   */
  async updatePower(power) {
    const previousPower = this.state.currentPower;
    this.state.currentPower = power;

    // Update peak/min
    if (power > this.state.peakPower) {
      this.state.peakPower = power;
      this.state.peakPowerTime = new Date();
    }
    if (power < this.state.minPower && power > 0) {
      this.state.minPower = power;
    }

    // Check thresholds
    await this._checkPowerThresholds(power, previousPower);

    // Update capability
    if (this.device.hasCapability('measure_power')) {
      await this.device.setCapabilityValue('measure_power', parseFloat(power)).catch(() => { });
    }

    return power;
  }

  /**
   * Update voltage reading
   */
  async updateVoltage(voltage) {
    this.state.currentVoltage = voltage;

    // Check voltage anomalies
    await this._checkVoltageAnomaly(voltage);

    // Update capability
    if (this.device.hasCapability('measure_voltage')) {
      await this.device.setCapabilityValue('measure_voltage', parseFloat(voltage)).catch(() => { });
    }

    return voltage;
  }

  /**
   * Update current reading
   */
  async updateCurrent(current) {
    this.state.currentCurrent = current;

    // Update capability
    if (this.device.hasCapability('measure_current')) {
      await this.device.setCapabilityValue('measure_current', parseFloat(current)).catch(() => { });
    }

    // Calculate power factor if we have all values
    if (this.state.currentVoltage > 0 && current > 0 && this.state.currentPower > 0) {
      const apparentPower = this.state.currentVoltage * current;
      this.state.powerFactor = Math.min(1, this.state.currentPower / apparentPower);
    }

    return current;
  }

  /**
   * Update energy (kWh) reading
   */
  async updateEnergy(energy) {
    const previousEnergy = this.state.totalEnergy;
    this.state.totalEnergy = energy;

    // Calculate delta
    const deltaEnergy = energy - previousEnergy;
    if (deltaEnergy > 0) {
      this.state.dailyEnergy += deltaEnergy;
      this.state.sessionEnergy += deltaEnergy;
    }

    // Update capability
    if (this.device.hasCapability('meter_power')) {
      await this.device.setCapabilityValue('meter_power', parseFloat(energy)).catch(() => { });
    }

    return energy;
  }

  /**
   * Check power thresholds and trigger alerts
   */
  async _checkPowerThresholds(power, previousPower) {
    const now = Date.now();

    // High power alert
    if (power >= this.options.highPowerThreshold && previousPower < this.options.highPowerThreshold) {
      if (!this.state.lastHighPowerAlert || now - this.state.lastHighPowerAlert > 60000) {
        this.state.lastHighPowerAlert = now;
        await this._triggerFlow('energy_high_power', { power });
        this.device.log(`[EnergyManager] High power alert: ${power}W`);
      }
    }

    // Overload protection
    if (this.options.enableOverloadProtection && power >= this.options.overloadThreshold) {
      if (!this.state.lastOverloadAlert || now - this.state.lastOverloadAlert > 30000) {
        this.state.lastOverloadAlert = now;
        await this._triggerFlow('energy_overload', { power });
        this.device.error(`[EnergyManager] OVERLOAD ALERT: ${power}W exceeds ${this.options.overloadThreshold}W`);
      }
    }

    // Standby detection
    if (this.options.enableStandbyDetection) {
      const wasInStandby = this.state.inStandbyMode;
      this.state.inStandbyMode = power < this.options.lowPowerThreshold;

      if (this.state.inStandbyMode && !wasInStandby) {
        await this._triggerFlow('energy_standby_entered', { power });
        this.device.log('[EnergyManager] Entered standby mode');
      } else if (!this.state.inStandbyMode && wasInStandby) {
        await this._triggerFlow('energy_standby_exited', { power });
        this.device.log('[EnergyManager] Exited standby mode');
      }
    }
  }

  /**
   * Check voltage anomalies
   */
  async _checkVoltageAnomaly(voltage) {
    const tolerance = this.options.nominalVoltage * (this.options.voltageTolerancePercent / 100);
    const lowThreshold = this.options.nominalVoltage - tolerance;
    const highThreshold = this.options.nominalVoltage + tolerance;

    if (voltage < lowThreshold) {
      await this._triggerFlow('energy_voltage_low', { voltage });
      this.device.log(`[EnergyManager] Low voltage: ${voltage}V`);
    } else if (voltage > highThreshold) {
      await this._triggerFlow('energy_voltage_high', { voltage });
      this.device.log(`[EnergyManager] High voltage: ${voltage}V`);
    }
  }

  /**
   * Trigger a flow card
   */
  async _triggerFlow(flowId, tokens = {}) {
    try {
      const flowCard = this.homey.flow.getDeviceTriggerCard(flowId);
      if (flowCard) {
        await flowCard.trigger(this.device, tokens);
      }
    } catch (err) {
      // Flow card may not exist
    }
  }

  /**
   * Get current statistics
   */
  getStatistics() {
    const sessionDuration = (Date.now() - this.state.sessionStartTime.getTime()) / 1000 / 3600; // hours
    const dailyDuration = (Date.now() - this.state.dailyStartTime.getTime()) / 1000 / 3600; // hours

    return {
      current: {
        power: this.state.currentPower,
        voltage: this.state.currentVoltage,
        current: this.state.currentCurrent,
        powerFactor: this.state.powerFactor
      },

      peaks: {
        peakPower: this.state.peakPower,
        peakPowerTime: this.state.peakPowerTime,
        minPower: this.state.minPower === Infinity ? 0 : this.state.minPower
      },

      energy: {
        total: this.state.totalEnergy,
        daily: this.state.dailyEnergy,
        session: this.state.sessionEnergy
      },

      averages: {
        dailyAvgPower: dailyDuration > 0 ? (this.state.dailyEnergy / dailyDuration) * 1000 : 0,
        sessionAvgPower: sessionDuration > 0 ? (this.state.sessionEnergy / sessionDuration) * 1000 : 0
      },

      cost: this.options.enableCostTracking ? {
        dailyCost: this.state.dailyEnergy * this.options.energyCostPerKwh,
        sessionCost: this.state.sessionEnergy * this.options.energyCostPerKwh,
        totalCost: this.state.totalEnergy * this.options.energyCostPerKwh,
        currency: this.options.currency
      } : null,

      status: {
        inStandby: this.state.inStandbyMode,
        overloadRisk: this.state.currentPower > (this.options.overloadThreshold * 0.8)
      }
    };
  }

  /**
   * Get formatted report
   */
  getReport() {
    const stats = this.getStatistics();
    return {
      summary: `Power: ${stats.current.power.toFixed(1)}W | Energy: ${stats.energy.total.toFixed(2)}kWh`,
      details: stats
    };
  }

  /**
   * Reset daily statistics
   */
  resetDailyStats() {
    this.state.dailyEnergy = 0;
    this.state.dailyStartEnergy = this.state.totalEnergy;
    this.state.dailyStartTime = new Date();
    this.state.peakPower = 0;
    this.state.peakPowerTime = null;
    this.state.minPower = Infinity;

    this.device.log('[EnergyManager] Daily stats reset');
  }

  /**
   * Reset session statistics
   */
  resetSessionStats() {
    this.state.sessionEnergy = 0;
    this.state.sessionStartTime = new Date();

    this.device.log('[EnergyManager] Session stats reset');
  }

  /**
   * Start periodic reporting
   */
  _startReporting() {
    this._reportingInterval = this.homey.setInterval(() => {
      this._saveState();
    }, this.options.energyReportInterval * 1000);
  }

  /**
   * Start history tracking
   */
  _startHistoryTracking() {
    this._historyInterval = this.homey.setInterval(() => {
      // Add to history (keep last 24 hours)
      this.state.powerHistory.push({
        time: Date.now(),
        power: this.state.currentPower
      });

      this.state.energyHistory.push({
        time: Date.now(),
        energy: this.state.totalEnergy
      });

      // Trim to 24 hours
      const cutoff = Date.now() - (24 * 60 * 60 * 1000);
      this.state.powerHistory = this.state.powerHistory.filter(h => h.time > cutoff);
      this.state.energyHistory = this.state.energyHistory.filter(h => h.time > cutoff);
    }, 3600000); // Every hour
  }

  /**
   * Schedule daily reset at midnight
   */
  _scheduleDailyReset() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);

    const msUntilMidnight = midnight.getTime() - now.getTime();

    this.homey.setTimeout(() => {
      this.resetDailyStats();
      // Schedule next reset
      this._scheduleDailyReset();
    }, msUntilMidnight);
  }

  /**
   * Save state to device store
   */
  async _saveState() {
    try {
      await this.device.setStoreValue('energyManagerState', {
        dailyEnergy: this.state.dailyEnergy,
        dailyStartEnergy: this.state.dailyStartEnergy,
        dailyStartTime: this.state.dailyStartTime.toISOString(),
        peakPower: this.state.peakPower,
        peakPowerTime: this.state.peakPowerTime?.toISOString()
      });
    } catch (err) {
      // Ignore save errors
    }
  }

  /**
   * Load state from device store
   */
  async _loadState() {
    try {
      const saved = await this.device.getStoreValue('energyManagerState');
      if (saved) {
        this.state.dailyEnergy = saved.dailyEnergy || 0;
        this.state.dailyStartEnergy = saved.dailyStartEnergy || 0;
        this.state.dailyStartTime = saved.dailyStartTime ? new Date(saved.dailyStartTime) : new Date();
        this.state.peakPower = saved.peakPower || 0;
        this.state.peakPowerTime = saved.peakPowerTime ? new Date(saved.peakPowerTime) : null;
      }
    } catch (err) {
      // Ignore load errors
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this._reportingInterval) {
      this.homey.clearInterval(this._reportingInterval);
    }
    if (this._historyInterval) {
      this.homey.clearInterval(this._historyInterval);
    }
    this._saveState();
  }
}

module.exports = EnergyManager;
