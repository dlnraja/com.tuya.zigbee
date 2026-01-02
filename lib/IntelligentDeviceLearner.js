'use strict';

/**
 * IntelligentDeviceLearner v5.5.336
 *
 * Autonomous capability discovery and device profile learning system.
 *
 * FEATURES:
 * - 15-minute active learning phase after pairing
 * - Monitors DP reports, ZCL cluster reports, and attribute changes
 * - Infers capabilities from observed data patterns
 * - Persists learned profiles to device storage
 * - Passive listening mode after active phase
 * - Dynamic capability adaptation based on actual device behavior
 * - Handles manufacturer-specific Tuya/Zigbee implementations
 *
 * ARCHITECTURE:
 * - Active Phase (0-15 min): Aggressive monitoring, capability inference
 * - Passive Phase (15+ min): Background listening, profile refinement
 * - Profile stored in device.store for persistence across restarts
 */

const ACTIVE_LEARNING_DURATION = 15 * 60 * 1000; // 15 minutes
const PASSIVE_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MIN_SAMPLES_FOR_INFERENCE = 2; // Minimum samples before inferring capability

/**
 * Known DP patterns for capability inference
 * Maps DP values/ranges to likely capabilities
 */
const DP_CAPABILITY_PATTERNS = {
  // Boolean patterns (0/1, true/false)
  boolean: {
    motion: ['alarm_motion', 'alarm_human'],
    contact: ['alarm_contact'],
    water: ['alarm_water'],
    smoke: ['alarm_smoke'],
    gas: ['alarm_gas'],
    tamper: ['alarm_tamper'],
    onoff: ['onoff'],
  },

  // Percentage patterns (0-100)
  percentage: {
    battery: 'measure_battery',
    humidity: 'measure_humidity',
    soil_moisture: 'measure_soil_moisture',
    dim: 'dim',
    position: 'windowcoverings_set',
  },

  // Temperature patterns (-40 to 80, or raw /10 /100)
  temperature: {
    temp: 'measure_temperature',
    target_temp: 'target_temperature',
  },

  // Luminance patterns (0-100000 lux)
  luminance: {
    lux: 'measure_luminance',
    illuminance: 'measure_luminance',
  },

  // Power/Energy patterns
  power: {
    power: 'measure_power',
    voltage: 'measure_voltage',
    current: 'measure_current',
    energy: 'meter_power',
  },
};

/**
 * Known DP IDs and their common meanings across Tuya devices
 */
const COMMON_DP_MAPPINGS = {
  // Switches/Relays
  1: { likely: ['onoff', 'alarm_motion', 'alarm_contact'], context: 'switch_or_sensor' },
  2: { likely: ['onoff', 'measure_battery'], context: 'switch_or_battery' },
  3: { likely: ['measure_humidity', 'measure_soil_moisture', 'measure_luminance'], context: 'measurement' },
  4: { likely: ['measure_battery', 'alarm_water'], context: 'battery_or_alarm' },
  5: { likely: ['measure_temperature'], context: 'temperature' },
  6: { likely: ['measure_humidity'], context: 'humidity' },

  // Battery devices
  14: { likely: ['alarm_battery', 'alarm_water'], context: 'alarm' },
  15: { likely: ['measure_battery'], context: 'battery' },

  // Presence/Radar sensors
  101: { likely: ['alarm_motion', 'measure_presence_time'], context: 'presence' },
  102: { likely: ['measure_luminance', 'fading_time'], context: 'luminance_or_setting' },
  103: { likely: ['measure_temperature'], context: 'temperature' },
  104: { likely: ['measure_humidity', 'detection_distance'], context: 'humidity_or_setting' },
  105: { likely: ['sensitivity'], context: 'setting' },
  106: { likely: ['measure_luminance'], context: 'luminance' },
  109: { likely: ['measure_humidity'], context: 'humidity' },

  // Thermostats
  16: { likely: ['target_temperature'], context: 'thermostat' },
  24: { likely: ['measure_temperature'], context: 'thermostat' },

  // Dimmers/Lights
  20: { likely: ['dim'], context: 'dimmer' },
  21: { likely: ['light_hue'], context: 'color' },
  22: { likely: ['light_saturation'], context: 'color' },
  23: { likely: ['light_temperature'], context: 'color_temp' },
};

