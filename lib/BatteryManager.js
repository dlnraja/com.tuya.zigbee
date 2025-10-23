'use strict';

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
      // Non-linear discharge curve (flatter then drops)
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
      // Linear-ish discharge for alkaline
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
   * Uses non-linear discharge curves specific to each battery type
   * @param {number} voltage - Battery voltage in volts
   * @param {string} batteryType - Type of battery (CR2032, AAA, etc.)
   * @returns {number} - Accurate battery percentage (0-100)
   */
  static calculatePercentageFromVoltage(voltage, batteryType = 'CR2032') {
    const specs = this.BATTERY_SPECS[batteryType];
    
    if (!specs) {
      console.warn(`Unknown battery type: ${batteryType}, using CR2032 as fallback`);
      return this.calculatePercentageFromVoltage(voltage, 'CR2032');
    }

    // Clamp voltage to valid range
    if (voltage > specs.fresh) voltage = specs.fresh;
    if (voltage < specs.dead) return 0;

    // Use discharge curve for accurate calculation
    const curve = specs.curve;
    
    // Find position in curve
    for (let i = 0; i < curve.length - 1; i++) {
      const high = curve[i];
      const low = curve[i + 1];
      
      if (voltage >= low.voltage && voltage <= high.voltage) {
        // Linear interpolation between curve points
        const voltageRange = high.voltage - low.voltage;
        const percentageRange = high.percentage - low.percentage;
        const voltageOffset = voltage - low.voltage;
        
        const percentage = low.percentage + (voltageOffset / voltageRange) * percentageRange;
        
        return Math.round(Math.max(0, Math.min(100, percentage)));
      }
    }

    // Voltage above all curve points
    if (voltage > curve[0].voltage) return 100;
    
    // Voltage below all curve points
    return 0;
  }

  /**
   * Validate and correct Zigbee battery percentage
   * Zigbee reports 0-200 (0-100% doubled)
   * Some devices report incorrectly, this fixes it
   * @param {number} rawValue - Raw Zigbee value
   * @param {number} voltage - Optional voltage for validation
   * @param {string} batteryType - Battery type
   * @returns {number} - Corrected percentage (0-100)
   */
  static validateAndCorrectPercentage(rawValue, voltage = null, batteryType = 'CR2032') {
    if (rawValue === null || rawValue === undefined) return null;

    let percentage;

    // Zigbee standard: 0-200 represents 0-100%
    if (rawValue <= 200) {
      percentage = Math.round(rawValue / 2);
    }
    // Some devices report 0-100 directly
    else if (rawValue <= 100) {
      percentage = rawValue;
    }
    // Invalid: too high, might be raw ADC value
    else if (rawValue > 200 && rawValue < 1000) {
      // Assume it's 0-255 scale
      percentage = Math.round((rawValue / 255) * 100);
    }
    // Very high value: probably millivolts or ADC
    else {
      // Try to interpret as millivolts
      const possibleVoltage = rawValue / 1000;
      percentage = this.calculatePercentageFromVoltage(possibleVoltage, batteryType);
    }

    // Clamp to 0-100
    percentage = Math.max(0, Math.min(100, percentage));

    // Cross-validate with voltage if available
    if (voltage !== null && voltage > 0) {
      const voltageBasedPercentage = this.calculatePercentageFromVoltage(voltage, batteryType);
      
      // If reported percentage differs significantly from voltage-based, use voltage
      const difference = Math.abs(percentage - voltageBasedPercentage);
      
      if (difference > 30) {
        // Large discrepancy - trust voltage more
        console.log(`Battery percentage mismatch: reported=${percentage}%, voltage-based=${voltageBasedPercentage}% (${voltage}V). Using voltage-based.`);
        percentage = voltageBasedPercentage;
      }
      else if (difference > 15) {
        // Moderate discrepancy - use weighted average favoring voltage
        percentage = Math.round(voltageBasedPercentage * 0.7 + percentage * 0.3);
      }
    }

    return percentage;
  }

  /**
   * Detect battery type from voltage reading
   * @param {number} voltage - Battery voltage in volts
   * @returns {string} - Most likely battery type
   */
  static detectBatteryTypeFromVoltage(voltage) {
    // Lithium coin cells (CR series): 2.0-3.3V
    if (voltage >= 2.0 && voltage <= 3.5) {
      if (voltage > 3.0) {
        // Fresh lithium cell
        return 'CR2032'; // Most common
      }
      return 'CR2032'; // Default for 3V range
    }
    
    // Alkaline (AA/AAA): 0.9-1.6V per cell
    if (voltage >= 0.9 && voltage <= 1.8) {
      return 'AAA'; // Single cell
    }
    
    // Multiple alkaline cells in series
    if (voltage >= 2.7 && voltage <= 5.0) {
      // 3x AAA/AA (4.5V nominal)
      return 'AAA';
    }

    // Default fallback
    return 'CR2032';
  }

  /**
   * Get battery health assessment
   * @param {number} percentage - Current percentage
   * @param {number} voltage - Current voltage
   * @param {string} batteryType - Battery type
   * @returns {Object} - Health assessment
   */
  static getBatteryHealth(percentage, voltage, batteryType = 'CR2032') {
    const specs = this.BATTERY_SPECS[batteryType] || this.BATTERY_SPECS['CR2032'];

    let health = 'unknown';
    let status = 'unknown';
    let recommendation = '';

    if (voltage >= specs.fresh * 0.95) {
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
   * @param {number} percentage - Current percentage
   * @param {number} averageConsumption - Average mA consumption
   * @param {string} batteryType - Battery type
   * @returns {Object} - Estimated days/hours remaining
   */
  static estimateRemainingLife(percentage, averageConsumption, batteryType = 'CR2032') {
    const specs = this.BATTERY_SPECS[batteryType] || this.BATTERY_SPECS['CR2032'];
    
    const remainingCapacity = (percentage / 100) * specs.capacity; // mAh
    
    if (averageConsumption <= 0) {
      return {
        days: null,
        hours: null,
        message: 'Cannot estimate without consumption data'
      };
    }

    const hoursRemaining = remainingCapacity / averageConsumption;
    const daysRemaining = hoursRemaining / 24;

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
   * @param {number} newPercentage - New reading
   * @param {number} oldPercentage - Previous reading
   * @param {number} maxChange - Maximum allowed change per reading
   * @returns {number} - Smoothed percentage
   */
  static smoothPercentage(newPercentage, oldPercentage, maxChange = 5) {
    if (oldPercentage === null || oldPercentage === undefined) {
      return newPercentage;
    }

    const difference = newPercentage - oldPercentage;

    // Allow large decreases (battery draining is real)
    if (difference < -maxChange) {
      // But not too sudden (might be error)
      if (difference < -20) {
        // Probably an error, smooth it
        return oldPercentage - maxChange;
      }
      return newPercentage;
    }

    // Don't allow sudden increases (battery doesn't charge in Zigbee devices)
    if (difference > maxChange) {
      // Probably a measurement error
      return oldPercentage + maxChange;
    }

    return newPercentage;
  }
}

module.exports = BatteryManager;
