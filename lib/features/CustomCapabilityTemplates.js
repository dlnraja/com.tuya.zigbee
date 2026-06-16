'use strict';

/**
 * Custom Capability Templates - FEATURE #45
 *
 * Provides reusable capability templates for common Tuya device patterns:
 * - Pre-configured capability sets by device type
 * - Automatic capability generation from DP mappings
 * - Capability group templates (sensor clusters, switch clusters)
 *
 * @version 9.1.0
 */

const TEMPLATES = {
  // ─── Sensor Templates ─────────────────────────────────────────────
  TEMP_HUMIDITY: {
    name: 'Temperature + Humidity',
    capabilities: ['measure_temperature', 'measure_humidity'],
    deviceClass: 'sensor'
  },
  TEMP_HUMIDITY_PRESSURE: {
    name: 'Temperature + Humidity + Pressure',
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_pressure'],
    deviceClass: 'sensor'
  },
  MOTION_LIGHT: {
    name: 'Motion + Light',
    capabilities: ['alarm_motion', 'measure_luminance'],
    deviceClass: 'sensor'
  },
  CONTACT_BATTERY: {
    name: 'Contact + Battery',
    capabilities: ['alarm_contact', 'measure_battery'],
    deviceClass: 'sensor'
  },
  SMOKE_CO: {
    name: 'Smoke + CO',
    capabilities: ['alarm_smoke', 'alarm_carbon_monoxide'],
    deviceClass: 'alarm'
  },
  WATER_LEAK: {
    name: 'Water Leak',
    capabilities: ['alarm_water'],
    deviceClass: 'sensor'
  },
  AIR_QUALITY: {
    name: 'Air Quality (PM2.5 + TVOC)',
    capabilities: ['measure_pm25', 'measure_voc'],
    deviceClass: 'sensor'
  },

  // ─── Switch Templates ─────────────────────────────────────────────
  BASIC_SWITCH: {
    name: 'Basic Switch',
    capabilities: ['onoff'],
    deviceClass: 'socket'
  },
  SWITCH_POWER: {
    name: 'Switch + Power Monitoring',
    capabilities: ['onoff', 'measure_power', 'meter_power'],
    deviceClass: 'socket'
  },
  SWITCH_ENERGY: {
    name: 'Switch + Energy Meter',
    capabilities: ['onoff', 'measure_power', 'measure_voltage', 'measure_current', 'meter_power'],
    deviceClass: 'socket'
  },
  DIMMABLE_SWITCH: {
    name: 'Dimmable Switch',
    capabilities: ['onoff', 'dim'],
    deviceClass: 'light'
  },
  COLOR_LIGHT: {
    name: 'Color Light',
    capabilities: ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_mode'],
    deviceClass: 'light'
  },

  // ─── Cover Templates ──────────────────────────────────────────────
  BASIC_COVER: {
    name: 'Basic Cover',
    capabilities: ['windowcoverings_state'],
    deviceClass: 'windowcoverings'
  },
  COVER_POSITION: {
    name: 'Cover + Position',
    capabilities: ['windowcoverings_state', 'windowcoverings_set'],
    deviceClass: 'windowcoverings'
  },
  COVER_TILT: {
    name: 'Cover + Position + Tilt',
    capabilities: ['windowcoverings_state', 'windowcoverings_set'],
    subCapabilities: ['tilt'],
    deviceClass: 'windowcoverings'
  },

  // ─── Thermostat Templates ─────────────────────────────────────────
  BASIC_THERMOSTAT: {
    name: 'Basic Thermostat',
    capabilities: ['target_temperature', 'measure_temperature'],
    deviceClass: 'thermostat'
  },
  THERMOSTAT_MODE: {
    name: 'Thermostat + Mode',
    capabilities: ['target_temperature', 'measure_temperature', 'thermostat_mode'],
    deviceClass: 'thermostat'
  },
  THERMOSTAT_FULL: {
    name: 'Full Thermostat',
    capabilities: ['target_temperature', 'measure_temperature', 'thermostat_mode', 'measure_humidity'],
    deviceClass: 'thermostat'
  },

  // ─── Specialized Templates ────────────────────────────────────────
  CURTAIN_POSITION: {
    name: 'Curtain + Position',
    capabilities: ['windowcoverings_state', 'windowcoverings_set'],
    deviceClass: 'windowcoverings'
  },
  LOCK_BASIC: {
    name: 'Smart Lock',
    capabilities: ['lock'],
    deviceClass: 'doorlock'
  },
  LOCK_BATTERY: {
    name: 'Smart Lock + Battery',
    capabilities: ['lock', 'measure_battery'],
    deviceClass: 'doorlock'
  },
  FAN_SPEED: {
    name: 'Fan + Speed',
    capabilities: ['onoff', 'fan_speed'],
    deviceClass: 'fan'
  },
  AIR_PURIFIER: {
    name: 'Air Purifier',
    capabilities: ['onoff', 'fan_speed', 'measure_pm25'],
    deviceClass: 'fan'
  }
};