/**
 * ZCL Cluster to Capability mapping
 */
const ZCL_CLUSTER_CAPABILITIES = {
  // Standard ZCL clusters
  0x0006: { capability: 'onoff', type: 'boolean' },           // On/Off
  0x0008: { capability: 'dim', type: 'percentage' },          // Level Control
  0x0300: { capability: 'light_hue', type: 'color' },         // Color Control
  0x0402: { capability: 'measure_temperature', type: 'temperature' }, // Temperature
  0x0405: { capability: 'measure_humidity', type: 'percentage' },     // Humidity
  0x0400: { capability: 'measure_luminance', type: 'luminance' },     // Illuminance
  0x0001: { capability: 'measure_battery', type: 'percentage' },      // Power Configuration
  0x0500: { capability: 'alarm_motion', type: 'boolean' },    // IAS Zone (general)
  0x0702: { capability: 'meter_power', type: 'power' },       // Metering
  0x0B04: { capability: 'measure_power', type: 'power' },     // Electrical Measurement
  0x0102: { capability: 'windowcoverings_set', type: 'percentage' }, // Window Covering

  // IAS Zone types
  iasZone: {
    motionSensor: 'alarm_motion',
    contactSwitch: 'alarm_contact',
    waterSensor: 'alarm_water',
    smokeDetector: 'alarm_smoke',
    gasDetector: 'alarm_gas',
    vibrationSensor: 'alarm_tamper',
  },
};

class IntelligentDeviceLearner {
  constructor(device) {
    this.device = device;
    this.log = device.log.bind(device);

    // Learning state
    this._isActiveLearning = false;
    this._learningStartTime = null;
    this._passiveMode = false;

    // Observed data during learning
    this._observedDPs = new Map();      // DP ID -> { values: [], timestamps: [], inferred: null }
    this._observedZCL = new Map();      // Cluster ID -> { attributes: Map, inferred: null }
    this._observedCapabilities = new Set();

    // Learned profile
    this._learnedProfile = null;

    // Timers
    this._activeLearningTimer = null;
    this._passiveCheckTimer = null;
  }

  /**
   * Initialize the learner - called after device init
   */
  async initialize() {
    this.log('[LEARNER] 🧠 Initializing Intelligent Device Learner v5.5.336');

    // Load existing profile from storage
    await this._loadProfile();

    // Check if we need active learning
    const needsLearning = await this._checkNeedsLearning();

    if (needsLearning) {
      this.log('[LEARNER] 📚 Starting active learning phase (15 minutes)');
      this._startActiveLearning();
    } else {
      this.log('[LEARNER] ✅ Using cached profile, starting passive mode');
      this._startPassiveMode();
    }
  }

  /**
   * Check if device needs active learning
   */
  async _checkNeedsLearning() {
    // Always learn if no profile exists
    if (!this._learnedProfile) {
      this.log('[LEARNER] No cached profile found');
      return true;
    }

    // Check profile age (re-learn if older than 7 days)
    const profileAge = Date.now() - (this._learnedProfile.lastUpdated || 0);
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    if (profileAge > maxAge) {
      this.log('[LEARNER] Profile expired, re-learning');
      return true;
    }

    // Check if device was re-paired (different IEEE address)
    const currentIeee = this.device.getData()?.ieeeAddress;
    if (currentIeee && this._learnedProfile.ieeeAddress !== currentIeee) {
      this.log('[LEARNER] Device re-paired, re-learning');
      return true;
    }

    return false;
  }

  /**
   * Load profile from device storage
   */
  async _loadProfile() {
    try {
      const stored = this.device.getStoreValue('learned_profile');
      if (stored) {
        this._learnedProfile = JSON.parse(stored);
        this.log(`[LEARNER] Loaded profile: ${this._learnedProfile.capabilities?.length || 0} capabilities`);
      }
    } catch (err) {
      this.log(`[LEARNER] Failed to load profile: ${err.message}`);
    }
  }

