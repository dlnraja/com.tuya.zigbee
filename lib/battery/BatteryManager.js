'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../utils/MathUtils.js');

/**
 * BatteryManager - Intelligent Battery Management
 * Accurate calculations per battery type with voltage-based algorithms
 */

class BatteryManager {

  /**
   * Battery specifications with accurate voltage curves
   * Based on real-world discharge characteristics
   */
  static BATTERY_SPECS = {
    'CR2032': {
      type: 'Lithium Coin Cell',
      nominal: 3.0,
      fresh: 3.3,      // Brand new
      full: 3.0,       // 100%
      good: 2.8,       // 80%
      low: 2.5,        // 20%
      critical: 2.3,   // 10%
      dead: 2.0,       // 0%
      capacity: 220,   // mAh
      curve: [
        { voltage: 3.3, percentage: 100 },
        { voltage: 3.0, percentage: 95 },
        { voltage: 2.9, percentage: 85 },
        { voltage: 2.8, percentage: 70 },
        { voltage: 2.7, percentage: 50 },
        { voltage: 2.6, percentage: 30 },
        { voltage: 2.5, percentage: 20 },
        { voltage: 2.4, percentage: 10 },
        { voltage: 2.3, percentage: 5 },
        { voltage: 2.0, percentage: 0 }
      ]
    },
    'CR2450': {
      type: 'Lithium Coin Cell',
      nominal: 3.0,
      fresh: 3.3,
      full: 3.0,
      good: 2.8,
      low: 2.5,
      critical: 2.3,
      dead: 2.0,
      capacity: 620,   // mAh (higher than CR2032)
      curve: [
        { voltage: 3.3, percentage: 100 },
        { voltage: 3.0, percentage: 95 },
        { voltage: 2.9, percentage: 85 },
        { voltage: 2.8, percentage: 70 },
        { voltage: 2.7, percentage: 50 },
        { voltage: 2.6, percentage: 30 },
        { voltage: 2.5, percentage: 20 },
        { voltage: 2.4, percentage: 10 },
        { voltage: 2.3, percentage: 5 },
        { voltage: 2.0, percentage: 0 }
      ]
    },
    'CR123A': {
      type: 'Lithium Photo',
      nominal: 3.0,
      fresh: 3.3,
      full: 3.0,
      good: 2.8,
      low: 2.5,
      critical: 2.3,
      dead: 2.0,
      capacity: 1500,  // mAh
      curve: [
        { voltage: 3.3, percentage: 100 },
        { voltage: 3.1, percentage: 95 },
        { voltage: 3.0, percentage: 90 },
        { voltage: 2.9, percentage: 80 },
        { voltage: 2.8, percentage: 65 },
        { voltage: 2.7, percentage: 45 },
        { voltage: 2.6, percentage: 25 },
        { voltage: 2.5, percentage: 15 },
        { voltage: 2.4, percentage: 8 },
        { voltage: 2.3, percentage: 3 },
        { voltage: 2.0, percentage: 0 }
      ]
    },
    'AAA': {
      type: 'Alkaline',
      nominal: 1.5,
      fresh: 1.6,      // Brand new alkaline
      full: 1.5,       // 100%
      good: 1.35,      // 80%
      low: 1.2,        // 20%
      critical: 1.1,   // 10%
      dead: 0.9,       // 0%
      capacity: 1200,  // mAh (alkaline)
      curve: [
        { voltage: 1.6, percentage: 100 },
        { voltage: 1.5, percentage: 95 },
        { voltage: 1.45, percentage: 90 },
        { voltage: 1.4, percentage: 80 },
        { voltage: 1.35, percentage: 70 },
        { voltage: 1.3, percentage: 55 },
        { voltage: 1.25, percentage: 40 },
        { voltage: 1.2, percentage: 25 },
        { voltage: 1.15, percentage: 15 },
        { voltage: 1.1, percentage: 8 },
        { voltage: 1.0, percentage: 2 },
        { voltage: 0.9, percentage: 0 }
      ]
    },
    'AA': {
      type: 'Alkaline',
      nominal: 1.5,
      fresh: 1.6,
      full: 1.5,
      good: 1.35,
      low: 1.2,
      critical: 1.1,
      dead: 0.9,
      capacity: 2850,  // mAh (higher than AAA)
      curve: [
        { voltage: 1.6, percentage: 100 },
        { voltage: 1.5, percentage: 95 },
        { voltage: 1.45, percentage: 90 },
        { voltage: 1.4, percentage: 80 },
        { voltage: 1.35, percentage: 70 },
        { voltage: 1.3, percentage: 55 },
        { voltage: 1.25, percentage: 40 },
        { voltage: 1.2, percentage: 25 },
        { voltage: 1.15, percentage: 15 },
        { voltage: 1.1, percentage: 8 },
        { voltage: 1.0, percentage: 2 },
        { voltage: 0.9, percentage: 0 }
      ]
    }
  };

  /**
   * Calculate accurate battery percentage from voltage
   * @param {number} voltage - Battery voltage in volts
   * @param {string} batteryType - Type of battery (CR2032, AAA, etc.)
   * @returns {number} - Accurate battery percentage (0-100)
   */
  static calculatePercentageFromVoltage(voltage, batteryType = 'CR2032') {
    const specs = this.BATTERY_SPECS[batteryType] || this.BATTERY_SPECS['CR2032'];

    if (voltage > specs.fresh) voltage = specs.fresh;
    if (voltage < specs.dead) return 0;

    const curve = specs.curve;
    for (let i = 0; i < curve.length - 1; i++) {
      const high = curve[i];
      const low = curve[i + 1];

      if (voltage >= low.voltage && voltage <= high.voltage) {
        const voltageRange = high.voltage - low.voltage;
        const percentageRange = high.percentage - low.percentage;
        const voltageOffset = voltage - low.voltage;

        const percentage = low.percentage + safeMultiply(safeDivide(voltageOffset, voltageRange), percentageRange);
        return Math.round(Math.max(0, Math.min(100, percentage)));
      }
    }

    return voltage > curve[0].voltage ? 100 : 0;
  }

