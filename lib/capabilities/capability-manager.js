/**
 * Capability management for Tuya devices
 */

class CapabilityManager {
  constructor() {
    this.standardCapabilities = this.getStandardCapabilities();
    this.capabilityOptions = this.getCapabilityOptions();
  }
  
  /**
   * Get standard capabilities by device type
   */
  getStandardCapabilities() {
    return {
      'plug': ['onoff', 'measure_power', 'meter_power'],
      'trv': ['target_temperature', 'measure_temperature', 'locked', 'alarm_battery'],
      'curtain': ['windowcoverings_set', 'windowcoverings_state', 'alarm_battery'],
      'remote': ['alarm_battery'],
      'sensor': ['measure_temperature', 'measure_humidity', 'alarm_battery'],
      'light': ['onoff', 'dim', 'light_temperature', 'light_hue', 'light_saturation']
    };
  }
  
  /**
   * Get capability options for Homey Compose
   */
  getCapabilityOptions() {
    return {
      'target_temperature': {
        min: 5,
        max: 30,
        step: 0.5,
        title: {
          en: 'Target Temperature',
          fr: 'Température cible',
          nl: 'Doeltemperatuur',
          'ta-LK': 'இலக்கு வெப்பநிலை'
        }
      },
      'measure_power': {
        decimals: 0,
        min: 0,
        max: 3680,
        title: {
          en: 'Power Consumption',
          fr: 'Consommation électrique',
          nl: 'Stroomverbruik',
          'ta-LK': 'மின் நுகர்வு'
        }
      },
      'meter_power': {
        decimals: 3,
        title: {
          en: 'Energy Meter',
          fr: 'Compteur d\'énergie',
          nl: 'Energiemeter',
          'ta-LK': 'ஆற்றல் மீட்டர்'
        }
      },
      'windowcoverings_set': {
        title: {
          en: 'Cover Position',
          fr: 'Position du store',
          nl: 'Gordijn positie',
          'ta-LK': 'திரை நிலை'
        }
      },
      'alarm_battery': {
        title: {
          en: 'Battery Alarm',
          fr: 'Alarme batterie',
          nl: 'Batterij alarm',
          'ta-LK': 'பேட்டரி எச்சரிக்கை'
        }
      }
    };
  }
  
  /**
   * Get capabilities for device type
   */
  getCapabilitiesForType(type) {
    return this.standardCapabilities[type] || [];
  }
  
  /**
   * Get capability options for capability
   */
  getOptionsForCapability(capability) {
    return this.capabilityOptions[capability] || {};
  }
  
  /**
   * Validate capability value
   */
  validateCapabilityValue(capability, value) {
    const options = this.getOptionsForCapability(capability);
    
    if (options.min !== undefined && value < options.min) {
      return { valid: false, error: `Value below minimum ${options.min}` };
    }
    
    if (options.max !== undefined && value > options.max) {
      return { valid: false, error: `Value above maximum ${options.max}` };
    }
    
    if (options.step !== undefined) {
      const remainder = (value - (options.min || 0)) % options.step;
      if (Math.abs(remainder) > 0.001) {
        return { valid: false, error: `Value not aligned with step ${options.step}` };
      }
    }
    
    return { valid: true };
  }
  
  /**
   * Get capability metadata
   */
  getCapabilityMetadata(capability) {
    const metadata = {
      'onoff': {
        type: 'boolean',
        category: 'control',
        description: 'Power state control'
      },
      'measure_power': {
        type: 'number',
        category: 'measurement',
        unit: 'W',
        description: 'Instantaneous power consumption'
      },
      'meter_power': {
        type: 'number',
        category: 'measurement',
        unit: 'kWh',
        description: 'Cumulative energy consumption'
      },
      'target_temperature': {
        type: 'number',
        category: 'control',
        unit: '°C',
        description: 'Target temperature setting'
      },
      'measure_temperature': {
        type: 'number',
        category: 'measurement',
        unit: '°C',
        description: 'Current temperature reading'
      },
      'windowcoverings_set': {
        type: 'number',
        category: 'control',
        unit: '%',
        description: 'Cover position setting'
      }
    };
    
    return metadata[capability] || {
      type: 'unknown',
      category: 'unknown',
      description: 'Unknown capability'
    };
  }
  
  /**
   * Generate flow cards for capability
   */
  getFlowCardsForCapability(capability) {
    const flowCards = {
      'onoff': {
        triggers: ['is_on', 'is_off'],
        actions: ['turn_on', 'turn_off', 'toggle'],
        conditions: ['is_on', 'is_off']
      },
      'target_temperature': {
        actions: ['set_target_temperature'],
        conditions: ['target_temperature_reached']
      },
      'windowcoverings_set': {
        actions: ['open', 'close', 'stop', 'set_position'],
        conditions: ['is_open', 'is_closed']
      }
    };
    
    return flowCards[capability] || {};
  }
  
  /**
   * Get capability dependencies
   */
  getCapabilityDependencies(capability) {
    const dependencies = {
      'meter_power': ['measure_power'],
      'dim': ['onoff'],
      'light_temperature': ['onoff'],
      'light_hue': ['onoff'],
      'light_saturation': ['onoff']
    };
    
    return dependencies[capability] || [];
  }
}

module.exports = CapabilityManager;