  /**
   * Save profile to device storage
   */
  async _saveProfile() {
    try {
      const profile = {
        version: '5.5.336',
        ieeeAddress: this.device.getData()?.ieeeAddress,
        manufacturerName: this.device.getData()?.manufacturerName,
        modelId: this.device.getData()?.modelId,
        lastUpdated: Date.now(),
        capabilities: Array.from(this._observedCapabilities),
        dpMappings: this._buildDPMappings(),
        zclMappings: this._buildZCLMappings(),
        learningDuration: Date.now() - this._learningStartTime,
        sampleCount: this._getTotalSamples(),
      };

      await this.device.setStoreValue('learned_profile', JSON.stringify(profile));
      this._learnedProfile = profile;

      this.log(`[LEARNER] 💾 Saved profile: ${profile.capabilities.length} capabilities, ${profile.sampleCount} samples`);
    } catch (err) {
      this.log(`[LEARNER] Failed to save profile: ${err.message}`);
    }
  }

  /**
   * Start active learning phase
   */
  _startActiveLearning() {
    this._isActiveLearning = true;
    this._learningStartTime = Date.now();
    this._passiveMode = false;

    // Set timer to end active learning
    this._activeLearningTimer = setTimeout(() => {
      this._endActiveLearning();
    }, ACTIVE_LEARNING_DURATION);

    this.log('[LEARNER] 🔍 Active learning started - monitoring all DP and ZCL reports');
  }

  /**
   * End active learning and switch to passive mode
   */
  async _endActiveLearning() {
    this._isActiveLearning = false;

    this.log('[LEARNER] ════════════════════════════════════════════════════════════');
    this.log('[LEARNER] 🎓 Active learning phase complete');
    this.log(`[LEARNER] Duration: ${Math.round((Date.now() - this._learningStartTime) / 1000)}s`);
    this.log(`[LEARNER] DPs observed: ${this._observedDPs.size}`);
    this.log(`[LEARNER] ZCL clusters observed: ${this._observedZCL.size}`);

    // Infer capabilities from observed data
    await this._inferCapabilities();

    // Apply learned capabilities
    await this._applyLearnedCapabilities();

    // Save profile
    await this._saveProfile();

    // Start passive mode
    this._startPassiveMode();

    this.log('[LEARNER] ════════════════════════════════════════════════════════════');
  }

  /**
   * Start passive listening mode
   */
  _startPassiveMode() {
    this._passiveMode = true;

    // Periodic check for profile refinement
    this._passiveCheckTimer = setInterval(() => {
      this._passiveRefine();
    }, PASSIVE_CHECK_INTERVAL);

    this.log('[LEARNER] 👂 Passive mode started - background refinement active');
  }

  /**
   * Passive refinement - check for new capabilities
   */
  async _passiveRefine() {
    const newCapabilities = this._checkForNewCapabilities();

    if (newCapabilities.length > 0) {
      this.log(`[LEARNER] 🆕 Passive mode discovered: ${newCapabilities.join(', ')}`);

      for (const cap of newCapabilities) {
        await this._addCapabilityIfValid(cap);
      }

      // Update profile
      await this._saveProfile();
    }
  }

  /**
   * Record a DP report for learning
   */
  recordDP(dpId, value, rawValue) {
    const dp = Number(dpId);

    if (!this._observedDPs.has(dp)) {
      this._observedDPs.set(dp, {
        values: [],
        rawValues: [],
        timestamps: [],
        inferred: null,
        valueType: null,
        min: Infinity,
        max: -Infinity,
      });
    }

    const record = this._observedDPs.get(dp);
    record.values.push(value);
    record.rawValues.push(rawValue);
    record.timestamps.push(Date.now());

    // Track value range
    if (typeof value === 'number') {
      record.min = Math.min(record.min, value);
      record.max = Math.max(record.max, value);
    }

    // Infer value type
    record.valueType = this._inferValueType(value, record);

    if (this._isActiveLearning) {
      this.log(`[LEARNER] 📊 DP${dp} = ${value} (type: ${record.valueType}, samples: ${record.values.length})`);
    }

    // Real-time capability inference during active learning
    if (this._isActiveLearning && record.values.length >= MIN_SAMPLES_FOR_INFERENCE) {
      this._inferDPCapability(dp, record);
    }
  }

