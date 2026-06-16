'use strict';

/**
 * Settings UI with Tooltips - UX #88
 *
 * Provides tooltip definitions and settings validation for device settings:
 * - Human-readable tooltip text for every setting
 * - Settings validation with descriptive error messages
 * - Settings group organization
 * - Default value management
 *
 * @version 9.1.0
 */

const SETTINGS_TOOLTIPS = {
  // ─── General Settings ─────────────────────────────────────────────
  zb_model_id: {
    label: 'Zigbee Model ID',
    tooltip: 'The Tuya model identifier reported by the device. Used for fingerprint matching and driver assignment. Do not modify unless you know the correct model ID.',
    type: 'text',
    required: true
  },
  zb_manufacturer_name: {
    label: 'Manufacturer Name',
    tooltip: 'The Tuya manufacturer string reported by the device. Combined with model ID for device identification. Must match exactly (case-insensitive).',
    type: 'text',
    required: true
  },

  // ─── Power Settings ───────────────────────────────────────────────
  high_power_threshold: {
    label: 'High Power Alert (W)',
    tooltip: 'Alert when power consumption exceeds this threshold. Default: 3000W. Useful for detecting appliances that may overload circuits.',
    type: 'number',
    min: 100,
    max: 10000,
    defaultValue: 3000
  },
  low_power_threshold: {
    label: 'Standby Power Threshold (W)',
    tooltip: 'Power below this value is considered standby mode. Default: 1W. Used for standby detection in energy monitoring.',
    type: 'number',
    min: 0,
    max: 100,
    defaultValue: 1
  },
  energy_cost_per_kwh: {
    label: 'Energy Cost (per kWh)',
    tooltip: 'Your electricity cost for energy cost calculations. Enter in your local currency per kilowatt-hour.',
    type: 'number',
    min: 0,
    max: 5,
    defaultValue: 0.25
  },

  // ─── Sensor Settings ──────────────────────────────────────────────
  temperature_offset: {
    label: 'Temperature Offset',
    tooltip: 'Calibration offset applied to temperature readings. Use positive values to increase, negative to decrease. Useful if sensor reads consistently high or low.',
    type: 'number',
    min: -10,
    max: 10,
    defaultValue: 0
  },
  humidity_offset: {
    label: 'Humidity Offset',
    tooltip: 'Calibration offset applied to humidity readings. Adjust if the sensor reads higher or lower than a known reference.',
    type: 'number',
    min: -20,
    max: 20,
    defaultValue: 0
  },
  occupancy_hold_time: {
    label: 'Occupancy Hold Time (seconds)',
    tooltip: 'How long to keep occupancy state active after last motion detected. Increase for areas where brief pauses between movements are common.',
    type: 'number',
    min: 5,
    max: 600,
    defaultValue: 30
  },
  motion_sensitivity: {
    label: 'Motion Sensitivity',
    tooltip: 'Controls motion detection sensitivity. Low = fewer false triggers but may miss subtle movement. High = detects more movement but may have more false triggers.',
    type: 'dropdown',
    options: ['low', 'medium', 'high'],
    defaultValue: 'medium'
  },

  // ─── Filter Settings ──────────────────────────────────────────────
  filter_low_threshold: {
    label: 'Filter Life Warning (%)',
    tooltip: 'Show warning when filter life drops below this percentage. Default: 10%. You will receive a notification to replace the filter.',
    type: 'number',
    min: 1,
    max: 50,
    defaultValue: 10
  },

  // ─── Cover Settings ───────────────────────────────────────────────
  invert_cover_position: {
    label: 'Invert Cover Position',
    tooltip: 'Enable if the cover reports open when closed and vice versa. Some motors have inverted position reporting.',
    type: 'boolean',
    defaultValue: false
  },
  cover_tilt_enabled: {
    label: 'Enable Tilt Control',
    tooltip: 'Enable slat/tilt angle control for venetian blinds and similar coverings. Only available on compatible motors.',
    type: 'boolean',
    defaultValue: false
  },

  // ─── Lock Settings ────────────────────────────────────────────────
  auto_lock_delay: {
    label: 'Auto-Lock Delay (seconds)',
    tooltip: 'Automatically lock the door after this many seconds. Set to 0 to disable auto-lock. Range: 5-300 seconds.',
    type: 'number',
    min: 0,
    max: 300,
    defaultValue: 0
  },

  // ─── Network Settings ─────────────────────────────────────────────
  health_check_interval: {
    label: 'Health Check Interval (minutes)',
    tooltip: 'How often to check device connectivity. Shorter intervals detect offline devices faster but use slightly more resources.',
    type: 'number',
    min: 1,
    max: 60,
    defaultValue: 5
  },
  signal_weak_threshold: {
    label: 'Signal Weak Alert (dBm)',
    tooltip: 'Alert when Zigbee signal drops below this level. Default: -85 dBm. Values closer to 0 are stronger signals.',
    type: 'number',
    min: -100,
    max: -50,
    defaultValue: -85
  },

  // ─── Advanced Settings ────────────────────────────────────────────
  developer_debug_mode: {
    label: 'Developer Debug Mode',
    tooltip: 'Enable verbose logging for debugging. This generates significantly more log output and should only be enabled temporarily when troubleshooting.',
    type: 'boolean',
    defaultValue: false
  },
  max_rx_per_minute: {
    label: 'Max RX Messages/Minute',
    tooltip: 'Maximum incoming messages per device per minute. Messages exceeding this limit are dropped. Default: 120. Only adjust if devices report missed data.',
    type: 'number',
    min: 10,
    max: 500,
    defaultValue: 120
  }
};

