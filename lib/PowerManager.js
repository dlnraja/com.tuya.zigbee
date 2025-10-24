'use strict';

/**
 * PowerManager - Intelligent AC/DC Power Management
 * Handles power measurements, estimations, and dynamic capability management
 */

class PowerManager {
  
  /**
   * Power specifications by device class
   * Typical consumption values for estimation
   */
  static DEVICE_POWER_SPECS = {
    'light': {
      types: {
        'bulb': { min: 5, typical: 9, max: 15, unit: 'W' },
        'bulb_rgb': { min: 7, typical: 12, max: 20, unit: 'W' },
        'bulb_tunable': { min: 6, typical: 10, max: 15, unit: 'W' },
        'led_strip': { min: 10, typical: 20, max: 30, unit: 'W' },
        'spot': { min: 4, typical: 7, max: 12, unit: 'W' }
      },
      // Power varies with dim level
      dimFactor: true
    },
    'socket': {
      types: {
        'basic': { min: 0, typical: 0, max: 3680, unit: 'W', passthrough: true },
        'dimmer': { min: 0, typical: 0, max: 400, unit: 'W', passthrough: true },
        'usb': { min: 5, typical: 10, max: 18, unit: 'W' }
      }
    },
    'switch': {
      types: {
        'relay': { min: 0.5, typical: 1, max: 2, unit: 'W' },
        'smart': { min: 0.5, typical: 1.5, max: 3, unit: 'W' }
      }
    },
    'sensor': {
      types: {
        'basic': { min: 0.1, typical: 0.5, max: 1, unit: 'W' },
        'advanced': { min: 0.2, typical: 1, max: 2, unit: 'W' }
      }
    },
    'thermostat': {
      types: {
        'valve': { min: 0.5, typical: 2, max: 5, unit: 'W' },
        'controller': { min: 1, typical: 3, max: 8, unit: 'W' }
      }
    },
    'curtain': {
      types: {
        'motor': { min: 10, typical: 20, max: 40, unit: 'W', onlyWhenMoving: true }
      }
    },
    'fan': {
      types: {
        'ceiling': { min: 5, typical: 25, max: 75, unit: 'W' },
        'basic': { min: 3, typical: 15, max: 50, unit: 'W' }
      }
    },
    'heater': {
      types: {
        'basic': { min: 500, typical: 1500, max: 2000, unit: 'W' },
        'oil': { min: 800, typical: 1500, max: 2500, unit: 'W' }
      }
    }
  };

  /**
   * AC/DC power calculation capabilities
   */
  static POWER_CAPABILITIES = {
    // Voltage capabilities
    'measure_voltage': {
      cluster: 0x0B04, // electricalMeasurement
      attribute: 'rmsVoltage',
      divisor: 10,
      unit: 'V',
      typical: { ac: 230, dc: 12 }
    },
    
    // Current capabilities
    'measure_current': {
      cluster: 0x0B04,
      attribute: 'rmsCurrent',
      divisor: 1000,
      unit: 'A',
      calculated: true
    },
    
    // Power capabilities
    'measure_power': {
      cluster: 0x0B04,
      attribute: 'activePower',
      divisor: 1,
      unit: 'W',
      canEstimate: true
    },
    
    // Energy capabilities
    'meter_power': {
      cluster: 0x0702, // metering
      attribute: 'currentSummationDelivered',
      divisor: 1000,
      unit: 'kWh',
      cumulative: true
    }
  };

