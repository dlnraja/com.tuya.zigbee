'use strict';

/**
 * TuyaConvert - Centralized DP conversion logic
 */
class TuyaConvert {
  constructor() {
    this.cache = new Map(); // LRU cache for hot mappings
    this.maxCacheSize = 128;
  }

  /**
   * Build converter from overlay
   */
  build(overlay) {
    if (!overlay || !overlay.dp) return null;
    
    const converter = {
      toCapability: {},
      fromCapability: {}
    };
    
    Object.entries(overlay.dp).forEach(([dpId, config]) => {
      converter.toCapability[dpId] = config;
      converter.fromCapability[config.cap] = { dpId, ...config };
    });
    
    return converter;
  }

  /**
   * Convert DP to capability value
   */
  toCapability(dpId, value, config) {
    const cacheKey = `${dpId}:${value}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    let result = value;
    
    if (config.to === 'bool') {
      result = Boolean(value);
    } else if (config.to?.startsWith('num/')) {
      const divisor = parseInt(config.to.split('/')[1]);
      result = value / divisor;
    }
    
    // Update cache
    this.cache.set(cacheKey, result);
    if (this.cache.size > this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    return result;
  }

  /**
   * Convert capability value to DP
   */
  fromCapability(capability, value, config) {
    if (config.to === 'bool') {
      return value ? 1 : 0;
    } else if (config.to?.startsWith('num/')) {
      const multiplier = parseInt(config.to.split('/')[1]);
      return Math.round(value * multiplier);
    }
    
    return value;
  }

  /**
   * Get standard conversions for common DPs
   */
  getStandardConversions() {
    return {
      // Power & Energy
      1: { cap: 'onoff', to: 'bool' },
      16: { cap: 'measure_power', to: 'num/10' },
      17: { cap: 'meter_power', to: 'num/1000' },
      18: { cap: 'measure_current', to: 'num/1000' },
      19: { cap: 'measure_voltage', to: 'num/10' },
      
      // Temperature
      2: { cap: 'target_temperature', to: 'num/10' },
      4: { cap: 'measure_temperature', to: 'num/10' },
      
      // Controls
      7: { cap: 'locked', to: 'bool' },
      45: { cap: 'alarm_battery', to: 'bool' },
      
      // Curtains
      3: { cap: 'windowcoverings_set', to: 'num/1' }
    };
  }
}

module.exports = TuyaConvert;