  /**
   * Record a ZCL cluster report for learning
   */
  recordZCL(clusterId, clusterName, attributeName, value) {
    const cluster = Number(clusterId) || clusterName;

    if (!this._observedZCL.has(cluster)) {
      this._observedZCL.set(cluster, {
        name: clusterName,
        attributes: new Map(),
        inferred: null,
      });
    }

    const record = this._observedZCL.get(cluster);

    if (!record.attributes.has(attributeName)) {
      record.attributes.set(attributeName, {
        values: [],
        timestamps: [],
      });
    }

    const attrRecord = record.attributes.get(attributeName);
    attrRecord.values.push(value);
    attrRecord.timestamps.push(Date.now());

    if (this._isActiveLearning) {
      this.log(`[LEARNER] 📡 ZCL ${clusterName}.${attributeName} = ${value}`);
    }

    // Real-time capability inference
    if (this._isActiveLearning) {
      this._inferZCLCapability(cluster, record);
    }
  }

  /**
   * Infer value type from observed values
   */
  _inferValueType(value, record) {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'string') return 'string';

    if (typeof value === 'number') {
      // Check for boolean-like (0/1)
      if (record.values.every(v => v === 0 || v === 1)) return 'boolean';

      // Check for percentage (0-100)
      if (record.min >= 0 && record.max <= 100) return 'percentage';

      // Check for temperature-like (-40 to 80 or raw /10)
      if (record.min >= -400 && record.max <= 800) return 'temperature_raw';
      if (record.min >= -40 && record.max <= 80) return 'temperature';

      // Check for luminance (0-100000)
      if (record.min >= 0 && record.max <= 100000) return 'luminance';

      // Check for power values
      if (record.min >= 0 && record.max <= 50000) return 'power';

      return 'number';
    }