  /**
   * Detect available power measurement capabilities
   * @param {Object} zclNode - ZigBee node
   * @returns {Object} - Available capabilities
   */
  static async detectPowerCapabilities(zclNode) {
    const available = {
      voltage: false,
      current: false,
      power: false,
      energy: false
    };

    try {
      // Check for electrical measurement cluster
      const electricalCluster = zclNode.endpoints[1]?.clusters?.electricalMeasurement;
      
      if (electricalCluster) {
        // Try to read voltage
        try {
          const voltage = await electricalCluster.readAttributes(['rmsVoltage']);
          if (voltage?.rmsVoltage !== null && voltage?.rmsVoltage !== undefined) {
            available.voltage = true;
          }
        } catch (err) {
          // Not available
        }

        // Try to read current
        try {
          const current = await electricalCluster.readAttributes(['rmsCurrent']);
          if (current?.rmsCurrent !== null && current?.rmsCurrent !== undefined) {
            available.current = true;
          }
        } catch (err) {
          // Not available
        }

        // Try to read power
        try {
          const power = await electricalCluster.readAttributes(['activePower']);
          if (power?.activePower !== null && power?.activePower !== undefined) {
            available.power = true;
          }
        } catch (err) {
          // Not available
        }
      }

      // Check for metering cluster (energy)
      const meteringCluster = zclNode.endpoints[1]?.clusters?.metering;
      
      if (meteringCluster) {
        try {
          const energy = await meteringCluster.readAttributes(['currentSummationDelivered']);
          if (energy?.currentSummationDelivered !== null) {
            available.energy = true;
          }
        } catch (err) {
          // Not available
        }
      }

    } catch (err) {
      console.error('Power capability detection failed:', err.message);
    }

    return available;
  }

  /**
   * Estimate power consumption based on device type and state
   * @param {string} deviceClass - Device class (light, socket, etc.)
   * @param {string} deviceType - Specific type (bulb, relay, etc.)
   * @param {Object} state - Current device state
   * @returns {number} - Estimated power in watts
   */
  static estimatePower(deviceClass, deviceType, state = {}) {
    const classSpecs = this.DEVICE_POWER_SPECS[deviceClass];
    
    if (!classSpecs) {
      return null; // Cannot estimate
    }

    const typeSpecs = classSpecs.types[deviceType];
    
    if (!typeSpecs) {
      // Try first available type
      const firstType = Object.values(classSpecs.types)[0];
      if (!firstType) return null;
      return this.estimatePower(deviceClass, Object.keys(classSpecs.types)[0], state);
    }

    // Device is OFF
    if (state.onoff === false) {
      // Standby power (typically 0.5W)
      return 0.5;
    }

    // Passthrough devices (sockets) - use connected load if known
    if (typeSpecs.passthrough) {
      // If we have actual measurement, use it
      if (state.measure_power !== null && state.measure_power !== undefined) {
        return state.measure_power;
      }
      // Cannot estimate passthrough without measurement
      return null;
    }

    // Only when moving (curtains)
    if (typeSpecs.onlyWhenMoving) {
      if (state.moving === true) {
        return typeSpecs.typical;
      }
      return 1; // Standby
    }

    let estimatedPower = typeSpecs.typical;

    // Apply dim level for lights
    if (classSpecs.dimFactor && state.dim !== null && state.dim !== undefined) {
      // Non-linear: LED efficiency changes with dim level
      // At 50% dim ≈ 35% power (more efficient at lower levels)
      const dimFactor = state.dim;
      const efficiencyFactor = 0.5 + (dimFactor * 0.5); // 50-100% efficiency
      estimatedPower = typeSpecs.min + ((typeSpecs.typical - typeSpecs.min) * dimFactor * efficiencyFactor);
    }

    return Math.round(estimatedPower * 10) / 10; // Round to 1 decimal
  }

  /**
   * Calculate power from voltage and current
   * @param {number} voltage - Voltage in V
   * @param {number} current - Current in A
   * @returns {number} - Power in W
   */
  static calculatePower(voltage, current) {
    if (!voltage || !current) return null;
    return Math.round(voltage * current * 10) / 10;
  }

  /**
   * Calculate current from power and voltage
   * @param {number} power - Power in W
   * @param {number} voltage - Voltage in V
   * @returns {number} - Current in A
   */
  static calculateCurrent(power, voltage) {
    if (!power || !voltage) return null;
    return Math.round((power / voltage) * 1000) / 1000; // mA precision
  }

  /**
   * Detect if voltage is AC or DC
   * @param {number} voltage - Voltage value
   * @returns {string} - 'AC' or 'DC'
   */
  static detectPowerType(voltage) {
    if (voltage >= 85 && voltage <= 265) {
      return 'AC'; // Mains power (100-240V AC)
    }
    if (voltage >= 3 && voltage <= 48) {
      return 'DC'; // Low voltage DC (5V, 12V, 24V, 48V)
    }
    return 'UNKNOWN';
  }

