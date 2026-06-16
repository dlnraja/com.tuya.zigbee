'use strict';

/**
 * DPAutoMapper - v6.0.0
 *
 * DP-to-capability auto-mapping engine with value-range inference.
 *
 * Core responsibilities:
 * 1. Maintains a comprehensive mapping table of Tuya DP types to Homey capabilities
 * 2. Uses DP value ranges to infer capability types (temperature = -40..80 = measure_temperature)
 * 3. Uses DP type codes (bool, value, enum, string) for disambiguation
 * 4. Supports user overrides via device settings
 * 5. Logs all auto-mapping decisions with reasoning
 * 6. Integrates with Tuya's standard DP naming conventions
 * 7. Cross-references with manufacturer-specific DP databases
 *
 * Value Range Inference Rules:
 * - Bool type + common DP IDs -> alarm/switch capabilities
 * - Value type + range [-400,800] + divisor 10 -> temperature
 * - Value type + range [0,10000] + divisor 10 -> humidity
 * - Value type + range [0,100] -> battery or percentage
 * - Value type + range [0,100000] -> luminance
 * - Value type + range [0,50000] -> power (watts)
 * - Value type + range [1000,2600] + divisor 10 -> voltage
 * - Value type + range [0,100000] + divisor 1000 -> current (amps)
 * - Enum type + known values -> specific capabilities
 * - String type -> settings/info
 *
 * Integration:
 * - Called by DynamicCapabilityManager when confidence is low
 * - Called by AutoAdaptiveDevice for initial DP mapping
 * - Reads from device.dpMappings for pre-configured mappings
 */

/**
 * Comprehensive DP value range profiles for capability inference.
 * Each profile defines the expected value characteristics for a capability.
 */
