#!/usr/bin/env node
'use strict';

/**
 * 🔧 Tuya Data Point Mapping - Universal Tuya Zigbee
 * Tuya DP dispatcher and encoder for Homey capabilities
 */

class TuyaDPMapper {
  constructor() {
    // Default DP mappings for common capabilities
    this.defaultMap = {
      // Basic controls
      '1': { capability: 'onoff', type: 'bool', name: 'Switch State' },
      '2': { capability: 'dim', type: 'value', name: 'Brightness', range: [0, 1000] },
      '3': { capability: 'measure_temperature', type: 'value', name: 'Temperature', unit: '°C' },
      '4': { capability: 'measure_humidity', type: 'value', name: 'Humidity', unit: '%' },
      
      // Power measurements
      '5': { capability: 'measure_power', type: 'value', name: 'Power', unit: 'W' },
      '6': { capability: 'meter_power', type: 'value', name: 'Energy', unit: 'kWh' },
      '7': { capability: 'measure_voltage', type: 'value', name: 'Voltage', unit: 'V' },
      '8': { capability: 'measure_current', type: 'value', name: 'Current', unit: 'A' },
      
      // Light controls
      '9': { capability: 'light_hue', type: 'value', name: 'Hue', range: [0, 360] },
      '10': { capability: 'light_saturation', type: 'value', name: 'Saturation', range: [0, 100] },
      '11': { capability: 'light_temperature', type: 'value', name: 'Color Temperature', range: [153, 500] },
      
      // Cover controls
      '12': { capability: 'windowcoverings_state', type: 'value', name: 'Position', range: [0, 100] },
      '13': { capability: 'windowcoverings_set', type: 'enum', name: 'Cover Control', options: ['up', 'down', 'stop'] },
      
      // Thermostat controls
      '14': { capability: 'target_temperature', type: 'value', name: 'Target Temperature', unit: '°C' },
      '15': { capability: 'measure_temperature_thermostat', type: 'value', name: 'Current Temperature', unit: '°C' },
      
      // Alarm sensors
      '16': { capability: 'alarm_motion', type: 'bool', name: 'Motion Detected' },
      '17': { capability: 'alarm_contact', type: 'bool', name: 'Contact Open' },
      '18': { capability: 'alarm_smoke', type: 'bool', name: 'Smoke Detected' },
      '19': { capability: 'alarm_water', type: 'bool', name: 'Water Leak' },
      '20': { capability: 'alarm_gas', type: 'bool', name: 'Gas Detected' },
      
      // Battery
      '21': { capability: 'measure_battery', type: 'value', name: 'Battery Level', unit: '%', range: [0, 100] },
      '22': { capability: 'alarm_battery', type: 'bool', name: 'Low Battery' },
      
      // Settings
      '101': { capability: 'setting', type: 'value', name: 'Setting 1' },
      '102': { capability: 'setting', type: 'value', name: 'Setting 2' },
      '103': { capability: 'setting', type: 'value', name: 'Setting 3' },
      '104': { capability: 'setting', type: 'value', name: 'Setting 4' },
      '105': { capability: 'setting', type: 'value', name: 'Setting 5' }
    };
    
    // Rate limiting for DP commands
    this.rateLimiter = this.createRateLimiter(5, 1000); // 5 commands per second
    this.lastCommandTime = 0;
    this.minCommandInterval = 200; // Minimum 200ms between commands
  }

  /**
   * Map Tuya DP to Homey capability
   */
  mapTuyaDpToCapability({ dp, dataType, value, device }) {
    try {
      const mapping = this.defaultMap[dp] || this.inferMapping(dp, dataType, value, device);
      
      if (!mapping) {
        console.warn(`No mapping found for DP ${dp} (${dataType}: ${value})`);
        return null;
      }
      
      // Transform value based on type and range
      const transformedValue = this.transformDPValue(value, mapping);
      
      // Validate transformed value
      if (!this.validateCapabilityValue(mapping.capability, transformedValue)) {
        console.warn(`Invalid value for ${mapping.capability}:`, transformedValue);
        return null;
      }
      
      return {
        dp,
        capability: mapping.capability,
        value: transformedValue,
        originalValue: value,
        mapping
      };
      
    } catch (error) {
      console.error(`Error mapping DP ${dp}:`, error);
      return null;
    }
  }