    return 'unknown';
  }

  /**
   * Infer capability from DP observations
   */
  _inferDPCapability(dpId, record) {
    const commonMapping = COMMON_DP_MAPPINGS[dpId];
    let inferredCapability = null;

    // Use value type to narrow down
    switch (record.valueType) {
      case 'boolean':
        // Check common DP mappings for boolean capabilities
        if (commonMapping) {
          const booleanCaps = commonMapping.likely.filter(cap =>
            cap.startsWith('alarm_') || cap === 'onoff'
          );
          if (booleanCaps.length > 0) {
            inferredCapability = booleanCaps[0];
          }
        }
        break;

      case 'percentage':
        if (dpId === 15 || dpId === 4 || dpId === 2) {
          inferredCapability = 'measure_battery';
        } else if (dpId === 3 || dpId === 6 || dpId === 104) {
          inferredCapability = 'measure_humidity';
        } else if (commonMapping) {
          const pctCaps = commonMapping.likely.filter(cap =>
            cap.startsWith('measure_') || cap === 'dim'
          );
          if (pctCaps.length > 0) {
            inferredCapability = pctCaps[0];
          }
        }
        break;

      case 'temperature':
      case 'temperature_raw':
        inferredCapability = 'measure_temperature';
        break;

      case 'luminance':
        if (record.max > 100) {
          inferredCapability = 'measure_luminance';
        }
        break;

      case 'power':
        if (commonMapping?.context === 'power') {
          inferredCapability = commonMapping.likely[0];
        }
        break;
    }

    if (inferredCapability && !record.inferred) {
      record.inferred = inferredCapability;
      this._observedCapabilities.add(inferredCapability);
      this.log(`[LEARNER] 💡 Inferred DP${dpId} → ${inferredCapability} (${record.valueType})`);
    }
  }

  /**
   * Infer capability from ZCL cluster observations
   */
  _inferZCLCapability(clusterId, record) {
    const clusterMapping = ZCL_CLUSTER_CAPABILITIES[clusterId];

    if (clusterMapping && !record.inferred) {
      record.inferred = clusterMapping.capability;
      this._observedCapabilities.add(clusterMapping.capability);
      this.log(`[LEARNER] 💡 Inferred ZCL 0x${clusterId.toString(16)} → ${clusterMapping.capability}`);
    }
  }

  /**
   * Final capability inference after active learning
   */
  async _inferCapabilities() {
    this.log('[LEARNER] 🔬 Final capability inference...');

    // Process all observed DPs
    for (const [dpId, record] of this._observedDPs) {
      if (!record.inferred && record.values.length >= MIN_SAMPLES_FOR_INFERENCE) {
        this._inferDPCapability(dpId, record);
      }
    }

    // Process all observed ZCL clusters
    for (const [clusterId, record] of this._observedZCL) {
      if (!record.inferred) {
        this._inferZCLCapability(clusterId, record);
      }
    }

    this.log(`[LEARNER] 📋 Final capabilities: ${Array.from(this._observedCapabilities).join(', ')}`);
  }

  /**
   * Apply learned capabilities to the device
   */
  async _applyLearnedCapabilities() {
    this.log('[LEARNER] 🔧 Applying learned capabilities...');

    for (const capability of this._observedCapabilities) {
      await this._addCapabilityIfValid(capability);
    }
  }

  /**
   * Add a capability if valid and not already present
   */
  async _addCapabilityIfValid(capability) {
    try {
      // Check if capability is valid for Homey
      const validCapabilities = [
        'onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature',
        'alarm_motion', 'alarm_contact', 'alarm_water', 'alarm_smoke', 'alarm_gas', 'alarm_tamper', 'alarm_battery',
        'measure_temperature', 'measure_humidity', 'measure_luminance', 'measure_battery',
        'measure_power', 'measure_voltage', 'measure_current', 'meter_power',
        'measure_soil_moisture', 'measure_voc', 'measure_co2', 'measure_pm25',
        'target_temperature', 'windowcoverings_set',
      ];

      if (!validCapabilities.includes(capability)) {
        this.log(`[LEARNER] ⚠️ Invalid capability: ${capability}`);
        return false;
      }

      if (!this.device.hasCapability(capability)) {
        await this.device.addCapability(capability);
        this.log(`[LEARNER] ✅ Added capability: ${capability}`);
        return true;
      }
    } catch (err) {
      this.log(`[LEARNER] ❌ Failed to add ${capability}: ${err.message}`);
    }
    return false;
  }

  /**
   * Check for new capabilities not yet in profile
   */
  _checkForNewCapabilities() {
    const newCaps = [];

    for (const [dpId, record] of this._observedDPs) {
      if (record.inferred && !this._learnedProfile?.capabilities?.includes(record.inferred)) {
        newCaps.push(record.inferred);
      }
    }

    return newCaps;
  }

  /**
   * Build DP mappings from learned data
   */
  _buildDPMappings() {
    const mappings = {};

    for (const [dpId, record] of this._observedDPs) {
      if (record.inferred) {
        mappings[dpId] = {
          capability: record.inferred,
          valueType: record.valueType,
          min: record.min,
          max: record.max,
          sampleCount: record.values.length,
        };
      }
    }

    return mappings;
  }

  /**
   * Build ZCL mappings from learned data
   */
  _buildZCLMappings() {
    const mappings = {};

    for (const [clusterId, record] of this._observedZCL) {
      if (record.inferred) {
        mappings[clusterId] = {
          name: record.name,
          capability: record.inferred,
          attributes: Array.from(record.attributes.keys()),
        };
      }
    }

    return mappings;
  }

  /**
   * Get total sample count
   */
  _getTotalSamples() {
    let total = 0;
    for (const record of this._observedDPs.values()) {
      total += record.values.length;
    }
    for (const record of this._observedZCL.values()) {
      for (const attr of record.attributes.values()) {
        total += attr.values.length;
      }
    }
    return total;
  }

  /**
   * Get learned profile for external use
   */
  getProfile() {
    return this._learnedProfile;
  }

  /**
   * Check if in active learning mode
   */
  isLearning() {
    return this._isActiveLearning;
  }

  /**
   * Force re-learning (e.g., after device re-pair)
   */
  async forceRelearn() {
    this.log('[LEARNER] 🔄 Force re-learning triggered');

    // Clear existing data
    this._observedDPs.clear();
    this._observedZCL.clear();
    this._observedCapabilities.clear();
    this._learnedProfile = null;

    // Clear stored profile
    await this.device.setStoreValue('learned_profile', null);

    // Start fresh learning
    this._startActiveLearning();
  }

  /**
   * Cleanup on device destroy
   */
  destroy() {
    if (this._activeLearningTimer) {
      clearTimeout(this._activeLearningTimer);
    }
    if (this._passiveCheckTimer) {
      clearInterval(this._passiveCheckTimer);
    }
    this.log('[LEARNER] 🛑 Learner destroyed');
  }
}

module.exports = { IntelligentDeviceLearner };