const CAPABILITY_VALUE_PROFILES = {
  measure_temperature: {
    type: 'value',
    typicalRange: [-400, 800],  // Tuya sends as deca-Celsius (*10)
    divisor: 10,
    units: 'C',
    category: 'climate',
    description: 'Temperature in deca-Celsius (raw / 10 = actual C)',
    commonDPs: [1, 3, 5, 18, 24, 103],
    confidence: 0.9,
  },
  measure_humidity: {
    type: 'value',
    typicalRange: [0, 10000],  // Tuya sends as deca-percent (*100)
    divisor: 10,
    units: '%',
    category: 'climate',
    description: 'Humidity in deca-percent (raw / 10 = actual %)',
    commonDPs: [2, 4, 6, 19, 25],
    confidence: 0.85,
  },
  measure_battery: {
    type: 'value',
    typicalRange: [0, 100],
    divisor: null,
    units: '%',
    category: 'power',
    description: 'Battery percentage (0-100)',
    commonDPs: [4, 14, 15, 33, 35],
    confidence: 0.8,
  },
  measure_luminance: {
    type: 'value',
    typicalRange: [0, 100000],
    divisor: null,
    units: 'lux',
    category: 'environment',
    description: 'Luminance in lux',
    commonDPs: [7, 12, 20, 101, 103, 104, 106],
    confidence: 0.7,
  },
  measure_power: {
    type: 'value',
    typicalRange: [0, 50000],
    divisor: 10,
    units: 'W',
    category: 'energy',
    description: 'Power in deca-watts (raw / 10 = actual W)',
    commonDPs: [19, 20, 104, 112, 113],
    confidence: 0.8,
  },
  measure_voltage: {
    type: 'value',
    typicalRange: [1000, 2600],
    divisor: 10,
    units: 'V',
    category: 'energy',
    description: 'Voltage in deca-volts (raw / 10 = actual V)',
    commonDPs: [18, 20, 101, 111],
    confidence: 0.8,
  },
  measure_current: {
    type: 'value',
    typicalRange: [0, 100000],
    divisor: 1000,
    units: 'A',
    category: 'energy',
    description: 'Current in milliamps (raw / 1000 = actual A)',
    commonDPs: [18, 19, 102, 112],
    confidence: 0.8,
  },
  meter_power: {
    type: 'value',
    typicalRange: [0, 10000000],
    divisor: 100,
    units: 'kWh',
    category: 'energy',
    description: 'Energy in centi-kWh (raw / 100 = actual kWh)',
    commonDPs: [17, 101, 103, 121],
    confidence: 0.8,
  },
  measure_pressure: {
    type: 'value',
    typicalRange: [300, 1100],
    divisor: null,
    units: 'mbar',
    category: 'environment',
    description: 'Atmospheric pressure in mbar',
    commonDPs: [4, 8, 9],
    confidence: 0.7,
  },
  measure_co2: {
    type: 'value',
    typicalRange: [0, 5000],
    divisor: null,
    units: 'ppm',
    category: 'environment',
    description: 'CO2 concentration in ppm',
    commonDPs: [2, 22],
    confidence: 0.7,
  },
  measure_pm25: {
    type: 'value',
    typicalRange: [0, 1000],
    divisor: null,
    units: 'ug/m3',
    category: 'environment',
    description: 'PM2.5 in micrograms per cubic meter',
    commonDPs: [2, 6, 22],
    confidence: 0.7,
  },
  target_temperature: {
    type: 'value',
    typicalRange: [50, 350],
    divisor: 10,
    units: 'C',
    category: 'thermostat',
    description: 'Target temperature in deca-Celsius',
    commonDPs: [2, 16, 102],
    confidence: 0.75,
  },
  dim: {
    type: 'value',
    typicalRange: [0, 1000],
    divisor: 1000,
    units: '%',
    category: 'light',
    description: 'Dimmer level in milli-percent (raw / 1000 = 0-1)',
    commonDPs: [2, 3, 22],
    confidence: 0.7,
  },
  windowcoverings_set: {
    type: 'value',
    typicalRange: [0, 100],
    divisor: null,
    units: '%',
    category: 'cover',
    description: 'Cover position 0-100%',
    commonDPs: [2, 3, 102],
    confidence: 0.7,
  },

  // v10.2.0: Extended value range profiles for broader DP coverage

  measure_tvoc: {
    type: 'value',
    typicalRange: [0, 60000],
    divisor: null,
    units: 'ug/m3',
    category: 'environment',
    description: 'Total Volatile Organic Compounds in ug/m3',
    commonDPs: [2, 14, 22],
    confidence: 0.65,
  },
  measure_voc: {
    type: 'value',
    typicalRange: [0, 1000],
    divisor: null,
    units: 'ppb',
    category: 'environment',
    description: 'VOC concentration in ppb',
    commonDPs: [2, 14],
    confidence: 0.65,
  },
  measure_formaldehyde: {
    type: 'value',
    typicalRange: [0, 1000],
    divisor: 10,
    units: 'mg/m3',
    category: 'environment',
    description: 'Formaldehyde in deca-mg/m3 (raw / 10 = actual mg/m3)',
    commonDPs: [2, 22],
    confidence: 0.6,
  },
  measure_pm10: {
    type: 'value',
    typicalRange: [0, 1000],
    divisor: null,
    units: 'ug/m3',
    category: 'environment',
    description: 'PM10 in micrograms per cubic meter',
    commonDPs: [3, 6, 22],
    confidence: 0.65,
  },
  measure_noise: {
    type: 'value',
    typicalRange: [0, 130],
    divisor: null,
    units: 'dB',
    category: 'environment',
    description: 'Noise level in decibels',
    commonDPs: [10, 22],
    confidence: 0.6,
  },
  target_distance: {
    type: 'value',
    typicalRange: [0, 1500],
    divisor: null,
    units: 'cm',
    category: 'sensor',
    description: 'Target distance in centimeters (radar/PIR)',
    commonDPs: [9, 12],
    confidence: 0.65,
  },
  measure_occupancy: {
    type: 'value',
    typicalRange: [0, 100],
    divisor: null,
    units: '%',
    category: 'sensor',
    description: 'Occupancy percentage (mmWave radar)',
    commonDPs: [1, 102, 105],
    confidence: 0.6,
  },
  light_brightness: {
    type: 'value',
    typicalRange: [0, 1000],
    divisor: 10,
    units: '%',
    category: 'light',
    description: 'Light brightness in deca-percent (raw / 10 = actual %)',
    commonDPs: [2, 3, 102],
    confidence: 0.65,
  },
  light_color_temp: {
    type: 'value',
    typicalRange: [2700, 6500],
    divisor: null,
    units: 'K',
    category: 'light',
    description: 'Color temperature in Kelvin',
    commonDPs: [5, 11, 103],
    confidence: 0.65,
  },
  target_humidity: {
    type: 'value',
    typicalRange: [0, 100],
    divisor: null,
    units: '%',
    category: 'thermostat',
    description: 'Target humidity percentage',
    commonDPs: [102],
    confidence: 0.6,
  },
  measure_wind_speed: {
    type: 'value',
    typicalRange: [0, 6000],
    divisor: 10,
    units: 'm/s',
    category: 'environment',
    description: 'Wind speed in deca-m/s (raw / 10 = actual m/s)',
    commonDPs: [1, 10],
    confidence: 0.6,
  },
  measure_wind_direction: {
    type: 'value',
    typicalRange: [0, 360],
    divisor: null,
    units: 'deg',
    category: 'environment',
    description: 'Wind direction in degrees',
    commonDPs: [2, 11],
    confidence: 0.6,
  },
  measure_rain: {
    type: 'value',
    typicalRange: [0, 10000],
    divisor: null,
    units: 'mm',
    category: 'environment',
    description: 'Rain gauge in millimeters',
    commonDPs: [3, 12],
    confidence: 0.6,
  },
  measure_uv: {
    type: 'value',
    typicalRange: [0, 15],
    divisor: null,
    units: 'UV',
    category: 'environment',
    description: 'UV index (0-15)',
    commonDPs: [13],
    confidence: 0.65,
  },
  measure_amperage: {
    type: 'value',
    typicalRange: [0, 50000],
    divisor: 10,
    units: 'A',
    category: 'energy',
    description: 'Current in deca-amps (raw / 10 = actual A)',
    commonDPs: [19, 102, 112],
    confidence: 0.7,
  },
  measure_frequency: {
    type: 'value',
    typicalRange: [4500, 6500],
    divisor: 100,
    units: 'Hz',
    category: 'energy',
    description: 'AC frequency in centi-Hz (raw / 100 = actual Hz)',
    commonDPs: [18, 113],
    confidence: 0.6,
  },
  measure_power_factor: {
    type: 'value',
    typicalRange: [0, 100],
    divisor: 100,
    units: '',
    category: 'energy',
    description: 'Power factor (raw / 100 = 0.00-1.00)',
    commonDPs: [19, 114],
    confidence: 0.6,
  },
  curtain_status: {
    type: 'value',
    typicalRange: [0, 100],
    divisor: null,
    units: '%',
    category: 'cover',
    description: 'Curtain position (alternate DP for covers)',
    commonDPs: [2, 3],
    confidence: 0.6,
  },
};