class CustomCapabilityTemplates {
  constructor() {
    this.templates = { ...TEMPLATES };
    this.customTemplates = new Map();
  }

  /**
   * Get a built-in template by key
   * @param {string} key - Template key (e.g., 'TEMP_HUMIDITY')
   * @returns {Object|null}
   */
  getTemplate(key) {
    return this.templates[key] || this.customTemplates.get(key) || null;
  }

  /**
   * Get all available template names
   * @returns {Array<{ key: string, name: string, deviceClass: string }>}
   */
  listTemplates() {
    const all = [];

    for (const [key, template] of Object.entries(this.templates)) {
      all.push({
        key,
        name: template.name,
        deviceClass: template.deviceClass,
        capabilityCount: template.capabilities.length,
        builtIn: true
      });
    }

    for (const [key, template] of this.customTemplates.entries()) {
      all.push({
        key,
        name: template.name,
        deviceClass: template.deviceClass,
        capabilityCount: template.capabilities.length,
        builtIn: false
      });
    }

    return all;
  }

  /**
   * Register a custom template
   * @param {string} key
   * @param {Object} template - { name, capabilities, deviceClass, subCapabilities }
   */
  registerTemplate(key, template) {
    if (!template.name || !template.capabilities || !Array.isArray(template.capabilities)) {
      throw new Error('Template must have name and capabilities array');
    }

    this.customTemplates.set(key, {
      name: template.name,
      capabilities: [...template.capabilities],
      deviceClass: template.deviceClass || 'other',
      subCapabilities: template.subCapabilities || [],
      custom: true,
      createdAt: Date.now()
    });
  }

  /**
   * Suggest a template based on detected capabilities/DPs
   * @param {Array<string>} detectedCapabilities
   * @param {string} deviceType
   * @returns {Object|null}
   */
  suggestTemplate(detectedCapabilities, deviceType) {
    const detected = new Set(detectedCapabilities);
    let bestMatch = null;
    let bestScore = 0;

    for (const [key, template] of Object.entries(this.templates)) {
      const templateCaps = new Set(template.capabilities);
      const overlap = [...templateCaps].filter(c => detected.has(c)).length;
      const score = overlap / templateCaps.size;

      if (score > bestScore && score >= 0.5) {
        bestScore = score;
        bestMatch = { key, template, score: Math.round(score * 100) };
      }
    }

    return bestMatch;
  }

  /**
   * Get capabilities for a template
   * @param {string} key
   * @returns {Array<string>}
   */
  getCapabilities(key) {
    const template = this.getTemplate(key);
    return template ? [...template.capabilities] : [];
  }

  /**
   * Create a capability set from a template
   * @param {string} key
   * @returns {Object} { capabilities, deviceClass, name }
   */
  createCapabilitySet(key) {
    const template = this.getTemplate(key);
    if (!template) return null;

    return {
      name: template.name,
      capabilities: [...template.capabilities],
      subCapabilities: [...(template.subCapabilities || [])],
      deviceClass: template.deviceClass
    };
  }

  /**
   * Export all templates as JSON
   */
  exportTemplates() {
    const all = {};
    for (const [key, template] of Object.entries(this.templates)) {
      all[key] = { ...template };
    }
    for (const [key, template] of this.customTemplates.entries()) {
      all[key] = { ...template };
    }
    return all;
  }
}

module.exports = CustomCapabilityTemplates;
