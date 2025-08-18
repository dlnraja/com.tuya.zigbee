/**
 * Tuya DP to Homey capability conversion utilities
 */

class TuyaConvert {
  static build(family, overlay) {
    if (!overlay || !overlay.dp) {
      return {};
    }
    
    const dpMap = {};
    
    for (const [dpId, config] of Object.entries(overlay.dp)) {
      dpMap[dpId] = {
        cap: config.cap,
        to: config.to,
        from: config.from || config.to
      };
    }
    
    return dpMap;
  }
  
  static toCapability(mapping, rawValue) {
    if (!mapping || !mapping.to) {
      return undefined;
    }
    
    try {
      const value = this.applyConversion(rawValue, mapping.to);
      return value;
    } catch (error) {
      console.error('Conversion error:', error);
      return undefined;
    }
  }
  
  static fromCapability(mapping, capabilityValue) {
    if (!mapping || !mapping.from) {
      return undefined;
    }
    
    try {
      const value = this.applyConversion(capabilityValue, mapping.from);
      return value;
    } catch (error) {
      console.error('Conversion error:', error);
      return undefined;
    }
  }
  
  static applyConversion(value, conversion) {
    if (conversion === 'bool') {
      return Boolean(value);
    }
    
    if (conversion === 'num') {
      return Number(value);
    }
    
    if (conversion.startsWith('num/')) {
      const divisor = Number(conversion.split('/')[1]);
      return Number(value) / divisor;
    }
    
    if (conversion.startsWith('mul/')) {
      const multiplier = Number(conversion.split('/')[1]);
      return Number(value) * multiplier;
    }
    
    if (conversion.startsWith('add/')) {
      const addend = Number(conversion.split('/')[1]);
      return Number(value) + addend;
    }
    
    if (conversion.startsWith('sub/')) {
      const subtrahend = Number(conversion.split('/')[1]);
      return Number(value) - subtrahend;
    }
    
    // Default: return as-is
    return value;
  }
  
  // Predefined conversions for common Tuya devices
  static getStandardConversions() {
    return {
      'plug': {
        '1': { cap: 'onoff', to: 'bool' },
        '16': { cap: 'measure_power', to: 'num/10' },
        '17': { cap: 'meter_power', to: 'num/1000' }
      },
      'trv': {
        '2': { cap: 'target_temperature', to: 'num/10', from: 'mul/10' },
        '4': { cap: 'measure_temperature', to: 'num/10' },
        '7': { cap: 'locked', to: 'bool' },
        '45': { cap: 'measure_battery', to: 'num' }
      },
      'curtain': {
        '1': { cap: 'windowcoverings_set', to: 'num' },
        '2': { cap: 'windowcoverings_state', to: 'num' }
      }
    };
  }
}

module.exports = TuyaConvert;


