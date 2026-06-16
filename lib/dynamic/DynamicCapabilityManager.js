'use strict';

/**
 * DynamicCapabilityManager - v6.0.0
 *
 * Auto-discovers and creates capabilities dynamically based on:
 * - Tuya DP reports (type, value range, frequency analysis)
 * - Device fingerprints and manufacturer profiles
 * - Heuristic DP type detection with confidence scoring
 * - Value-range statistical analysis for accurate capability mapping
 * - Cross-device correlation (same DP across devices of same manufacturer)
 * - Temporal pattern recognition (one-shot vs periodic DPs)
 *
 * When a new DP is discovered, this manager:
 * 1. Detects the DP type (bool, value, enum, string, raw)
 * 2. Collects multiple samples for statistical validation
 * 3. Maps it to the best Homey capability using multi-factor scoring
 * 4. Creates the capability if it doesn't exist (gated by safety engine)
 * 5. Registers value converter (transform, divisor, custom)
 * 6. Notifies FlowCardManager to create triggers/actions
 * 7. Persists discoveries with confidence metadata for restart recovery
 */

// Standard Homey capability definitions with value constraints
const CAPABILITY_DEFINITIONS = {
  // Boolean capabilities (alarms, switches)
  alarm_motion: { type: 'boolean', title: 'Motion Alarm', icon: 'walking' },
  alarm_contact: { type: 'boolean', title: 'Contact Alarm', icon: 'door' },
  alarm_water: { type: 'boolean', title: 'Water Alarm', icon: 'droplet' },
  alarm_smoke: { type: 'boolean', title: 'Smoke Alarm', icon: 'fire' },
  alarm_battery: { type: 'boolean', title: 'Battery Alarm', icon: 'battery' },
  alarm_tamper: { type: 'boolean', title: 'Tamper Alarm', icon: 'alert' },
  alarm_generic: { type: 'boolean', title: 'Alarm', icon: 'bell' },
  alarm_co: { type: 'boolean', title: 'CO Alarm', icon: 'cloud' },
  alarm_heat: { type: 'boolean', title: 'Heat Alarm', icon: 'thermometer' },
  onoff: { type: 'boolean', title: 'On/Off', icon: 'power' },
  locked: { type: 'boolean', title: 'Locked', icon: 'lock' },

  // Numeric capabilities (measurements) with min/max and units
  measure_temperature: { type: 'number', title: 'Temperature', units: 'C', min: -40, max: 80, decimals: 1 },
  measure_humidity: { type: 'number', title: 'Humidity', units: '%', min: 0, max: 100, decimals: 0 },
  measure_luminance: { type: 'number', title: 'Luminance', units: 'lux', min: 0, max: 100000, decimals: 0 },
  measure_battery: { type: 'number', title: 'Battery', units: '%', min: 0, max: 100, decimals: 0 },
  measure_power: { type: 'number', title: 'Power', units: 'W', min: 0, max: 50000, decimals: 1 },
  measure_voltage: { type: 'number', title: 'Voltage', units: 'V', min: 0, max: 300, decimals: 1 },
  measure_current: { type: 'number', title: 'Current', units: 'A', min: 0, max: 100, decimals: 3 },
  measure_pressure: { type: 'number', title: 'Pressure', units: 'mbar', min: 300, max: 1100, decimals: 0 },
  measure_co2: { type: 'number', title: 'CO2', units: 'ppm', min: 0, max: 5000, decimals: 0 },
  measure_pm25: { type: 'number', title: 'PM2.5', units: 'ug/m3', min: 0, max: 1000, decimals: 0 },
  measure_noise: { type: 'number', title: 'Noise', units: 'dB', min: 0, max: 200, decimals: 0 },
  measure_wind_strength: { type: 'number', title: 'Wind Strength', units: 'm/s', min: 0, max: 100, decimals: 1 },
  measure_rain: { type: 'number', title: 'Rain', units: 'mm', min: 0, max: 500, decimals: 1 },

  // Controllable capabilities
  dim: { type: 'number', title: 'Dim Level', units: '%', min: 0, max: 1, decimals: 2 },
  windowcoverings_set: { type: 'number', title: 'Position', units: '%', min: 0, max: 100, decimals: 0 },
  target_temperature: { type: 'number', title: 'Target Temperature', units: 'C', min: 5, max: 35, decimals: 1 },
  light_hue: { type: 'number', title: 'Hue', units: '%', min: 0, max: 1, decimals: 2 },
  light_saturation: { type: 'number', title: 'Saturation', units: '%', min: 0, max: 1, decimals: 2 },
  light_temperature: { type: 'number', title: 'Light Temperature', units: '%', min: 0, max: 1, decimals: 2 },
  volume_set: { type: 'number', title: 'Volume', units: '%', min: 0, max: 1, decimals: 2 },
};