  calculatePercentageFromVoltage(voltage, batteryType = 'CR2032') {
    return BatteryManager.calculatePercentageFromVoltage(voltage, batteryType);
  }

  /**
   * Validate and correct Zigbee battery percentage
   */
  static validateAndCorrectPercentage(rawValue, voltage = null, batteryType = 'CR2032') {
    if (rawValue === null || rawValue === undefined) return null;

    let percentage;
    if (rawValue > 100 && rawValue <= 200) {
      percentage = safeDivide(rawValue, 2);
    }
    else if (rawValue >= 0 && rawValue <= 100) {
      percentage = rawValue;
    }
    else if (rawValue > 200 && rawValue < 1000) {
      percentage = Math.round(safeMultiply(safeDivide(rawValue, 255), 100));
    }
    else {
      const possibleVoltage = safeDivide(rawValue, 1000);
      percentage = this.calculatePercentageFromVoltage(possibleVoltage, batteryType);
    }

    percentage = Math.max(0, Math.min(100, percentage));

    if (voltage !== null && voltage > 0) {
      const voltageBasedPercentage = this.calculatePercentageFromVoltage(voltage, batteryType);
      const difference = Math.abs(percentage - voltageBasedPercentage);

      if (difference > 30) {
        percentage = voltageBasedPercentage;
      }
      else if (difference > 15) {
        percentage = safeMultiply(voltageBasedPercentage, 0.7) + safeMultiply(percentage, 0.3);
      }
    }

    return Math.round(percentage);
  }

  /**
   * Detect battery type from voltage reading
   */
  static detectBatteryTypeFromVoltage(voltage, driverId = '') {
    const d = (driverId || '').toLowerCase();
    if (d.includes('trv') || d.includes('radiator_valve') || d.includes('thermostat')) return 'AA';
    if (d.includes('lock')) return 'AAA';
    if (d.includes('siren')) return 'AA';
    if (d.includes('climate') || d.includes('soil')) return 'AAA';
    if (d.includes('smoke')) return 'CR123A';
    if (d.includes('button') || d.includes('remote') || d.includes('scene')) return 'CR2032';
    if (d.includes('contact') || d.includes('door') || d.includes('water') || d.includes('leak')) return 'CR2032';
    if (d.includes('motion') || d.includes('pir')) return 'CR2450';

    if (voltage > 3.5) return 'Li-ion';
    if (voltage >= 0.9 && voltage <= 1.8) return 'AAA';
    if (voltage >= 2.0 && voltage <= 3.5) return 'CR2032';

    return 'CR2032';
  }

  /**
   * Get battery health assessment
   */
  static getBatteryHealth(percentage, voltage, batteryType = 'CR2032') {
    const specs = this.BATTERY_SPECS[batteryType] || this.BATTERY_SPECS['CR2032'];

    let health = 'unknown';
    let status = 'unknown';
    let recommendation = '';

    if (voltage >= safeMultiply(specs.fresh, 0.95)) {
      health = 'excellent';
      status = 'new';
      recommendation = 'Battery is fresh';
    }
    else if (voltage >= specs.good) {
      health = 'good';
      status = 'healthy';
      recommendation = 'Battery is in good condition';
    }
    else if (voltage >= specs.low) {
      health = 'fair';
      status = 'aging';
      recommendation = 'Consider replacing battery soon';
    }
    else if (voltage >= specs.critical) {
      health = 'poor';
      status = 'low';
      recommendation = 'Replace battery immediately';
    }
    else {
      health = 'critical';
      status = 'critical';
      recommendation = 'Battery dead or nearly dead';
    }

    return {
      health,
      status,
      recommendation,
      voltage,
      percentage,
      batteryType,
      specs: {
        nominal: specs.nominal,
        capacity: specs.capacity,
        type: specs.type
      }
    };
  }

  /**
   * Calculate estimated battery life remaining
   */
  static estimateRemainingLife(percentage, averageConsumption, batteryType = 'CR2032') {
    const specs = this.BATTERY_SPECS[batteryType] || this.BATTERY_SPECS['CR2032'];
    const remainingCapacity = safeMultiply(safeDivide(percentage, 100), specs.capacity); // mAh

    if (averageConsumption <= 0) {
      return { message: 'Cannot estimate without consumption data' };
    }

    const hoursRemaining = safeDivide(remainingCapacity, averageConsumption);
    const daysRemaining = safeDivide(hoursRemaining, 24);

    return {
      days: Math.round(daysRemaining),
      hours: Math.round(hoursRemaining),
      message: daysRemaining > 1
        ? `Approximately ${Math.round(daysRemaining)} days remaining`
        : `Approximately ${Math.round(hoursRemaining)} hours remaining`
    };
  }

  /**
   * Smooth battery percentage to avoid jumps
   */
  static smoothPercentage(newPercentage, oldPercentage, maxChange = 5) {
    if (oldPercentage === null || oldPercentage === undefined) return newPercentage;
    const difference = newPercentage - oldPercentage;
    if (difference < -maxChange) {
      return difference < -20 ? oldPercentage - maxChange : newPercentage;
    }
    if (difference > maxChange) return oldPercentage + maxChange;
    return newPercentage;
  }
}

module.exports = BatteryManager;
