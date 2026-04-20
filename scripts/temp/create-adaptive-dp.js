const fs = require('fs');

// Enhanced UniversalVariantManager with better DP mapping intelligence
const enhancedVariantManager = `
/**
 * Enhanced Adaptive DP Mapping System v6.0
 * Handles manufacturer-specific DP variants with intelligent fallback
 */

// DP Variant Database - extracted from dp-full-analysis.json
const DP_VARIANT_PATTERNS = {
  // DP3 variants - 4 different usages, divisors 1/10/100/1000
  3: {
    variants: [
      { usage: 'min_brightness', divisor: 1, drivers: ['dimmer_*', 'bulb_*'], dataType: 2 },
      { usage: 'measure_temperature', divisor: 10, drivers: ['climate_sensor', 'thermostat_*'], dataType: 2 },
      { usage: 'battery_low', divisor: 1, drivers: ['*_sensor'], dataType: 4 },
      { usage: 'consumption', divisor: 1000, drivers: ['plug_*', 'power_*'], dataType: 2 }
    ],
    detection: (driverType, value, dataType) => {
      // Temperature values typically 0-500 (0-50Â°C when divided by 10)
      if (dataType === 2 && value >= 0 && value <= 500 && (driverType.includes('climate') || driverType.includes('thermostat'))) {
        return { usage: 'measure_temperature', divisor: 10 };
      }
      // Brightness 0-100
      if (dataType === 2 && value <= 100 && (driverType.includes('dimmer') || driverType.includes('bulb'))) {
        return { usage: 'min_brightness', divisor: 1 };
      }
      // Battery low enum
      if (dataType === 4 && driverType.includes('sensor')) {
        return { usage: 'battery_low', divisor: 1 };
      }
      // Consumption in mWh
      if (dataType === 2 && value > 1000 && (driverType.includes('plug') || driverType.includes('power'))) {
        return { usage: 'consumption', divisor: 1000 };
      }
      return null;
    }
  },

  // DP6 variants - 6 different usages
  6: {
    variants: [
      { usage: 'scene_data', divisor: 1, drivers: ['button_*', 'scene_*'], dataType: 3 },
      { usage: 'battery_voltage', divisor: 1000, drivers: ['*_sensor'], dataType: 2 },
      { usage: 'border', divisor: 1, drivers: ['dimmer_*'], dataType: 2 },
      { usage: 'countdown', divisor: 1, drivers: ['switch_*', 'plug_*'], dataType: 2 },
      { usage: 'display_brightness', divisor: 1, drivers: ['thermostat_*'], dataType: 4 },
      { usage: 'work_state', divisor: 1, drivers: ['cover_*'], dataType: 4 }
    ],
    detection: (driverType, value, dataType) => {
      if (dataType === 3) return { usage: 'scene_data', divisor: 1 };
      if (dataType === 2 && value > 2000 && driverType.includes('sensor')) {
        return { usage: 'battery_voltage', divisor: 1000 };
      }
      if (dataType === 2 && value <= 100 && driverType.includes('dimmer')) {
        return { usage: 'border', divisor: 1 };
      }
      if (dataType === 2 && driverType.includes('switch')) {
        return { usage: 'countdown', divisor: 1 };
      }
      if (dataType === 4 && driverType.includes('thermostat')) {
        return { usage: 'display_brightness', divisor: 1 };
      }
      if (dataType === 4 && driverType.includes('cover')) {
        return { usage: 'work_state', divisor: 1 };
      }
      return null;
    }
  },

  // DP9 variants - 6 different usages
  9: {
    variants: [
      { usage: 'power_on_state', divisor: 1, drivers: ['switch_*', 'plug_*'], dataType: 4 },
      { usage: 'countdown', divisor: 1, drivers: ['switch_*'], dataType: 2 },
      { usage: 'eco_temp', divisor: 10, drivers: ['thermostat_*'], dataType: 2 },
      { usage: 'temperature_unit', divisor: 1, drivers: ['climate_*', '*_sensor'], dataType: 4 },
      { usage: 'flow_rate', divisor: 1, drivers: ['valve_*'], dataType: 2 },
      { usage: 'eco_mode', divisor: 1, drivers: ['radiator_*'], dataType: 1 }
    ],
    detection: (driverType, value, dataType) => {
      if (dataType === 4 && (driverType.includes('switch') || driverType.includes('plug'))) {
        return { usage: 'power_on_state', divisor: 1 };
      }
      if (dataType === 2 && value <= 600 && driverType.includes('thermostat')) {
        return { usage: 'eco_temp', divisor: 10 };
      }
      if (dataType === 4 && (driverType.includes('climate') || driverType.includes('sensor'))) {
        return { usage: 'temperature_unit', divisor: 1 };
      }
      if (dataType === 2 && driverType.includes('valve')) {
        return { usage: 'flow_rate', divisor: 1 };
      }
      if (dataType === 1 && driverType.includes('radiator')) {
        return { usage: 'eco_mode', divisor: 1 };
      }
      if (dataType === 2 && driverType.includes('switch')) {
        return { usage: 'countdown', divisor: 1 };
      }
      return null;
    }
  },

  // DP101 variants - 5 different usages with variable divisors
  101: {
    variants: [
      { usage: 'child_lock', divisor: 1, drivers: ['switch_*', 'thermostat_*'], dataType: 1 },
      { usage: 'backlight_mode', divisor: 1, drivers: ['switch_*'], dataType: 4 },
      { usage: 'humidity', divisor: 10, drivers: ['climate_*'], dataType: 2 },
      { usage: 'air_humidity', divisor: 1, drivers: ['soil_sensor'], dataType: 2 },
      { usage: 'unknown_101', divisor: 1, drivers: ['*'], dataType: 2 }
    ],
    detection: (driverType, value, dataType) => {
      if (dataType === 1) return { usage: 'child_lock', divisor: 1 };
      if (dataType === 4 && driverType.includes('switch')) {
        return { usage: 'backlight_mode', divisor: 1 };
      }
      if (dataType === 2 && value <= 100 && driverType.includes('climate')) {
        return { usage: 'humidity', divisor: 10 };
      }
      if (dataType === 2 && driverType.includes('soil')) {
        return { usage: 'air_humidity', divisor: 1 };
      }
      return { usage: 'unknown_101', divisor: 1 };
    }
  }
};

/**
 * Intelligent DP detection based on context
 */
function detectDPUsage(dp, value, dataType, manufacturerName, driverType) {
  const pattern = DP_VARIANT_PATTERNS[dp];
  if (!pattern) return null;
  
  // Use detection function
  const detected = pattern.detection(driverType, value, dataType);
  if (detected) {
    console.log(\`[DP-DETECT] DP\${dp}: \${detected.usage} (divisor: \${detected.divisor}, driver: \${driverType})\`);
    return detected;
  }
  
  // Fallback to first variant if no detection
  return pattern.variants[0];
}

module.exports = { DP_VARIANT_PATTERNS, detectDPUsage };
`;

fs.writeFileSync('.github/scripts/adaptive-dp-detector.js', enhancedVariantManager);
console.log(' Created adaptive DP detection system');
