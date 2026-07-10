'use strict';

/**
 * Energy Meter Per-Phase - DEVICE #30
 *
 * Multi-phase energy monitoring for 3-phase Tuya energy meters.
 * Tracks per-phase voltage, current, power, power factor, and energy.
 *
 * Supports:
 * - Single phase, split-phase, and 3-phase configurations
 * - Per-phase power factor monitoring
 * - Phase imbalance detection
 * - Total power aggregation
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

class EnergyMeterPerPhase extends EventEmitter {
  constructor(device, options = {}) {
    super();
    this.device = device;
    this.phaseCount = options.phaseCount || 3;

    // DP mappings per phase
    this.dpMapping = options.dpMapping || {
      // Phase A
      VOLTAGE_A: 6,
      CURRENT_A: 7,
      POWER_A: 8,
      ENERGY_A: 9,
      POWER_FACTOR_A: 10,
      // Phase B
      VOLTAGE_B: 11,
      CURRENT_B: 12,
      POWER_B: 13,
      ENERGY_B: 14,
      POWER_FACTOR_B: 15,
      // Phase C
      VOLTAGE_C: 16,
      CURRENT_C: 17,
      POWER_C: 18,
      ENERGY_C: 19,
      POWER_FACTOR_C: 20,
      // Total
      TOTAL_POWER: 21,
      TOTAL_ENERGY: 22
    };

    // Phase state
    this.phases = {};
    for (let i = 0; i < this.phaseCount; i++) {
      const label = String.fromCharCode(65 + i); // A, B, C
      this.phases[label] = {
        label,
        voltage: 0,
        current: 0,
        power: 0,
        energy: 0,
        powerFactor: 1.0,
        lastUpdated: null
      };
    }

    // Imbalance detection
    this.imbalanceThreshold = options.imbalanceThreshold || 10; // % threshold
    this._lastImbalanceAlert = 0;
    this._imbalanceAlertCooldown = options.imbalanceAlertCooldown || 300000; // 5 minutes
  }

  /**
   * Handle a DP report for a specific phase measurement
   * @param {number} dpId
   * @param {number} value
   */
  handleDPReport(dpId, value) {
    const phaseMapping = this._getPhaseForDP(dpId);
    if (!phaseMapping) return;

    const { phase, field } = phaseMapping;
    if (!this.phases[phase]) return;

    const phaseData = this.phases[phase];
    const numValue = parseFloat(value);

    if (isNaN(numValue)) return;

    switch (field) {
    case 'voltage':
      phaseData.voltage = numValue;
      break;
    case 'current':
      phaseData.current = numValue;
      break;
    case 'power':
      phaseData.power = numValue;
      break;
    case 'energy':
      phaseData.energy = numValue;
      break;
    case 'powerFactor':
      phaseData.powerFactor = Math.max(0, Math.min(1, numValue));
      break;
    }

    phaseData.lastUpdated = Date.now();

    // Check for phase imbalance after power update
    if (field === 'power' || field === 'voltage') {
      this._checkImbalance();
    }

    this.emit('phaseUpdate', { phase, field, value: numValue, phaseData });
  }

  /**
   * Get per-phase readings
   * @returns {Object}
   */
  getPhaseReadings() {
    const result = {};

    for (const [label, data] of Object.entries(this.phases)) {
      result[label] = {
        voltage: data.voltage,
        current: data.current,
        power: data.power,
        energy: data.energy,
        powerFactor: data.powerFactor,
        apparentPower: data.voltage * data.current,
        lastUpdated: data.lastUpdated
      };
    }

    return result;
  }

  /**
   * Get total power across all phases
   * @returns {number} Total power in watts
   */
  getTotalPower() {
    let total = 0;
    for (const phase of Object.values(this.phases)) {
      total += phase.power;
    }
    return Math.round(total * 100) / 100;
  }

  /**
   * Get total energy across all phases
   * @returns {number} Total energy in kWh
   */
  getTotalEnergy() {
    let total = 0;
    for (const phase of Object.values(this.phases)) {
      total += phase.energy;
    }
    return Math.round(total * 1000) / 1000;
  }

  /**
   * Get average power factor across all phases
   * @returns {number}
   */
  getAveragePowerFactor() {
    let total = 0;
    let count = 0;
    for (const phase of Object.values(this.phases)) {
      if (phase.current > 0) {
        total += phase.powerFactor;
        count++;
      }
    }
    return count > 0 ? Math.round((total / count) * 100) / 100 : 1.0;
  }

  /**
   * Get full summary
   */
  getSummary() {
    return {
      phaseCount: this.phaseCount,
      phases: this.getPhaseReadings(),
      totals: {
        power: this.getTotalPower(),
        energy: this.getTotalEnergy(),
        averagePowerFactor: this.getAveragePowerFactor()
      },
      imbalance: this._getImbalanceInfo()
    };
  }

  /**
   * Check for voltage/power imbalance between phases
   */
  _checkImbalance() {
    const now = Date.now();
    if (now - this._lastImbalanceAlert < this._imbalanceAlertCooldown) return;

    const voltages = Object.values(this.phases)
      .filter(p => p.voltage > 0)
      .map(p => p.voltage);

    if (voltages.length < 2) return;

    const avg = voltages.reduce((a, b) => a + b, 0) / voltages.length;
    const maxDeviation = Math.max(...voltages.map(v => Math.abs(v - avg) / avg * 100));

    if (maxDeviation > this.imbalanceThreshold) {
      this._lastImbalanceAlert = now;
      this.emit('imbalanceDetected', {
        maxDeviationPercent: Math.round(maxDeviation * 10) / 10,
        avgVoltage: Math.round(avg),
        timestamp: now
      });
    }
  }

  _getImbalanceInfo() {
    const voltages = Object.values(this.phases)
      .filter(p => p.voltage > 0)
      .map(p => p.voltage);

    if (voltages.length < 2) return { detected: false };

    const avg = voltages.reduce((a, b) => a + b, 0) / voltages.length;
    const maxDeviation = Math.max(...voltages.map(v => Math.abs(v - avg) / avg * 100));

    return {
      detected: maxDeviation > this.imbalanceThreshold,
      maxDeviationPercent: Math.round(maxDeviation * 10) / 10,
      avgVoltage: Math.round(avg)
    };
  }

  _getPhaseForDP(dpId) {
    const mapping = Object.entries(this.dpMapping);
    for (const [key, dp] of mapping) {
      if (dp === dpId) {
        const match = key.match(/^(VOLTAGE|CURRENT|POWER|ENERGY|POWER_FACTOR)_([A-C])$/);
        if (match) {
          return { phase: match[2], field: match[1].toLowerCase() };
        }
        if (key === 'TOTAL_POWER') return { phase: '_total', field: 'power' };
        if (key === 'TOTAL_ENERGY') return { phase: '_total', field: 'energy' };
      }
    }
    return null;
  }
}

module.exports = EnergyMeterPerPhase;
