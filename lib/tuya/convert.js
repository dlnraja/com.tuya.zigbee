/**
 * Tuya DP (Data Point) conversion utilities
 * Centralized conversion logic for Tuya devices
 */

class TuyaConvert {
  /**
   * Build DP mapping from overlay configuration
   */
  static build(family, overlay) {
    if (!overlay || !overlay.dp) {
      return this.getStandardFamilyOverlay(family);
    }
    return overlay.dp;
  }

  /**
   * Convert raw DP value to Homey capability value
   */
  static toCapability(mapping, rawValue) {
    if (!mapping || !mapping.cap) return undefined;
    
    try {
      const { cap, to } = mapping;
      let value = rawValue;
      
      // Apply conversion rules
      if (to) {
        value = this.applyConversion(value, to);
      }
      
      return value;
    } catch (error) {
      console.error('DP conversion failed:', error);
      return undefined;
    }
  }

  /**
   * Convert Homey capability value to Tuya DP value
   */
  static fromCapability(mapping, capabilityValue) {
    if (!mapping || !mapping.cap) return undefined;
    
    try {
      const { from } = mapping;
      let value = capabilityValue;
      
      // Apply reverse conversion
      if (from) {
        value = this.applyConversion(value, from);
      }
      
      return value;
    } catch (error) {
      console.error('Capability conversion failed:', error);
      return undefined;
    }
  }

  /**
   * Apply conversion rule to value
   */
  static applyConversion(value, rule) {
    if (!rule) return value;
    
    const conversions = this.getStandardConversions();
    const conversion = conversions[rule];
    
    if (conversion) {
      return conversion(value);
    }
    
    // Custom conversion rules
    if (rule.startsWith('num/')) {
      const divisor = parseInt(rule.split('/')[1]);
      return Number(value) / divisor;
    }
    
    if (rule.startsWith('mul/')) {
      const multiplier = parseInt(rule.split('/')[1]);
      return Number(value) * multiplier;
    }
    
    return value;
  }

  /**
   * Get standard conversion functions
   */
  static getStandardConversions() {
    return {
      'bool': (v) => !!v,
      'num': (v) => Number(v),
      'str': (v) => String(v),
      'num/10': (v) => Number(v) / 10,
      'num/100': (v) => Number(v) / 100,
      'num/1000': (v) => Number(v) / 1000,
      'mul/10': (v) => Number(v) * 10,
      'mul/100': (v) => Number(v) * 100
    };
  }

  /**
   * Get standard family overlay
   */
  static getStandardFamilyOverlay(family) {
    const overlays = {
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
        '2': { cap: 'windowcoverings_state', to: 'num' },
        '45': { cap: 'measure_battery', to: 'num' }
      },
      'remote': {
        '1': { cap: 'button', to: 'num' }
      }
    };
    
    return overlays[family] || overlays['plug'];
  }
}

module.exports = TuyaConvert;