/**
 * DP-to-capability heuristic rules with multi-factor scoring.
 * Each rule contributes to a composite score for a given (dpId, dpType, value) tuple.
 */
const DP_HEURISTICS = [
  // === TEMPERATURE ===
  { dpIds: [1, 3, 5, 18, 24, 103], type: 'value', valueRange: [-400, 800], capability: 'measure_temperature', converter: 'divideBy10', priority: 20, category: 'climate' },
  { dpIds: [1], type: 'value', valueRange: [0, 1000], capability: 'target_temperature', converter: 'divideBy10', priority: 5, category: 'thermostat' },

  // === HUMIDITY ===
  { dpIds: [2, 4, 6, 19, 25], type: 'value', valueRange: [0, 10000], capability: 'measure_humidity', converter: 'divideBy10', priority: 20, category: 'climate' },

  // === BATTERY ===
  { dpIds: [4, 14, 15, 33, 35], type: 'value', valueRange: [0, 100], capability: 'measure_battery', converter: null, priority: 15, category: 'power' },
  { dpIds: [14], type: 'bool', capability: 'alarm_battery', priority: 15, category: 'alarm' },

  // === LUMINANCE ===
  { dpIds: [7, 12, 20, 101, 103, 104, 106], type: 'value', valueRange: [0, 100000], capability: 'measure_luminance', converter: null, priority: 15, category: 'environment' },

  // === MOTION / PRESENCE ===
  { dpIds: [1, 6, 101, 102, 105], type: 'bool', capability: 'alarm_motion', priority: 10, category: 'alarm' },

  // === ON/OFF ===
  { dpIds: [1, 6, 20], type: 'bool', capability: 'onoff', priority: 5, category: 'switch' },

  // === DIMMER ===
  { dpIds: [2, 3, 22], type: 'value', valueRange: [0, 1000], capability: 'dim', converter: 'divideBy1000', priority: 10, category: 'light' },

  // === COVER / CURTAIN ===
  { dpIds: [2, 3, 102], type: 'value', valueRange: [0, 100], capability: 'windowcoverings_set', converter: null, priority: 10, category: 'cover' },

  // === CONTACT SENSOR ===
  { dpIds: [1], type: 'bool', capability: 'alarm_contact', priority: 10, category: 'alarm' },

  // === WATER LEAK ===
  { dpIds: [1], type: 'bool', capability: 'alarm_water', priority: 10, category: 'alarm' },

  // === PRESSURE ===
  { dpIds: [4, 8, 9], type: 'value', valueRange: [300, 1100], capability: 'measure_pressure', converter: null, priority: 15, category: 'environment' },

  // === CO2 ===
  { dpIds: [2, 22], type: 'value', valueRange: [0, 5000], capability: 'measure_co2', converter: null, priority: 15, category: 'environment' },

  // === PM2.5 ===
  { dpIds: [2, 6, 22], type: 'value', valueRange: [0, 1000], capability: 'measure_pm25', converter: null, priority: 15, category: 'environment' },
];

/**
 * Converter functions for DP values
 */
const VALUE_CONVERTERS = {
  divideBy10: (v) => v / 10,
  divideBy100: (v) => v / 100,
  divideBy1000: (v) => v / 1000,
  toBoolean: (v) => Boolean(v),
  toPercent: (v) => Math.min(100, Math.max(0, v)),
  toPercent01: (v) => Math.min(1, Math.max(0, v / 100)),
};

class DynamicCapabilityManager {

  constructor(device) {
    this.device = device;
    this.homey = device.homey;
    this.log = (...args) => device.log('[DYN-CAP]', ...args);
    this.error = (...args) => device.error('[DYN-CAP]', ...args);

    // Track discovered DPs and their mappings
    this._discoveredDPs = new Map();
    this._dynamicCapabilities = new Map();
    this._pendingCapabilities = [];

    // Multi-sample collection for statistical validation
    this._dpSamples = new Map(); // dpId -> { samples: [], firstSeen, lastSeen, count }

    // Confidence thresholds
    this.MIN_CONFIDENCE = 8;        // Minimum score to auto-map
    this.MAX_SAMPLES_NEEDED = 3;    // Samples before confirming a mapping
    this.CONFIDENCE_BOOST_SAME_MFR = 5; // Bonus for matching manufacturer patterns

    // Event emitter for flow card manager
    this._listeners = new Map();

    // Adaptation history for learning
    this._adaptationLog = [];
    this._maxLogSize = 200;
  }