  /**
   * Infer mapping for unknown DP
   */
  inferMapping(dp, dataType, value, device) {
    // Try to infer capability based on data type and value
    if (dataType === 'bool') {
      if (dp.includes('1') || dp.includes('switch')) {
        return { capability: 'onoff', type: 'bool', name: `DP ${dp} (Inferred)` };
      }
      if (dp.includes('motion') || dp.includes('pir')) {
        return { capability: 'alarm_motion', type: 'bool', name: `DP ${dp} (Inferred)` };
      }
      if (dp.includes('contact') || dp.includes('door')) {
        return { capability: 'alarm_contact', type: 'bool', name: `DP ${dp} (Inferred)` };
      }
    }
    
    if (dataType === 'value') {
      if (dp.includes('temp') || dp.includes('temperature')) {
        return { capability: 'measure_temperature', type: 'value', name: `DP ${dp} (Inferred)`, unit: '°C' };
      }
      if (dp.includes('humidity') || dp.includes('hum')) {
        return { capability: 'measure_humidity', type: 'value', name: `DP ${dp} (Inferred)`, unit: '%' };
      }
      if (dp.includes('power') || dp.includes('watt')) {
        return { capability: 'measure_power', type: 'value', name: `DP ${dp} (Inferred)`, unit: 'W' };
      }
      if (dp.includes('bright') || dp.includes('level')) {
        return { capability: 'dim', type: 'value', name: `DP ${dp} (Inferred)`, range: [0, 1000] };
      }
    }
    
    // Generic fallback
    return {
      capability: 'setting',
      type: dataType,
      name: `DP ${dp} (Generic)`,
      inferred: true
    };
  }

  /**
   * Transform DP value to capability value
   */
  transformDPValue(value, mapping) {
    try {
      if (mapping.type === 'bool') {
        return Boolean(value);
      }
      
      if (mapping.type === 'value') {
        let numValue = Number(value);
        
        if (isNaN(numValue)) {
          throw new Error(`Invalid numeric value: ${value}`);
        }
        
        // Apply range transformation if specified
        if (mapping.range) {
          const [min, max] = mapping.range;
          if (mapping.capability === 'dim') {
            // Convert 0-1000 to 0-1 for dim capability
            return Math.round((numValue / 1000) * 100) / 100;
          }
          if (mapping.capability === 'light_hue') {
            // Convert 0-1000 to 0-360 for hue
            return Math.round((numValue / 1000) * 360);
          }
          if (mapping.capability === 'light_saturation') {
            // Convert 0-1000 to 0-100 for saturation
            return Math.round((numValue / 1000) * 100);
          }
          if (mapping.capability === 'windowcoverings_state') {
            // Convert 0-1000 to 0-100 for position
            return Math.round((numValue / 1000) * 100);
          }
        }
        
        // Apply unit conversions
        if (mapping.unit === '°C' && mapping.capability === 'measure_temperature') {
          // Convert from 0.1°C to °C if needed
          if (numValue > 1000) {
            return Math.round((numValue / 10) * 10) / 10;
          }
        }
        
        if (mapping.unit === '%' && mapping.capability === 'measure_humidity') {
          // Convert from 0.1% to % if needed
          if (numValue > 1000) {
            return Math.round((numValue / 10) * 10) / 10;
          }
        }
        
        return numValue;
      }
      
      if (mapping.type === 'enum') {
        return String(value);
      }
      
      return value;
      
    } catch (error) {
      console.error(`Error transforming DP value:`, error);
      return value;
    }
  }

