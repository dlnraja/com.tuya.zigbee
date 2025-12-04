'use strict';

/**
 * DynamicCapabilityManager - v5.3.57
 *
 * Auto-discovers and creates capabilities dynamically based on:
 * - Tuya DP reports
 * - Device fingerprints
 * - Heuristic DP type detection
 *
 * When a new DP is discovered, this manager:
 * 1. Detects the DP type (bool, value, enum, string)
 * 2. Maps it to the best Homey capability
 * 3. Creates the capability if it doesn't exist
 * 4. Notifies FlowCardManager to create triggers/actions
 */

// Standard Homey capability definitions
const CAPABILITY_DEFINITIONS = {
  // Boolean capabilities (alarms, switches)
  alarm_motion: { type: 'boolean', title: 'Motion Alarm', icon: '🚶' },
  alarm_contact: { type: 'boolean', title: 'Contact Alarm', icon: '🚪' },
  alarm_water: { type: 'boolean', title: 'Water Alarm', icon: '💧' },
  alarm_smoke: { type: 'boolean', title: 'Smoke Alarm', icon: '🔥' },
  alarm_battery: { type: 'boolean', title: 'Battery Alarm', icon: '🔋' },
  alarm_tamper: { type: 'boolean', title: 'Tamper Alarm', icon: '⚠️' },
  alarm_generic: { type: 'boolean', title: 'Alarm', icon: '🚨' },
  onoff: { type: 'boolean', title: 'On/Off', icon: '💡' },

  // Numeric capabilities (measurements)
  measure_temperature: { type: 'number', title: 'Temperature', units: '°C', icon: '🌡️' },
  measure_humidity: { type: 'number', title: 'Humidity', units: '%', icon: '💧' },
  measure_luminance: { type: 'number', title: 'Luminance', units: 'lux', icon: '☀️' },
  measure_battery: { type: 'number', title: 'Battery', units: '%', icon: '🔋' },
  measure_power: { type: 'number', title: 'Power', units: 'W', icon: '⚡' },
  measure_voltage: { type: 'number', title: 'Voltage', units: 'V', icon: '🔌' },
  measure_current: { type: 'number', title: 'Current', units: 'A', icon: '⚡' },
  measure_pressure: { type: 'number', title: 'Pressure', units: 'mbar', icon: '🌡️' },
  measure_co2: { type: 'number', title: 'CO2', units: 'ppm', icon: '💨' },
  measure_pm25: { type: 'number', title: 'PM2.5', units: 'µg/m³', icon: '💨' },

  // Controllable capabilities
  dim: { type: 'number', title: 'Dim Level', units: '%', min: 0, max: 100, icon: '💡' },
  windowcoverings_set: { type: 'number', title: 'Position', units: '%', min: 0, max: 100, icon: '🪟' },
  target_temperature: { type: 'number', title: 'Target Temperature', units: '°C', icon: '🎯' },
};