  /**
   * Validate and correct power readings
   * @param {Object} readings - Raw power readings
   * @returns {Object} - Validated readings
   */
  static validatePowerReadings(readings) {
    const validated = {
      voltage: null,
      current: null,
      power: null,
      valid: false
    };

    // Validate voltage
    if (readings.voltage !== null && readings.voltage !== undefined) {
      if (readings.voltage > 0 && readings.voltage < 500) {
        validated.voltage = Math.round(readings.voltage * 10) / 10;
      }
    }

    // Validate current
    if (readings.current !== null && readings.current !== undefined) {
      if (readings.current >= 0 && readings.current < 100) {
        validated.current = Math.round(readings.current * 1000) / 1000;
      }
    }

    // Validate power
    if (readings.power !== null && readings.power !== undefined) {
      if (readings.power >= 0 && readings.power < 50000) {
        validated.power = Math.round(readings.power * 10) / 10;
      }
    }

    // Cross-validate: P = V × I
    if (validated.voltage && validated.current) {
      const calculatedPower = this.calculatePower(validated.voltage, validated.current);
      
      if (validated.power) {
        // Check if measured power matches calculated
        const difference = Math.abs(validated.power - calculatedPower);
        const percentDiff = (difference / calculatedPower) * 100;
        
        if (percentDiff > 20) {
          // Large discrepancy - use calculated
          console.log(`Power mismatch: measured=${validated.power}W, calculated=${calculatedPower}W. Using calculated.`);
          validated.power = calculatedPower;
        }
      } else {
        // No power measurement, calculate it
        validated.power = calculatedPower;
      }
    }

    // If we have power and voltage but no current, calculate it
    if (validated.power && validated.voltage && !validated.current) {
      validated.current = this.calculateCurrent(validated.power, validated.voltage);
    }

    validated.valid = !!(validated.voltage || validated.current || validated.power);

    return validated;
  }

  /**
   * Get recommended capabilities based on what's available
   * @param {Object} available - Available capabilities
   * @param {string} powerType - AC or DC
   * @returns {Array} - Capabilities to register
   */
  static getRecommendedCapabilities(available, powerType) {
    const capabilities = [];

    if (available.voltage) {
      capabilities.push('measure_voltage');
    }

    if (available.current) {
      capabilities.push('measure_current');
    }

    if (available.power) {
      capabilities.push('measure_power');
    }

    if (available.energy) {
      capabilities.push('meter_power');
    }

    // For AC devices, power is more relevant
    if (powerType === 'AC') {
      // Prioritize power over current
      if (available.power && !capabilities.includes('measure_power')) {
        capabilities.push('measure_power');
      }
    }

    return capabilities;
  }

  /**
   * Should hide capability if no real data available
   * @param {string} capability - Capability name
   * @param {Object} available - Available measurements
   * @param {boolean} canEstimate - Can we estimate this value
   * @returns {boolean} - Should hide
   */
  static shouldHideCapability(capability, available, canEstimate = false) {
    const capabilityAvailable = available[String(capability).replace('measure_', '').replace('meter_', '')];
    
    // If we have real measurement, never hide
    if (capabilityAvailable) {
      return false;
    }

    // If we can estimate and want to show estimates, don't hide
    if (canEstimate) {
      return false;
    }

    // No data and can't estimate - hide it
    return true;
  }

  /**
   * Format power value for display
   * @param {number} value - Power value
   * @param {string} unit - Unit (W, kW, A, V)
   * @returns {string} - Formatted value
   */
  static formatPowerValue(value, unit = 'W') {
    if (value === null || value === undefined) return null;

    if (unit === 'W' && value >= 1000) {
      return `${(value / 1000).toFixed(2)} kW`;
    }

    if (unit === 'A' && value < 0.001) {
      return `${(value * 1000).toFixed(1)} mA`;
    }

    return `${value.toFixed(1)} ${unit}`;
  }
}

module.exports = PowerManager;