  /**
   * Validate capability value
   */
  validateCapabilityValue(capabilityName, value) {
    // Basic validation based on capability type
    if (capabilityName === 'onoff') {
      return typeof value === 'boolean';
    }
    
    if (capabilityName === 'dim') {
      return typeof value === 'number' && value >= 0 && value <= 1;
    }
    
    if (capabilityName === 'measure_temperature') {
      return typeof value === 'number' && value >= -50 && value <= 100;
    }
    
    if (capabilityName === 'measure_humidity') {
      return typeof value === 'number' && value >= 0 && value <= 100;
    }
    
    if (capabilityName === 'measure_power') {
      return typeof value === 'number' && value >= 0 && value <= 10000;
    }
    
    if (capabilityName === 'light_hue') {
      return typeof value === 'number' && value >= 0 && value <= 360;
    }
    
    if (capabilityName === 'light_saturation') {
      return typeof value === 'number' && value >= 0 && value <= 100;
    }
    
    if (capabilityName === 'light_temperature') {
      return typeof value === 'number' && value >= 153 && value <= 500;
    }
    
    if (capabilityName === 'windowcoverings_state') {
      return typeof value === 'number' && value >= 0 && value <= 100;
    }
    
    if (capabilityName === 'measure_battery') {
      return typeof value === 'number' && value >= 0 && value <= 100;
    }
    
    return true; // Default to valid for unknown capabilities
  }

  /**
   * Send Tuya DP command
   */
  async sendTuyaDp({ device, dp, dataType, value }) {
    try {
      // Rate limiting check
      if (!this.rateLimiter()) {
        throw new Error('Rate limit exceeded');
      }
      
      // Minimum interval check
      const now = Date.now();
      if (now - this.lastCommandTime < this.minCommandInterval) {
        const delay = this.minCommandInterval - (now - this.lastCommandTime);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Transform value back to Tuya format
      const tuyaValue = this.transformToTuyaValue(value, dp);
      
      // Send command via device
      const result = await device.sendTuyaCommand({
        dp,
        dataType,
        value: tuyaValue
      });
      
      this.lastCommandTime = Date.now();
      
      return {
        success: true,
        dp,
        value: tuyaValue,
        result
      };
      
    } catch (error) {
      console.error(`Failed to send Tuya DP ${dp}:`, error);
      return {
        success: false,
        dp,
        error: error.message
      };
    }
  }

  /**
   * Transform capability value back to Tuya format
   */
  transformToTuyaValue(value, dp) {
    const mapping = this.defaultMap[dp];
    if (!mapping) return value;
    
    try {
      if (mapping.capability === 'dim') {
        // Convert 0-1 to 0-1000
        return Math.round(value * 1000);
      }
      
      if (mapping.capability === 'light_hue') {
        // Convert 0-360 to 0-1000
        return Math.round((value / 360) * 1000);
      }
      
      if (mapping.capability === 'light_saturation') {
        // Convert 0-100 to 0-1000
        return Math.round((value / 100) * 1000);
      }
      
      if (mapping.capability === 'windowcoverings_state') {
        // Convert 0-100 to 0-1000
        return Math.round((value / 100) * 1000);
      }
      
      return value;
      
    } catch (error) {
      console.error(`Error transforming to Tuya value:`, error);
      return value;
    }
  }

  /**
   * Create rate limiter
   */
  createRateLimiter(maxCalls, timeWindow) {
    const calls = [];
    
    return function rateLimited() {
      const now = Date.now();
      calls.push(now);
      
      // Remove old calls outside the time window
      while (calls.length > 0 && calls[0] < now - timeWindow) {
        calls.shift();
      }
      
      if (calls.length >= maxCalls) {
        return false; // Rate limited
      }
      
      return true; // Allowed
    };
  }

  /**
   * Get DP mapping info
   */
  getDPMapping(dp) {
    return this.defaultMap[dp] || null;
  }

  /**
   * Get all known DP mappings
   */
  getAllDPMappings() {
    return { ...this.defaultMap };
  }

  /**
   * Add custom DP mapping
   */
  addDPMapping(dp, mapping) {
    if (typeof dp === 'string' && mapping && mapping.capability) {
      this.defaultMap[dp] = {
        ...mapping,
        custom: true,
        added: new Date().toISOString()
      };
      return true;
    }
    return false;
  }

  /**
   * Remove custom DP mapping
   */
  removeDPMapping(dp) {
    if (this.defaultMap[dp] && this.defaultMap[dp].custom) {
      delete this.defaultMap[dp];
      return true;
    }
    return false;
  }
}

module.exports = new TuyaDPMapper();