/**
 * Boolean DP profiles for alarm/switch capabilities
 */
const BOOLEAN_DP_PROFILES = {
  alarm_motion: {
    type: 'bool',
    category: 'alarm',
    commonDPs: [1, 6, 101, 102, 105],
    confidence: 0.6,  // Lower confidence because DP1 bool could also be contact
  },
  alarm_contact: {
    type: 'bool',
    category: 'alarm',
    commonDPs: [1],
    confidence: 0.5,  // Very ambiguous with DP1
  },
  alarm_water: {
    type: 'bool',
    category: 'alarm',
    commonDPs: [1],
    confidence: 0.5,
  },
  alarm_battery: {
    type: 'bool',
    category: 'alarm',
    commonDPs: [14],
    confidence: 0.7,
  },
  onoff: {
    type: 'bool',
    category: 'switch',
    commonDPs: [1, 6, 20],
    confidence: 0.5,  // DP1 bool could be many things
  },
  // v10.2.0: Extended boolean DP profiles
  alarm_tamper: {
    type: 'bool',
    category: 'alarm',
    commonDPs: [11, 105, 107],
    confidence: 0.6,
  },
  alarm_co: {
    type: 'bool',
    category: 'alarm',
    commonDPs: [1, 101],
    confidence: 0.5,
  },
  alarm_gas: {
    type: 'bool',
    category: 'alarm',
    commonDPs: [1, 101],
    confidence: 0.5,
  },
  alarm_smoke: {
    type: 'bool',
    category: 'alarm',
    commonDPs: [1, 101],
    confidence: 0.55,
  },
  alarm_vibration: {
    type: 'bool',
    category: 'alarm',
    commonDPs: [1, 101],
    confidence: 0.5,
  },
  windowcoverings_state: {
    type: 'bool',
    category: 'cover',
    commonDPs: [8],
    confidence: 0.55,
  },
};

/**
 * Enum DP profiles for mode/settings capabilities
 */