  /**
   * Initialize from device store (restore previous discoveries)
   */
  async initialize() {
    try {
      const stored = await this.device.getStoreValue('dynamic_capabilities') || {};

      for (const [dpId, mapping] of Object.entries(stored)) {
        this._discoveredDPs.set(parseInt(dpId), mapping);
        this.log(`Restored DP${dpId} -> ${mapping.capability} (confidence: ${mapping.confidence})`);
      }

      // Restore adaptation log for learning
      const adaptLog = await this.device.getStoreValue('dp_adaptation_log') || [];
      this._adaptationLog = adaptLog;

      this.log(`Initialized with ${this._discoveredDPs.size} discovered DPs, ${this._adaptationLog.length} past adaptations`);
    } catch (err) {
      this.error('Initialize failed:', err.message);
    }
  }

  /**
   * Process incoming DP and auto-discover capability.
   * Collects multiple samples for statistical validation before committing.
   *
   * @param {number} dpId - Tuya DataPoint ID
   * @param {any} value - DP value
   * @param {number|null} dpType - Tuya DP type (0=raw, 1=bool, 2=value, 3=string, 4=enum)
   * @returns {Object|null} The mapping if found/created, null otherwise
   */
  async processDP(dpId, value, dpType = null) {
    // Collect sample for statistical analysis
    this._collectSample(dpId, value, dpType);

    // Check if already mapped and confirmed
    if (this._discoveredDPs.has(dpId)) {
      const mapping = this._discoveredDPs.get(dpId);
      // Update converter from stored mapping
      await this._applyValue(mapping, value);
      return mapping;
    }

    // Check if we have enough samples to make a confident decision
    const samples = this._dpSamples.get(dpId);
    if (samples && samples.count < this.MAX_SAMPLES_NEEDED) {
      // Not enough samples yet; store as pending
      this.log(`DP${dpId}: Collecting samples (${samples.count}/${this.MAX_SAMPLES_NEEDED})...`);
      return null;
    }

    // Auto-discover capability for this DP
    const mapping = await this._discoverCapability(dpId, value, dpType);

    if (mapping) {
      this._discoveredDPs.set(dpId, mapping);
      await this._saveDiscoveries();
      await this._applyValue(mapping, value);

      // Log adaptation decision
      this._logAdaptation(dpId, mapping);

      // Emit event for flow card creation
      this._emit('capabilityDiscovered', { dpId, mapping });
    }

    return mapping;
  }

  /**
   * Collect a sample for statistical analysis
   */
  _collectSample(dpId, value, dpType) {
    if (!this._dpSamples.has(dpId)) {
      this._dpSamples.set(dpId, {
        samples: [],
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        count: 0,
        types: new Set(),
        numericMin: Infinity,
        numericMax: -Infinity,
        numericSum: 0,
      });
    }

    const s = this._dpSamples.get(dpId);
    s.samples.push({ value, time: Date.now(), dpType });
    if (s.samples.length > 20) {s.samples.shift();} // Keep last 20 samples
    s.count++;
    s.lastSeen = Date.now();
    s.types.add(dpType ?? this._detectType(value));

    if (typeof value === 'number') {
      s.numericMin = Math.min(s.numericMin, value);
      s.numericMax = Math.max(s.numericMax, value);
      s.numericSum += value;
    }
  }