class SettingsUITooltips {
  constructor() {
    this.tooltips = { ...SETTINGS_TOOLTIPS };
    this.customTooltips = new Map();
  }

  /**
   * Get tooltip for a setting key
   * @param {string} key
   * @returns {Object|null}
   */
  getTooltip(key) {
    return this.tooltips[key] || this.customTooltips.get(key) || null;
  }

  /**
   * Get all tooltips for a list of setting keys
   * @param {Array<string>} keys
   * @returns {Object} key -> tooltip
   */
  getTooltipsForKeys(keys) {
    const result = {};
    for (const key of keys) {
      const tooltip = this.getTooltip(key);
      if (tooltip) {
        result[key] = tooltip;
      }
    }
    return result;
  }

  /**
   * Get all tooltips
   */
  getAllTooltips() {
    const all = { ...this.tooltips };
    for (const [key, value] of this.customTooltips.entries()) {
      all[key] = value;
    }
    return all;
  }

  /**
   * Register a custom tooltip
   * @param {string} key
   * @param {Object} tooltip - { label, tooltip, type, ... }
   */
  registerTooltip(key, tooltip) {
    this.customTooltips.set(key, {
      label: tooltip.label || key,
      tooltip: tooltip.tooltip || '',
      type: tooltip.type || 'text',
      ...tooltip
    });
  }

  /**
   * Validate a setting value
   * @param {string} key
   * @param {*} value
   * @returns {{ valid: boolean, error: string|null, sanitized: * }}
   */
  validateSetting(key, value) {
    const tooltip = this.getTooltip(key);
    if (!tooltip) return { valid: true, error: null, sanitized: value };

    switch (tooltip.type) {
    case 'number': {
      const num = Number(value);
      if (isNaN(num)) return { valid: false, error: `${tooltip.label} must be a number`, sanitized: value };
      if (tooltip.min !== undefined && num < tooltip.min) {
        return { valid: false, error: `${tooltip.label} must be at least ${tooltip.min}`, sanitized: tooltip.min };
      }
      if (tooltip.max !== undefined && num > tooltip.max) {
        return { valid: false, error: `${tooltip.label} must be at most ${tooltip.max}`, sanitized: tooltip.max };
      }
      return { valid: true, error: null, sanitized: num };
    }
    case 'boolean': {
      if (typeof value !== 'boolean') {
        return { valid: true, error: null, sanitized: value === 'true' || value === '1' || value === true };
      }
      return { valid: true, error: null, sanitized: value };
    }
    case 'dropdown': {
      if (tooltip.options && !tooltip.options.includes(value)) {
        return { valid: false, error: `${tooltip.label} must be one of: ${tooltip.options.join(', ')}`, sanitized: tooltip.defaultValue };
      }
      return { valid: true, error: null, sanitized: value };
    }
    default:
      return { valid: true, error: null, sanitized: value };
    }
  }

  /**
   * Get settings groups for organized display
   */
  getSettingsGroups() {
    return {
      general: ['zb_model_id', 'zb_manufacturer_name'],
      power: ['high_power_threshold', 'low_power_threshold', 'energy_cost_per_kwh'],
      sensor: ['temperature_offset', 'humidity_offset', 'occupancy_hold_time', 'motion_sensitivity'],
      filter: ['filter_low_threshold'],
      cover: ['invert_cover_position', 'cover_tilt_enabled'],
      lock: ['auto_lock_delay'],
      network: ['health_check_interval', 'signal_weak_threshold'],
      advanced: ['developer_debug_mode', 'max_rx_per_minute']
    };
  }
}

module.exports = SettingsUITooltips;