const ENUM_DP_PROFILES = {
  thermostat_mode: {
    type: 'enum',
    category: 'thermostat',
    knownValues: { 0: 'off', 1: 'auto', 2: 'cool', 3: 'heat', 4: 'dry', 5: 'fan' },
    commonDPs: [2, 101],
    confidence: 0.7,
  },
  windowcoverings_state: {
    type: 'enum',
    category: 'cover',
    knownValues: { 0: 'open', 1: 'stop', 2: 'close' },
    commonDPs: [1, 102],
    confidence: 0.7,
  },
  // v10.2.0: Extended enum DP profiles
  fan_mode: {
    type: 'enum',
    category: 'thermostat',
    knownValues: { 0: 'off', 1: 'low', 2: 'medium', 3: 'high', 4: 'auto' },
    commonDPs: [2, 102],
    confidence: 0.65,
  },
  swing_mode: {
    type: 'enum',
    category: 'thermostat',
    knownValues: { 0: 'off', 1: 'vertical', 2: 'horizontal', 3: 'both' },
    commonDPs: [103],
    confidence: 0.6,
  },
  light_mode: {
    type: 'enum',
    category: 'light',
    knownValues: { 0: 'normal', 1: 'bright', 2: 'soft', 3: 'colorful' },
    commonDPs: [101, 102],
    confidence: 0.55,
  },
  backlight_mode: {
    type: 'enum',
    category: 'switch',
    knownValues: { 0: 'off', 1: 'normal', 2: 'inverted' },
    commonDPs: [104, 105],
    confidence: 0.6,
  },
  pir_sensitivity: {
    type: 'enum',
    category: 'sensor',
    knownValues: { 0: 'low', 1: 'medium', 2: 'high' },
    commonDPs: [9, 101],
    confidence: 0.6,
  },
  temperature_unit: {
    type: 'enum',
    category: 'climate',
    knownValues: { 0: 'celsius', 1: 'fahrenheit' },
    commonDPs: [9],
    confidence: 0.7,
  },
  cover_mode: {
    type: 'enum',
    category: 'cover',
    knownValues: { 0: 'standard', 1: 'reverse', 2: 'momentary' },
    commonDPs: [103, 104],
    confidence: 0.55,
  },
  switch_mode: {
    type: 'enum',
    category: 'switch',
    knownValues: { 0: 'off', 1: 'on', 2: 'restore_last' },
    commonDPs: [12, 104],
    confidence: 0.55,
  },
  curtain_mode: {
    type: 'enum',
    category: 'cover',
    knownValues: { 0: 'standard', 1: 'momentary' },
    commonDPs: [103],
    confidence: 0.5,
  },
};

class DPAutoMapper {

  constructor(device) {
    this.device = device;
    this.homey = device.homey;
    this.log = (...args) => device.log('[DP-MAP]', ...args);
    this.error = (...args) => device.error('[DP-MAP]', ...args);

    // User override mappings (from device settings)
    this._userOverrides = new Map();

    // Mapping decisions log
    this._mappingLog = [];
    this._maxLogSize = 200;

    // Confidence thresholds
    this.AUTO_MAP_THRESHOLD = 0.6;
    this.SUGGEST_MAP_THRESHOLD = 0.4;
  }

  /**
   * Initialize auto-mapper with user overrides from settings
   */
  async initialize() {
    // Load user overrides from device settings
    try {
      const overrideJson = this.device.getSetting?.('dp_capability_overrides');
      if (overrideJson) {
        const overrides = typeof overrideJson === 'string' ? JSON.parse(overrideJson) : overrideJson;
        for (const [dpId, capability] of Object.entries(overrides)) {
          this._userOverrides.set(parseInt(dpId), capability);
        }
        this.log(`Loaded ${this._userOverrides.size} user overrides`);
      }
    } catch (err) {
      // No overrides or parse error
    }

    // Load device dpMappings as overrides
    if (this.device.dpMappings) {
      for (const [dpId, mapping] of Object.entries(this.device.dpMappings)) {
        if (mapping && mapping.capability) {
          this._userOverrides.set(parseInt(dpId), mapping.capability);
        }
      }
    }
  }