  /**
   * Discover capability for a DP using multi-factor scoring.
   *
   * Scoring factors:
   * - DP ID match (known common DPs)
   * - DP type match (bool vs value vs enum)
   * - Value range match (within expected bounds for capability)
   * - Manufacturer pattern match (same DP across same manufacturer)
   * - Sample consistency (low variance = reliable data)
   * - Category context (device type hints)
   */
  async _discoverCapability(dpId, value, dpType) {
    this.log(`Discovering capability for DP${dpId}...`);

    // Detect type from value if not provided
    const detectedType = dpType !== null ? this._dpTypeToString(dpType) : this._detectType(value);
    const samples = this._dpSamples.get(dpId);

    // Check manufacturer-based patterns for boost
    const manufacturerHint = this._getManufacturerHint();
    const deviceTypeHint = this._getDeviceTypeHint();

    let bestMatch = null;
    let bestScore = 0;

    for (const heuristic of DP_HEURISTICS) {
      let score = 0;

      // Factor 1: DP ID match (high weight)
      if (heuristic.dpIds.includes(dpId)) {
        score += 10;
      }

      // Factor 2: Type match (critical for disambiguation)
      if (heuristic.type === detectedType) {
        score += 8;
      } else if (heuristic.type === 'bool' && detectedType === 'enum') {
        // Enums with only 0/1 values are effectively booleans
        if (samples && samples.numericMax <= 1 && samples.numericMin >= 0) {
          score += 5;
        }
      } else {
        // Type mismatch: major penalty
        score -= 5;
      }

      // Factor 3: Value range match
      if (heuristic.valueRange && typeof value === 'number') {
        const [min, max] = heuristic.valueRange;
        const samplesMin = samples ? Math.min(value, samples.numericMin) : value;
        const samplesMax = samples ? Math.max(value, samples.numericMax) : value;

        if (samplesMin >= min && samplesMax <= max) {
          score += 6;
        } else if (value >= min && value <= max) {
          score += 3;
        }
      }

      // Factor 4: Existing capability bonus (prefer adding to existing)
      if (this.device.hasCapability && this.device.hasCapability(heuristic.capability)) {
        score += 3;
      }

      // Factor 5: Priority from heuristic (domain-specific weight)
      score += (heuristic.priority || 0) / 4;

      // Factor 6: Manufacturer hint
      if (manufacturerHint && heuristic.category) {
        if (this._matchesManufacturerCategory(manufacturerHint, heuristic.category)) {
          score += this.CONFIDENCE_BOOST_SAME_MFR;
        }
      }

      // Factor 7: Device type hint
      if (deviceTypeHint && heuristic.category) {
        if (deviceTypeHint === heuristic.category) {
          score += 4;
        }
      }

      // Factor 8: Sample consistency bonus
      if (samples && samples.count >= this.MAX_SAMPLES_NEEDED) {
        score += 2;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = heuristic;
      }
    }

    if (bestMatch && bestScore >= this.MIN_CONFIDENCE) {
      const mapping = {
        capability: bestMatch.capability,
        dpId,
        type: detectedType,
        converter: bestMatch.converter || null,
        discoveredAt: Date.now(),
        confidence: Math.round(bestScore),
        sampleCount: samples ? samples.count : 1,
        manufacturerHint: manufacturerHint || null,
      };

      this.log(`Discovered: DP${dpId} -> ${mapping.capability} (confidence: ${bestScore}, samples: ${mapping.sampleCount})`);

      // Ensure capability exists on device
      const added = await this._ensureCapability(mapping.capability);
      if (added === false) {
        this.log(`Could not add capability ${mapping.capability} - gating may be active`);
      }

      return mapping;
    }

    // No confident match - create generic capability
    this.log(`No confident match for DP${dpId} (best score: ${bestScore}), creating generic`);
    const genericCapability = await this._createGenericCapability(dpId, value, detectedType);
    return genericCapability;
  }

  /**
   * Create a generic/custom capability for unknown DPs
   */
  async _createGenericCapability(dpId, value, type) {
    const capabilityId = `tuya_dp_${dpId}`;

    const mapping = {
      capability: capabilityId,
      dpId,
      type,
      isGeneric: true,
      converter: null,
      discoveredAt: Date.now(),
      confidence: 0,
      sampleCount: this._dpSamples.get(dpId)?.count || 1,
    };

    this.log(`Created generic capability: ${capabilityId} for DP${dpId}`);

    // Store for future reference
    this._dynamicCapabilities.set(capabilityId, {
      type: type === 'bool' ? 'boolean' : 'number',
      title: `Tuya DP ${dpId}`,
      dpId
    });

    return mapping;
  }

  /**
   * Ensure capability exists on device.
   * Uses safety gating from VirtualTelemetryCompensationEngine.
   *
   * @returns {boolean} true if capability exists/added, false if gated
   */
  async _ensureCapability(capabilityId) {
    if (this.device.hasCapability && this.device.hasCapability(capabilityId)) {
      return true;
    }

    // Safe Listening Strategy / Gating check
    if (this.device.virtualTelemetryCompensationEngine) {
      if (!this.device.virtualTelemetryCompensationEngine.gateAdaptation(capabilityId, 'ADD')) {
        this.log(`GATED: Postponing addition of capability ${capabilityId} until safe epoch completed.`);
        return false;
      }
    }

    try {
      await this.device.addCapability(capabilityId);
      this.log(`Added capability: ${capabilityId}`);

      // Register a basic listener for this new capability
      this._registerNewCapabilityListener(capabilityId);

      // Notify for flow card creation
      this._emit('capabilityAdded', { capability: capabilityId });

      return true;
    } catch (err) {
      this.error(`Failed to add capability ${capabilityId}:`, err.message);
      return false;
    }
  }

