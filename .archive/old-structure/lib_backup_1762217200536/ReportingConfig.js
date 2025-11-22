'use strict';

/**
 * ReportingConfig - Optimized attribute reporting configurations
 * Based on analysis of professional Homey Zigbee apps (Philips Hue, Xiaomi, Aqara)
 * 
 * Key findings:
 * - Battery: min 1 hour, max 16 hours (slow changing)
 * - Motion: min 5 seconds (prevents flooding, critical discovery by Johan Bendz)
 * - Power: min 5 seconds (medium speed, avoid spam)
 * - Onoff: min 0 (instant response needed)
 */
class ReportingConfig {
  
  /**
   * Get recommended attribute reporting configuration for a capability
   * @param {string} capabilityId - Homey capability ID
   * @returns {Object} { minInterval, maxInterval, minChange }
   */
  static getConfig(capabilityId) {
    const configs = {
      // ========================================
      // FAST RESPONSE NEEDED (minInterval: 0-5s)
      // ========================================
      
      'onoff': {
        minInterval: 0,        // Instant response
        maxInterval: 300,      // 5 minutes failsafe
        minChange: 1
      },
      
      'alarm_contact': {
        minInterval: 0,        // Instant notification
        maxInterval: 300,
        minChange: 1
      },
      
      'alarm_motion': {
        minInterval: 5,        // ⚠️ CRITICAL: Min 5s prevents flooding
        maxInterval: 300,      // (Discovery by Johan Bendz - Philips Hue app)
        minChange: 1
      },
      
      'alarm_smoke': {
        minInterval: 0,        // Safety critical
        maxInterval: 300,
        minChange: 1
      },
      
      'alarm_water': {
        minInterval: 0,        // Safety critical
        maxInterval: 300,
        minChange: 1
      },
      
      'alarm_co': {
        minInterval: 0,        // Safety critical
        maxInterval: 300,
        minChange: 1
      },
      
      // ========================================
      // MEDIUM SPEED (minInterval: 5-60s)
      // ========================================
      
      'dim': {
        minInterval: 1,        // Quick response for lights
        maxInterval: 300,
        minChange: 5           // 5% change
      },
      
      'light_hue': {
        minInterval: 1,
        maxInterval: 300,
        minChange: 10          // ~3° hue change
      },
      
      'light_saturation': {
        minInterval: 1,
        maxInterval: 300,
        minChange: 10          // 10% saturation
      },
      
      'light_temperature': {
        minInterval: 1,
        maxInterval: 300,
        minChange: 10          // Color temp change
      },
      
      'measure_power': {
        minInterval: 5,        // Power can fluctuate
        maxInterval: 300,
        minChange: 10          // 10W change
      },
      
      'measure_voltage': {
        minInterval: 30,       // Voltage stable usually
        maxInterval: 600,
        minChange: 10          // 1V change (Zigbee: 0.1V units)
      },
      
      'measure_current': {
        minInterval: 5,        // Current can change quickly
        maxInterval: 300,
        minChange: 10          // 0.01A change (Zigbee: mA)
      },
      
      'measure_temperature': {
        minInterval: 60,       // Temperature changes slowly
        maxInterval: 600,      // 10 minutes
        minChange: 50          // 0.5°C (Zigbee: 0.01°C units)
      },
      
      'measure_humidity': {
        minInterval: 60,
        maxInterval: 600,
        minChange: 100         // 1% (Zigbee: 0.01% units)
      },
      
      'measure_luminance': {
        minInterval: 30,
        maxInterval: 300,
        minChange: 100         // Lux change
      },
      
      'measure_co2': {
        minInterval: 60,
        maxInterval: 600,
        minChange: 50          // 50 ppm change
      },
      
      'measure_pm25': {
        minInterval: 60,
        maxInterval: 600,
        minChange: 5           // Air quality
      },
      
      'windowcoverings_set': {
        minInterval: 5,
        maxInterval: 300,
        minChange: 5           // 5% position change
      },
      
      // ========================================
      // SLOW CHANGING (minInterval: 300-3600s)
      // ========================================
      
      'measure_battery': {
        minInterval: 3600,     // 1 hour (battery changes very slowly)
        maxInterval: 60000,    // ~16 hours
        minChange: 2           // 1% (Zigbee: 0.5% units, so 2 = 1%)
      },
      
      'meter_power': {
        minInterval: 300,      // 5 minutes
        maxInterval: 3600,     // 1 hour
        minChange: 100         // 0.1 kWh (Zigbee: Wh units)
      },
      
      'meter_gas': {
        minInterval: 300,
        maxInterval: 3600,
        minChange: 100         // 0.1 m³
      },
      
      'meter_water': {
        minInterval: 300,
        maxInterval: 3600,
        minChange: 100         // 0.1 m³
      }
    };
    
    // Return specific config or safe default
    return configs[capabilityId] || {
      minInterval: 0,
      maxInterval: 300,
      minChange: 1
    };
  }
  
  /**
   * Get recommended getOpts for a capability
   * @param {string} capabilityId - Homey capability ID
   * @returns {Object} { getOnStart, getOnOnline, pollInterval? }
   */
  static getGetOpts(capabilityId) {
    // Capabilities that NEED initial value immediately
    const criticalCapabilities = [
      'onoff',
      'dim',
      'light_hue',
      'light_saturation',
      'light_temperature',
      'windowcoverings_set',
      'target_temperature'
    ];
    
    // Capabilities that need refresh when device comes online
    const onlineRefreshNeeded = [
      'alarm_motion',
      'alarm_contact',
      'alarm_smoke',
      'alarm_water'
    ];
    
    const config = {
      getOnStart: criticalCapabilities.includes(capabilityId),
      getOnOnline: onlineRefreshNeeded.includes(capabilityId)
    };
    
    // ⚠️ NEVER add pollInterval here!
    // Polling should ONLY be used if attribute reporting doesn't work
    // If you need polling, add it manually in device.js with justification
    
    return config;
  }
  
  /**
   * Get all capabilities for a specific category
   * Useful for applying configs in bulk
   */
  static getCategoryCapabilities(category) {
    const categories = {
      'fast': [
        'onoff',
        'alarm_contact',
        'alarm_motion',
        'alarm_smoke',
        'alarm_water',
        'alarm_co'
      ],
      'medium': [
        'dim',
        'light_hue',
        'light_saturation',
        'light_temperature',
        'measure_power',
        'measure_voltage',
        'measure_current',
        'measure_temperature',
        'measure_humidity',
        'measure_luminance',
        'measure_co2',
        'measure_pm25',
        'windowcoverings_set'
      ],
      'slow': [
        'measure_battery',
        'meter_power',
        'meter_gas',
        'meter_water'
      ]
    };
    
    return categories[category] || [];
  }
  
  /**
   * Get human-readable explanation for intervals
   */
  static explainConfig(capabilityId) {
    const config = this.getConfig(capabilityId);
    
    const minText = config.minInterval === 0 
      ? 'immediate' 
      : `${config.minInterval}s`;
    
    const maxText = config.maxInterval >= 3600
      ? `${Math.round(config.maxInterval / 3600)}h`
      : `${Math.round(config.maxInterval / 60)}min`;
    
    return {
      ...config,
      explanation: `Reports ${minText} on change, failsafe every ${maxText}, minimum change: ${config.minChange}`
    };
  }
}

module.exports = ReportingConfig;