  /**
   * Map a DP to the best capability using value-range inference.
   *
   * @param {number} dpId - DataPoint ID
   * @param {any} value - Current DP value
   * @param {string} dpType - DP type string ('bool', 'value', 'enum', 'string', 'raw')
   * @param {Object} context - Additional context { manufacturer, deviceType, existingDPs }
   * @returns {Object|null} Mapping result { capability, converter, confidence, reasoning }
   */
  mapDPToCapability(dpId, value, dpType, context = {}) {
    // 1. Check user overrides first (highest priority)
    if (this._userOverrides.has(dpId)) {
      const capability = this._userOverrides.get(dpId);
      const result = {
        capability,
        converter: this._getDefaultConverter(capability),
        confidence: 1.0,
        reasoning: `User override: DP${dpId} explicitly mapped to ${capability}`,
        source: 'user_override',
      };
      this._logMapping(dpId, result);
      return result;
    }

    // 2. Check device dpMappings
    if (this.device.dpMappings && this.device.dpMappings[dpId]) {
      const mapping = this.device.dpMappings[dpId];
      if (mapping.capability) {
        const result = {
          capability: mapping.capability,
          converter: mapping.parser || mapping.transform || this._getDefaultConverter(mapping.capability),
          confidence: 1.0,
          reasoning: `Device dpMappings: DP${dpId} -> ${mapping.capability}`,
          source: 'device_mappings',
        };
        this._logMapping(dpId, result);
        return result;
      }
    }

    // 3. Value-range inference for numeric DPs
    if (dpType === 'value' && typeof value === 'number') {
      return this._inferFromValueRange(dpId, value, context);
    }

    // 4. Boolean type inference
    if (dpType === 'bool' || (dpType === 'enum' && typeof value === 'number' && value <= 1)) {
      return this._inferFromBoolType(dpId, value, context);
    }

    // 5. Enum type inference
    if (dpType === 'enum' && typeof value === 'number') {
      return this._inferFromEnumType(dpId, value, context);
    }

    // 6. No confident mapping
    this.log(`No auto-mapping found for DP${dpId} (type: ${dpType}, value: ${JSON.stringify(value)})`);
    return null;
  }