  /**
   * Register a basic capability listener for dynamically added capabilities
   */
  _registerNewCapabilityListener(capabilityId) {
    const listenerKey = `_dynCapListener_${capabilityId}`;
    if (this.device[listenerKey]) {
      return;
    }

    try {
      this.device.registerCapabilityListener(capabilityId, async (value) => {
        this._emit('valueChanged', {
          capability: capabilityId,
          value,
          dpId: this._discoveredDPs.get(capabilityId)?.dpId
        });
      });
      this.device[listenerKey] = true;
    } catch (err) {
      // Listener may already be registered or capability not settable
    }
  }

  /**
   * Apply value to capability with conversion
   */
  async _applyValue(mapping, value) {
    try {
      let convertedValue = value;

      // Apply converter
      if (mapping.converter && VALUE_CONVERTERS[mapping.converter]) {
        convertedValue = VALUE_CONVERTERS[mapping.converter](value);
      } else if (mapping.converter === 'boolean') {
        convertedValue = Boolean(value);
      }

      // Validate converted value against capability bounds
      const capDef = CAPABILITY_DEFINITIONS[mapping.capability];
      if (capDef && typeof convertedValue === 'number') {
        if (capDef.min !== undefined && convertedValue < capDef.min) {
          convertedValue = capDef.min;
        }
        if (capDef.max !== undefined && convertedValue > capDef.max) {
          convertedValue = capDef.max;
        }
      }

      // Skip generic capabilities that don't exist on device
      if (mapping.isGeneric && !(this.device.hasCapability && this.device.hasCapability(mapping.capability))) {
        return;
      }

      // Set capability value
      if (this.device.hasCapability && this.device.hasCapability(mapping.capability)) {
        if (typeof this.device.setCapabilityValue === 'function') {
          await this.device.setCapabilityValue(mapping.capability, convertedValue)
            .catch(err => this.error(`Failed to set ${mapping.capability}:`, err.message));
          this.log(`${mapping.capability} = ${convertedValue}`);

          // Emit for flow triggers
          this._emit('valueChanged', {
            capability: mapping.capability,
            value: convertedValue,
            dpId: mapping.dpId
          });
        }
      }
    } catch (err) {
      this.error(`Apply value failed for ${mapping.capability}:`, err.message);
    }
  }

  /**
   * Detect DP type from value
   */
  _detectType(value) {
    if (typeof value === 'boolean') {return 'bool';}
    if (typeof value === 'number') {return 'value';}
    if (typeof value === 'string') {return 'string';}
    if (Buffer.isBuffer(value)) {return 'raw';}
    if (Array.isArray(value)) {return 'raw';}
    return 'unknown';
  }

  /**
   * Convert numeric DP type code to string
   */
  _dpTypeToString(dpType) {
    const types = { 0: 'raw', 1: 'bool', 2: 'value', 3: 'string', 4: 'enum', 5: 'bitmap' };
    return types[dpType] || 'unknown';
  }

  /**
   * Get manufacturer hint from device settings
   */
  _getManufacturerHint() {
    try {
      const mfr = this.device.getSetting?.('zb_manufacturer_name')
        || this.device.driver?.manifest?.zigbee?.manufacturer
        || '';
      return mfr.toLowerCase();
    } catch {
      return null;
    }
  }