// DP to Capability heuristic mapping
const DP_HEURISTICS = [
  // Motion/Presence (DP 1, 101, 102, 105)
  { dpIds: [1, 101, 102, 105], type: 'bool', valueRange: [0, 1], capability: 'alarm_motion' },

  // Temperature (DP 1, 3, 5, 18, 24)
  { dpIds: [1, 3, 5, 18, 24], type: 'value', valueRange: [-500, 1000], capability: 'measure_temperature', converter: 'divideBy10' },

  // Humidity (DP 2, 4, 6, 19, 25)
  { dpIds: [2, 4, 6, 19, 25], type: 'value', valueRange: [0, 100], capability: 'measure_humidity' },

  // Battery (DP 4, 14, 15, 101)
  { dpIds: [4, 14, 15, 101], type: 'value', valueRange: [0, 100], capability: 'measure_battery' },

  // Luminance (DP 7, 12, 101, 104)
  { dpIds: [7, 12, 101, 104], type: 'value', valueRange: [0, 100000], capability: 'measure_luminance' },

  // On/Off (DP 1, 6, 20)
  { dpIds: [1, 6, 20], type: 'bool', capability: 'onoff' },

  // Dimmer (DP 2, 3, 22)
  { dpIds: [2, 3, 22], type: 'value', valueRange: [0, 1000], capability: 'dim', converter: 'divideBy10' },

  // Curtain position (DP 2, 3)
  { dpIds: [2, 3], type: 'value', valueRange: [0, 100], capability: 'windowcoverings_set' },

  // Contact sensor (DP 1)
  { dpIds: [1], type: 'bool', capability: 'alarm_contact' },

  // Water leak (DP 1)
  { dpIds: [1], type: 'bool', capability: 'alarm_water' },
];

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

    // Event emitter for flow card manager
    this._listeners = new Map();
  }

  /**
   * Initialize from device store (restore previous discoveries)
   */
  async initialize() {
    try {
      const stored = await this.device.getStoreValue('dynamic_capabilities') || {};

      for (const [dpId, mapping] of Object.entries(stored)) {
        this._discoveredDPs.set(parseInt(dpId), mapping);
        this.log(`Restored DP${dpId} → ${mapping.capability}`);
      }

      this.log(`Initialized with ${this._discoveredDPs.size} discovered DPs`);
    } catch (err) {
      this.error('Initialize failed:', err.message);
    }
  }

  /**
   * Process incoming DP and auto-discover capability
   * @param {number} dpId - Tuya DataPoint ID
   * @param {any} value - DP value
   * @param {number} dpType - Tuya DP type (0=raw, 1=bool, 2=value, 3=string, 4=enum)
   */
  async processDP(dpId, value, dpType = null) {
    this.log(`Processing DP${dpId} = ${value} (type: ${dpType ?? 'unknown'})`);

    // Check if already mapped
    if (this._discoveredDPs.has(dpId)) {
      const mapping = this._discoveredDPs.get(dpId);
      await this._applyValue(mapping, value);
      return mapping;
    }

    // Auto-discover capability for this DP
    const mapping = await this._discoverCapability(dpId, value, dpType);

    if (mapping) {
      this._discoveredDPs.set(dpId, mapping);
      await this._saveDiscoveries();
      await this._applyValue(mapping, value);

      // Emit event for flow card creation
      this._emit('capabilityDiscovered', { dpId, mapping });
    }

    return mapping;
  }

  /**
   * Discover capability for a DP based on heuristics
   */
  async _discoverCapability(dpId, value, dpType) {
    this.log(`🔍 Discovering capability for DP${dpId}...`);

    // Detect type from value if not provided
    const detectedType = dpType ?? this._detectType(value);

    // Find best match from heuristics
    let bestMatch = null;
    let bestScore = 0;

    for (const heuristic of DP_HEURISTICS) {
      let score = 0;

      // DP ID match
      if (heuristic.dpIds.includes(dpId)) {
        score += 10;
      }

      // Type match
      if (heuristic.type === detectedType) {
        score += 5;
      }

      // Value range match
      if (heuristic.valueRange && typeof value === 'number') {
        const [min, max] = heuristic.valueRange;
        if (value >= min && value <= max) {
          score += 3;
        }
      }

      // Check if device already has this capability (prefer existing)
      if (this.device.hasCapability(heuristic.capability)) {
        score += 2;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = heuristic;
      }
    }

    if (bestMatch && bestScore >= 8) {
      const mapping = {
        capability: bestMatch.capability,
        dpId,
        type: detectedType,
        converter: bestMatch.converter || null,
        discoveredAt: Date.now(),
        confidence: bestScore
      };

      this.log(`✅ Discovered: DP${dpId} → ${mapping.capability} (confidence: ${bestScore})`);

      // Ensure capability exists on device
      await this._ensureCapability(mapping.capability);

      return mapping;
    }

    // Create generic capability for unknown DP
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
      confidence: 0
    };

    this.log(`📦 Created generic capability: ${capabilityId} for DP${dpId}`);

    // Store for future reference
    this._dynamicCapabilities.set(capabilityId, {
      type: type === 'bool' ? 'boolean' : 'number',
      title: `Tuya DP ${dpId}`,
      dpId
    });

    return mapping;
  }

  /**
   * Ensure capability exists on device
   */
  async _ensureCapability(capabilityId) {
    if (!this.device.hasCapability(capabilityId)) {
      try {
        await this.device.addCapability(capabilityId);
        this.log(`➕ Added capability: ${capabilityId}`);

        // Notify for flow card creation
        this._emit('capabilityAdded', { capability: capabilityId });

        return true;
      } catch (err) {
        this.error(`Failed to add capability ${capabilityId}:`, err.message);
        return false;
      }
    }
    return true;
  }

  /**
   * Apply value to capability with conversion
   */
  async _applyValue(mapping, value) {
    try {
      let convertedValue = value;

      // Apply converter
      if (mapping.converter === 'divideBy10') {
        convertedValue = value / 10;
      } else if (mapping.converter === 'divideBy100') {
        convertedValue = value / 100;
      } else if (mapping.converter === 'boolean') {
        convertedValue = Boolean(value);
      }

      // Skip generic capabilities that don't exist
      if (mapping.isGeneric && !this.device.hasCapability(mapping.capability)) {
        return;
      }

      // Set capability value
      if (this.device.hasCapability(mapping.capability)) {
        await this.device.setCapabilityValue(mapping.capability, convertedValue);
        this.log(`📊 ${mapping.capability} = ${convertedValue}`);

        // Emit for flow triggers
        this._emit('valueChanged', {
          capability: mapping.capability,
          value: convertedValue,
          dpId: mapping.dpId
        });
      }
    } catch (err) {
      this.error(`Apply value failed for ${mapping.capability}:`, err.message);
    }
  }

  /**
   * Detect DP type from value
   */
  _detectType(value) {
    if (typeof value === 'boolean') return 'bool';
    if (typeof value === 'number') return 'value';
    if (typeof value === 'string') return 'string';
    if (Buffer.isBuffer(value)) return 'raw';
    if (Array.isArray(value)) return 'raw';
    return 'unknown';
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
   * Get all discovered mappings
   */
  getDiscoveries() {
    return Array.from(this._discoveredDPs.entries()).map(([dpId, mapping]) => ({
      dpId,
      ...mapping
    }));
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
}

module.exports = DynamicCapabilityManager;