  /**
   * Infer capability from value range analysis
   */
  _inferFromValueRange(dpId, value, context) {
    let bestMatch = null;
    let bestScore = 0;
    let bestReasoning = '';

    for (const [capability, profile] of Object.entries(CAPABILITY_VALUE_PROFILES)) {
      if (profile.type !== 'value') continue;

      let score = 0;
      const reasons = [];

      // Factor 1: DP ID match in common DPs
      if (profile.commonDPs.includes(dpId)) {
        score += 0.3;
        reasons.push(`DP${dpId} is a common ${capability} DP`);
      }

      // Factor 2: Value within typical range
      const [min, max] = profile.typicalRange;
      if (value >= min && value <= max) {
        score += 0.25;
        reasons.push(`Value ${value} within range [${min}, ${max}]`);
      } else if (value >= min * 0.5 && value <= max * 2) {
        score += 0.1;
        reasons.push(`Value ${value} near range [${min}, ${max}]`);
      }

      // Factor 3: Category context match
      if (context.deviceType && profile.category) {
        if (context.deviceType === profile.category ||
            context.deviceType.includes(profile.category)) {
          score += 0.15;
          reasons.push(`Device type matches category: ${profile.category}`);
        }
      }

      // Factor 4: Existing DPs in same category (multi-sensor deduction)
      if (context.existingDPs && profile.commonDPs) {
        const overlap = context.existingDPs.filter(dp => profile.commonDPs.includes(dp));
        if (overlap.length > 0) {
          score += 0.1;
          reasons.push(`Related DPs already mapped: ${overlap.join(',')}`);
        }
      }

      // Factor 5: Divisor plausibility
      if (profile.divisor) {
        const divided = value / profile.divisor;
        const [divMin, divMax] = profile.typicalRange.map(v => v / profile.divisor);
        if (divided >= divMin && divided <= divMax) {
          score += 0.1;
          reasons.push(`Value/divisor = ${divided} within expected range`);
        }
      }

      // Base confidence from profile
      score *= profile.confidence;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          capability,
          converter: profile.divisor ? `divideBy${profile.divisor}` : null,
          confidence: Math.min(1.0, score),
          reasoning: reasons.join('; '),
          source: 'value_range_inference',
          profile: profile.description,
        };
      }
    }

    if (bestMatch && bestMatch.confidence >= this.SUGGEST_MAP_THRESHOLD) {
      this._logMapping(dpId, bestMatch);
      return bestMatch;
    }

    return null;
  }

  /**
   * Infer capability from boolean type
   */
  _inferFromBoolType(dpId, value, context) {
    let bestMatch = null;
    let bestScore = 0;

    for (const [capability, profile] of Object.entries(BOOLEAN_DP_PROFILES)) {
      let score = 0;
      const reasons = [];

      // DP ID match
      if (profile.commonDPs.includes(dpId)) {
        score += 0.3;
        reasons.push(`DP${dpId} is a common ${capability} DP`);
      }

      // Category context
      if (context.deviceType) {
        if (context.deviceType === 'alarm' && profile.category === 'alarm') {
          score += 0.2;
          reasons.push('Device is alarm type');
        }
        if (context.deviceType === 'switch' && profile.category === 'switch') {
          score += 0.2;
          reasons.push('Device is switch type');
        }
      }

      score *= profile.confidence;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          capability,
          converter: 'toBoolean',
          confidence: Math.min(1.0, score),
          reasoning: reasons.join('; ') || `Bool DP${dpId} inferred as ${capability}`,
          source: 'bool_type_inference',
        };
      }
    }

    if (bestMatch && bestMatch.confidence >= this.SUGGEST_MAP_THRESHOLD) {
      this._logMapping(dpId, bestMatch);
      return bestMatch;
    }

    // Fallback: generic boolean
    return {
      capability: `tuya_dp_${dpId}`,
      converter: 'toBoolean',
      confidence: 0.1,
      reasoning: `Bool DP${dpId} - no confident mapping, using generic`,
      source: 'bool_fallback',
    };
  }

  /**
   * Infer capability from enum type
   */
  _inferFromEnumType(dpId, value, context) {
    for (const [capability, profile] of Object.entries(ENUM_DP_PROFILES)) {
      if (profile.commonDPs.includes(dpId)) {
        const result = {
          capability,
          converter: null,
          confidence: profile.confidence,
          reasoning: `Enum DP${dpId} matched ${capability} profile`,
          source: 'enum_type_inference',
          knownValues: profile.knownValues,
        };
        this._logMapping(dpId, result);
        return result;
      }
    }

    return null;
  }

  /**
   * Get default converter for a capability
   */
  _getDefaultConverter(capability) {
    const profile = CAPABILITY_VALUE_PROFILES[capability];
    if (profile && profile.divisor) {
      return `divideBy${profile.divisor}`;
    }
    return null;
  }

  /**
   * Add a user override mapping
   */
  setUserOverride(dpId, capability) {
    this._userOverrides.set(dpId, capability);
    this.log(`User override set: DP${dpId} -> ${capability}`);
  }

  /**
   * Remove a user override
   */
  removeUserOverride(dpId) {
    this._userOverrides.delete(dpId);
    this.log(`User override removed for DP${dpId}`);
  }

  /**
   * Get all user overrides
   */
  getUserOverrides() {
    return Object.fromEntries(this._userOverrides);
  }

  /**
   * Export mapping decisions as JSON for debugging
   */
  exportMappingLog() {
    return this._mappingLog.map(entry => ({
      dpId: entry.dpId,
      capability: entry.result.capability,
      confidence: entry.result.confidence,
      source: entry.result.source,
      reasoning: entry.result.reasoning,
      timestamp: entry.timestamp,
    }));
  }

  /**
   * Log mapping decision
   */
  _logMapping(dpId, result) {
    const entry = {
      dpId,
      result: { ...result },
      timestamp: Date.now(),
    };

    this._mappingLog.push(entry);
    if (this._mappingLog.length > this._maxLogSize) {
      this._mappingLog.shift();
    }

    this.log(`Mapping: DP${dpId} -> ${result.capability} (${result.source}, confidence: ${(result.confidence * 100).toFixed(0)}%)`);
    if (result.reasoning) {
      this.log(`  Reasoning: ${result.reasoning}`);
    }
  }

  /**
   * Get capability suggestions for unmapped DPs (for UI display)
   */
  getSuggestions(dpId, value, dpType, context = {}) {
    const result = this.mapDPToCapability(dpId, value, dpType, context);
    if (!result) return [];

    // Build suggestion list with alternatives
    const suggestions = [result];

    // Add alternative mappings with slightly lower confidence
    if (dpType === 'value' && typeof value === 'number') {
      for (const [capability, profile] of Object.entries(CAPABILITY_VALUE_PROFILES)) {
        if (capability === result.capability) continue;
        if (profile.type !== 'value') continue;

        const [min, max] = profile.typicalRange;
        if (value >= min && value <= max) {
          suggestions.push({
            capability,
            converter: profile.divisor ? `divideBy${profile.divisor}` : null,
            confidence: profile.confidence * 0.5,
            reasoning: `Alternative: value ${value} within ${capability} range`,
            source: 'alternative',
          });
        }
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }
}

module.exports = DPAutoMapper;