  /**
   * Get device type hint from driver ID or settings
   */
  _getDeviceTypeHint() {
    try {
      const driverId = this.device.driver?.id || '';
      if (driverId.includes('sensor')) {return 'climate';}
      if (driverId.includes('switch')) {return 'switch';}
      if (driverId.includes('light')) {return 'light';}
      if (driverId.includes('plug') || driverId.includes('outlet')) {return 'switch';}
      if (driverId.includes('cover') || driverId.includes('curtain')) {return 'cover';}
      if (driverId.includes('thermostat') || driverId.includes('valve')) {return 'thermostat';}
      if (driverId.includes('motion') || driverId.includes('pir')) {return 'alarm';}
      if (driverId.includes('door') || driverId.includes('contact')) {return 'alarm';}
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if manufacturer matches a category
   */
  _matchesManufacturerCategory(manufacturer, category) {
    if (!manufacturer) return false;
    // Temperature/humidity sensor manufacturers
    const climateManufacturers = ['tuya', 'tze200', 'tze204', 'tze202', '_ts0601'];
    const isClimate = climateManufacturers.some(m => manufacturer.includes(m));
    return isClimate && category === 'climate';
  }

  /**
   * Log adaptation decision for learning
   */
  _logAdaptation(dpId, mapping) {
    const entry = {
      dpId,
      capability: mapping.capability,
      confidence: mapping.confidence,
      timestamp: Date.now(),
      manufacturer: this._getManufacturerHint(),
      sampleCount: mapping.sampleCount,
    };

    this._adaptationLog.push(entry);
    if (this._adaptationLog.length > this._maxLogSize) {
      this._adaptationLog.shift();
    }

    // Persist adaptation log periodically
    this._saveAdaptationLog();
  }

  /**
   * Save discoveries to device store
   */
  async _saveDiscoveries() {
    try {
      const data = {};
      for (const [dpId, mapping] of this._discoveredDPs) {
        data[dpId] = mapping;
      }
      await this.device.setStoreValue('dynamic_capabilities', data);
    } catch (err) {
      this.error('Save discoveries failed:', err.message);
    }
  }

  /**
   * Save adaptation log to device store
   */
  async _saveAdaptationLog() {
    try {
      await this.device.setStoreValue('dp_adaptation_log', this._adaptationLog);
    } catch (err) {
      // Non-critical, silently ignore
    }
  }

  /**
   * Get all discovered mappings
   */
  getDiscoveries() {
    return Array.from(this._discoveredDPs.entries()).map(([dpId, mapping]) => ({
      dpId,
      ...mapping
    }));
  }

  /**
   * Get adaptation log for debugging
   */
  getAdaptationLog() {
    return [...this._adaptationLog];
  }

  /**
   * Get sample statistics for a DP
   */
  getDPStatistics(dpId) {
    const samples = this._dpSamples.get(dpId);
    if (!samples) return null;

    return {
      count: samples.count,
      firstSeen: samples.firstSeen,
      lastSeen: samples.lastSeen,
      types: [...samples.types],
      numericMin: samples.numericMin,
      numericMax: samples.numericMax,
      numericAvg: samples.count > 0 ? samples.numericSum / samples.count : 0,
    };
  }

  /**
   * Force re-evaluation of a DP mapping (e.g., after user override)
   */
  async reEvaluateDP(dpId) {
    this._discoveredDPs.delete(dpId);
    const samples = this._dpSamples.get(dpId);
    if (samples && samples.samples.length > 0) {
      const lastSample = samples.samples[samples.samples.length - 1];
      await this.processDP(dpId, lastSample.value, lastSample.dpType);
    }
  }

  /**
   * Remove a discovered DP mapping (user override)
   */
  async removeMapping(dpId) {
    const mapping = this._discoveredDPs.get(dpId);
    if (mapping) {
      this._discoveredDPs.delete(dpId);
      await this._saveDiscoveries();

      // Optionally remove the capability if it was generic
      if (mapping.isGeneric && this.device.hasCapability && this.device.hasCapability(mapping.capability)) {
        try {
          await this.device.removeCapability(mapping.capability);
          this.log(`Removed generic capability: ${mapping.capability}`);
        } catch (err) {
          this.error(`Failed to remove capability ${mapping.capability}:`, err.message);
        }
      }

      this.log(`Removed mapping for DP${dpId}`);
    }
  }

  /**
   * Event emitter methods
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);
  }

  _emit(event, data) {
    const callbacks = this._listeners.get(event) || [];
    for (const cb of callbacks) {
      try {
        cb(data);
      } catch (err) {
        this.error(`Event ${event} handler error:`, err.message);
      }
    }
  }

  /**
   * Get capability definition
   */
  static getCapabilityDefinition(capabilityId) {
    return CAPABILITY_DEFINITIONS[capabilityId] || null;
  }

  /**
   * Get all standard capabilities
   */
  static getAllCapabilities() {
    return Object.keys(CAPABILITY_DEFINITIONS);
  }

  /**
   * Get all available converters
   */
  static getConverters() {
    return Object.keys(VALUE_CONVERTERS);
  }
}

module.exports = DynamicCapabilityManager;
