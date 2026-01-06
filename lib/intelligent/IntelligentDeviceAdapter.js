'use strict';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * INTELLIGENT DEVICE ADAPTER - v5.5.373
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Smart adaptive system that learns device capabilities in real-time:
 *
 * PHASES:
 * 1. LEARNING PHASE (15min - 1H after pairing)
 *    - Monitors all incoming data points
 *    - Tracks which capabilities receive actual data
 *    - Builds device capability profile
 *
 * 2. ADAPTATION PHASE (after learning)
 *    - Removes capabilities that never received data
 *    - Adds capabilities for detected data types
 *    - Optimizes device profile
 *
 * 3. MAINTENANCE PHASE (every 1H)
 *    - Re-evaluates capability usage
 *    - Removes stale/unused capabilities
 *    - Adds newly detected capabilities
 *
 * CAPABILITIES MANAGED:
 * - Temperature (measure_temperature)
 * - Humidity (measure_humidity)
 * - Illuminance (measure_luminance)
 * - Battery (measure_battery)
 * - Power measurements (measure_power, meter_power, measure_voltage, measure_current)
 * - Distance (measure_distance)
 * - CO2/VOC/PM2.5 (measure_co2, measure_voc, measure_pm25)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Learning phase duration configurations
const LEARNING_PHASE_MIN_MS = 15 * 60 * 1000;  // 15 minutes minimum
const LEARNING_PHASE_MAX_MS = 60 * 60 * 1000;  // 1 hour maximum
const MAINTENANCE_INTERVAL_MS = 60 * 60 * 1000; // Re-evaluate every hour
const DATA_STALENESS_MS = 2 * 60 * 60 * 1000;   // Consider data stale after 2 hours

// Minimum data points required to confirm a capability is real
const MIN_DATA_POINTS_TO_CONFIRM = 3;

// Capabilities that can be auto-managed
const MANAGEABLE_CAPABILITIES = {
  // Environmental sensors
  'measure_temperature': { category: 'environment', dpIds: [1, 2, 18, 24], zclCluster: 'temperatureMeasurement' },
  'measure_humidity': { category: 'environment', dpIds: [2, 3, 19, 25], zclCluster: 'relativeHumidity' },
  'measure_luminance': { category: 'environment', dpIds: [9, 12, 103, 104], zclCluster: 'illuminanceMeasurement' },
  'measure_co2': { category: 'environment', dpIds: [2, 18, 22], zclCluster: null },
  'measure_voc': { category: 'environment', dpIds: [21, 22], zclCluster: null },
  'measure_pm25': { category: 'environment', dpIds: [2, 21], zclCluster: null },

  // Power management
  'measure_battery': { category: 'power', dpIds: [4, 14, 15], zclCluster: 'powerConfiguration' },
  'measure_power': { category: 'power', dpIds: [19, 112, 113], zclCluster: 'electricalMeasurement' },
  'meter_power': { category: 'power', dpIds: [17, 101, 112], zclCluster: 'metering' },
  'measure_voltage': { category: 'power', dpIds: [20, 114], zclCluster: 'electricalMeasurement' },
  'measure_current': { category: 'power', dpIds: [18, 113], zclCluster: 'electricalMeasurement' },

  // Distance/presence
  'measure_distance': { category: 'presence', dpIds: [4, 9, 109], zclCluster: null },

  // Alarms
  'alarm_motion': { category: 'alarm', dpIds: [1, 101, 105, 112], zclCluster: 'occupancySensing' },
  'alarm_human': { category: 'alarm', dpIds: [1, 101, 105], zclCluster: null },
};

// Store for device learning data (persisted in device store)
const deviceLearningCache = new Map();

/**
 * IntelligentDeviceAdapter - Main class for adaptive capability management
 */
class IntelligentDeviceAdapter {

  constructor(device) {
    this.device = device;
    this.deviceId = device.getData()?.id || 'unknown';
    this.log = device.log?.bind(device) || console.log;
    this.error = device.error?.bind(device) || console.error;

    // Learning state
    this.learningData = this._loadLearningData();
    this.isLearning = false;
    this.learningStartTime = null;
    this.maintenanceTimer = null;

    // Capability tracking
    this.capabilityDataPoints = new Map(); // capability -> { count, lastValue, lastTime, values[] }
    this.detectedCapabilities = new Set();
    this.removedCapabilities = new Set();

    this.log(`[INTELLIGENT-ADAPTER] 🧠 Initialized for device ${this.deviceId}`);
  }

  /**
   * Initialize the intelligent adapter - call this in onNodeInit
   */
  async initialize() {
    this.log(`[INTELLIGENT-ADAPTER] 🚀 Starting intelligent adaptation...`);

    // Check if device is new (needs learning) or established
    const storedData = this.device.getStoreValue('intelligentAdapter') || {};
    const pairingTime = storedData.pairingTime || Date.now();
    const timeSincePairing = Date.now() - pairingTime;

    if (timeSincePairing < LEARNING_PHASE_MAX_MS) {
      // Still in learning phase
      await this._startLearningPhase(pairingTime);
    } else if (storedData.learningComplete) {
      // Learning complete, start maintenance mode
      this._startMaintenanceMode();
    } else {
      // First init or no stored data - start learning
      await this._startLearningPhase(Date.now());
    }

    return this;
  }

  /**
   * Start the learning phase
   */
  async _startLearningPhase(startTime) {
    this.learningStartTime = startTime;
    this.isLearning = true;

    // Store pairing time
    await this.device.setStoreValue('intelligentAdapter', {
      pairingTime: startTime,
      learningComplete: false,
      lastMaintenance: null,
    }).catch(() => { });

    const remainingTime = Math.max(0, LEARNING_PHASE_MIN_MS - (Date.now() - startTime));
    const remainingMinutes = Math.ceil(remainingTime / 60000);

    this.log(`[INTELLIGENT-ADAPTER] 📚 LEARNING PHASE started`);
    this.log(`[INTELLIGENT-ADAPTER] ⏱️ Minimum learning time: ${remainingMinutes} minutes remaining`);
    this.log(`[INTELLIGENT-ADAPTER] 📊 Monitoring all data points to build capability profile...`);

    // Schedule end of learning phase (minimum 15min, max 1H)
    const learningDuration = Math.min(
      LEARNING_PHASE_MAX_MS,
      Math.max(LEARNING_PHASE_MIN_MS, remainingTime + 60000)
    );

    setTimeout(() => {
      this._completeLearningPhase();
    }, learningDuration - (Date.now() - startTime));
  }

  /**
   * Complete the learning phase and apply adaptations
   */
  async _completeLearningPhase() {
    this.isLearning = false;
    this.log(`[INTELLIGENT-ADAPTER] ═══════════════════════════════════════════════════`);
    this.log(`[INTELLIGENT-ADAPTER] 🎓 LEARNING PHASE COMPLETE`);
    this.log(`[INTELLIGENT-ADAPTER] ═══════════════════════════════════════════════════`);

    // Analyze collected data
    const analysis = this._analyzeCapabilities();

    // Apply adaptations
    await this._applyAdaptations(analysis);

    // Mark learning complete
    const storedData = this.device.getStoreValue('intelligentAdapter') || {};
    await this.device.setStoreValue('intelligentAdapter', {
      ...storedData,
      learningComplete: true,
      learningCompletedAt: Date.now(),
      confirmedCapabilities: Array.from(this.detectedCapabilities),
      removedCapabilities: Array.from(this.removedCapabilities),
    }).catch(() => { });

    // Start maintenance mode
    this._startMaintenanceMode();
  }

  /**
   * Start hourly maintenance mode
   */
  _startMaintenanceMode() {
    this.log(`[INTELLIGENT-ADAPTER] 🔄 Starting MAINTENANCE MODE (hourly re-evaluation)`);

    // Clear existing timer
    if (this.maintenanceTimer) {
      clearInterval(this.maintenanceTimer);
    }

    // Schedule hourly maintenance
    this.maintenanceTimer = setInterval(() => {
      this._runMaintenance();
    }, MAINTENANCE_INTERVAL_MS);

    // Run initial maintenance after 5 minutes
    setTimeout(() => {
      this._runMaintenance();
    }, 5 * 60 * 1000);
  }

  /**
   * Run maintenance check
   */
  async _runMaintenance() {
    this.log(`[INTELLIGENT-ADAPTER] 🔧 Running hourly MAINTENANCE check...`);

    const analysis = this._analyzeCapabilities();

    // Check for stale capabilities (no data for 2+ hours)
    const staleCapabilities = [];
    for (const [cap, data] of this.capabilityDataPoints) {
      if (data.lastTime && (Date.now() - data.lastTime) > DATA_STALENESS_MS) {
        // Only mark as stale if we haven't confirmed it with enough data
        if (data.count < MIN_DATA_POINTS_TO_CONFIRM * 2) {
          staleCapabilities.push(cap);
        }
      }
    }

    if (staleCapabilities.length > 0) {
      this.log(`[INTELLIGENT-ADAPTER] ⚠️ Stale capabilities detected: ${staleCapabilities.join(', ')}`);
    }

    // Apply any needed adaptations
    await this._applyAdaptations(analysis, true);

    // Update stored data
    const storedData = this.device.getStoreValue('intelligentAdapter') || {};
    await this.device.setStoreValue('intelligentAdapter', {
      ...storedData,
      lastMaintenance: Date.now(),
      confirmedCapabilities: Array.from(this.detectedCapabilities),
      removedCapabilities: Array.from(this.removedCapabilities),
    }).catch(() => { });
  }

  /**
   * Record a data point for a capability
   * Call this whenever device receives data
   */
  recordDataPoint(capability, value, source = 'unknown') {
    if (!MANAGEABLE_CAPABILITIES[capability]) return;

    const now = Date.now();
    let data = this.capabilityDataPoints.get(capability);

    if (!data) {
      data = {
        count: 0,
        lastValue: null,
        lastTime: null,
        firstTime: now,
        values: [],
        sources: new Set(),
      };
      this.capabilityDataPoints.set(capability, data);
    }

    // Update tracking
    data.count++;
    data.lastValue = value;
    data.lastTime = now;
    data.sources.add(source);

    // Keep last 10 values for variance analysis
    data.values.push({ value, time: now });
    if (data.values.length > 10) {
      data.values.shift();
    }

    // Mark as detected if we have enough data points
    if (data.count >= MIN_DATA_POINTS_TO_CONFIRM) {
      this.detectedCapabilities.add(capability);
    }

    if (this.isLearning) {
      this.log(`[INTELLIGENT-ADAPTER] 📊 Data: ${capability}=${value} (count: ${data.count}, source: ${source})`);
    }
  }

  /**
   * Record Tuya DP data point
   */
  recordTuyaDP(dpId, value, dataType) {
    // Find which capability this DP maps to
    for (const [cap, config] of Object.entries(MANAGEABLE_CAPABILITIES)) {
      if (config.dpIds && config.dpIds.includes(dpId)) {
        this.recordDataPoint(cap, value, `tuya_dp_${dpId}`);
      }
    }
  }

  /**
   * Record ZCL cluster data
   */
  recordZclData(clusterName, attributeName, value) {
    // Find which capability this cluster maps to
    for (const [cap, config] of Object.entries(MANAGEABLE_CAPABILITIES)) {
      if (config.zclCluster === clusterName) {
        this.recordDataPoint(cap, value, `zcl_${clusterName}`);
      }
    }
  }

  /**
   * Analyze collected capability data
   */
  _analyzeCapabilities() {
    const analysis = {
      confirmed: [],      // Capabilities with confirmed real data
      suspected: [],      // Capabilities with some data but not enough
      unused: [],         // Capabilities that never received data
      toAdd: [],          // Capabilities to add
      toRemove: [],       // Capabilities to remove
    };

    // Check each manageable capability
    for (const [cap, config] of Object.entries(MANAGEABLE_CAPABILITIES)) {
      const hasCapability = this.device.hasCapability(cap);
      const data = this.capabilityDataPoints.get(cap);

      if (data) {
        if (data.count >= MIN_DATA_POINTS_TO_CONFIRM) {
          // Confirmed - has enough data points
          analysis.confirmed.push({ capability: cap, dataPoints: data.count });

          // If device doesn't have this capability but we detected data, add it
          if (!hasCapability && !this.removedCapabilities.has(cap)) {
            analysis.toAdd.push(cap);
          }
        } else {
          // Suspected but not confirmed
          analysis.suspected.push({ capability: cap, dataPoints: data.count });
        }
      } else if (hasCapability) {
        // Device has capability but no data received
        analysis.unused.push(cap);

        // Mark for removal (only during learning phase completion or maintenance)
        if (!this.detectedCapabilities.has(cap)) {
          analysis.toRemove.push(cap);
        }
      }
    }

    this.log(`[INTELLIGENT-ADAPTER] 📈 Analysis Results:`);
    this.log(`[INTELLIGENT-ADAPTER]    ✅ Confirmed: ${analysis.confirmed.map(c => c.capability).join(', ') || 'none'}`);
    this.log(`[INTELLIGENT-ADAPTER]    🔍 Suspected: ${analysis.suspected.map(c => c.capability).join(', ') || 'none'}`);
    this.log(`[INTELLIGENT-ADAPTER]    ❌ Unused: ${analysis.unused.join(', ') || 'none'}`);
    this.log(`[INTELLIGENT-ADAPTER]    ➕ To Add: ${analysis.toAdd.join(', ') || 'none'}`);
    this.log(`[INTELLIGENT-ADAPTER]    ➖ To Remove: ${analysis.toRemove.join(', ') || 'none'}`);

    return analysis;
  }

  /**
   * Apply capability adaptations
   */
  async _applyAdaptations(analysis, isMaintenance = false) {
    const changes = [];

    // Remove unused capabilities
    for (const cap of analysis.toRemove) {
      // Don't remove critical capabilities
      if (this._isCriticalCapability(cap)) {
        this.log(`[INTELLIGENT-ADAPTER] ⚠️ Skipping removal of critical capability: ${cap}`);
        continue;
      }

      try {
        if (this.device.hasCapability(cap)) {
          await this.device.removeCapability(cap);
          this.removedCapabilities.add(cap);
          changes.push({ action: 'removed', capability: cap });
          this.log(`[INTELLIGENT-ADAPTER] ➖ REMOVED: ${cap} (no data received)`);
        }
      } catch (e) {
        this.error(`[INTELLIGENT-ADAPTER] ❌ Failed to remove ${cap}: ${e.message}`);
      }
    }

    // Add detected capabilities
    for (const cap of analysis.toAdd) {
      try {
        if (!this.device.hasCapability(cap)) {
          await this.device.addCapability(cap);
          this.removedCapabilities.delete(cap);
          changes.push({ action: 'added', capability: cap });
          this.log(`[INTELLIGENT-ADAPTER] ➕ ADDED: ${cap} (data detected)`);
        }
      } catch (e) {
        this.error(`[INTELLIGENT-ADAPTER] ❌ Failed to add ${cap}: ${e.message}`);
      }
    }

    if (changes.length > 0) {
      this.log(`[INTELLIGENT-ADAPTER] 🔄 Applied ${changes.length} adaptation(s)`);
    } else {
      this.log(`[INTELLIGENT-ADAPTER] ✅ No adaptations needed`);
    }

    return changes;
  }

  /**
   * Check if capability is critical and shouldn't be auto-removed
   */
  _isCriticalCapability(capability) {
    // These capabilities are essential for device operation
    const criticalCapabilities = [
      'onoff',
      'dim',
      'alarm_motion',  // For presence sensors
      'alarm_contact', // For contact sensors
      'alarm_smoke',   // For smoke detectors
      'alarm_water',   // For water leak detectors
    ];

    return criticalCapabilities.includes(capability);
  }

  /**
   * Load learning data from device store
   */
  _loadLearningData() {
    try {
      const stored = this.device.getStoreValue('intelligentAdapterData');
      if (stored) {
        // Restore capability tracking
        if (stored.capabilityData) {
          for (const [cap, data] of Object.entries(stored.capabilityData)) {
            this.capabilityDataPoints.set(cap, {
              ...data,
              sources: new Set(data.sources || []),
            });
          }
        }
        if (stored.detectedCapabilities) {
          this.detectedCapabilities = new Set(stored.detectedCapabilities);
        }
        if (stored.removedCapabilities) {
          this.removedCapabilities = new Set(stored.removedCapabilities);
        }
        return stored;
      }
    } catch (e) {
      // Ignore load errors
    }
    return {};
  }

  /**
   * Save learning data to device store
   */
  async _saveLearningData() {
    try {
      const dataToStore = {
        capabilityData: {},
        detectedCapabilities: Array.from(this.detectedCapabilities),
        removedCapabilities: Array.from(this.removedCapabilities),
      };

      for (const [cap, data] of this.capabilityDataPoints) {
        dataToStore.capabilityData[cap] = {
          ...data,
          sources: Array.from(data.sources),
        };
      }

      await this.device.setStoreValue('intelligentAdapterData', dataToStore);
    } catch (e) {
      // Ignore save errors
    }
  }

  /**
   * Cleanup on device delete
   */
  destroy() {
    if (this.maintenanceTimer) {
      clearInterval(this.maintenanceTimer);
      this.maintenanceTimer = null;
    }
    this._saveLearningData();
    this.log(`[INTELLIGENT-ADAPTER] 🔌 Destroyed adapter for ${this.deviceId}`);
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isLearning: this.isLearning,
      learningStartTime: this.learningStartTime,
      detectedCapabilities: Array.from(this.detectedCapabilities),
      removedCapabilities: Array.from(this.removedCapabilities),
      dataPointCounts: Object.fromEntries(
        Array.from(this.capabilityDataPoints).map(([cap, data]) => [cap, data.count])
      ),
    };
  }
}

/**
 * IntelligentBatteryManager - Smart battery capability management
 */
class IntelligentBatteryManager {

  constructor(device) {
    this.device = device;
    this.log = device.log?.bind(device) || console.log;

    // Battery detection state
    this.batteryDetected = false;
    this.batterySource = null; // 'zcl', 'tuya_dp', 'voltage'
    this.lastBatteryValue = null;
    this.lastBatteryTime = null;
    this.batteryReadAttempts = 0;
    this.maxBatteryAttempts = 5;
  }

  /**
   * Initialize battery detection
   */
  async initialize() {
    this.log(`[INTELLIGENT-BATTERY] 🔋 Starting smart battery detection...`);

    // Schedule battery detection attempts
    this._scheduleBatteryDetection();

    return this;
  }

  /**
   * Schedule battery detection attempts
   */
  _scheduleBatteryDetection() {
    // Try to detect battery at various intervals
    const intervals = [5000, 30000, 60000, 300000, 600000]; // 5s, 30s, 1m, 5m, 10m

    intervals.forEach((interval, index) => {
      setTimeout(() => {
        if (!this.batteryDetected && this.batteryReadAttempts < this.maxBatteryAttempts) {
          this._attemptBatteryDetection();
        }
      }, interval);
    });
  }

  /**
   * Attempt to detect battery
   */
  async _attemptBatteryDetection() {
    this.batteryReadAttempts++;
    this.log(`[INTELLIGENT-BATTERY] 🔍 Battery detection attempt ${this.batteryReadAttempts}/${this.maxBatteryAttempts}`);

    // Method 1: ZCL Power Configuration
    try {
      const zclNode = this.device.zclNode;
      const ep1 = zclNode?.endpoints?.[1];
      const powerCluster = ep1?.clusters?.powerConfiguration;

      if (powerCluster && typeof powerCluster.readAttributes === 'function') {
        const data = await powerCluster.readAttributes(['batteryPercentageRemaining', 'batteryVoltage'])
          .catch(() => null);

        if (data?.batteryPercentageRemaining !== undefined && data.batteryPercentageRemaining !== null) {
          const battery = Math.min(100, Math.round(data.batteryPercentageRemaining / 2));
          if (battery >= 0 && battery <= 100) {
            this._confirmBattery('zcl', battery);
            return;
          }
        }
      }
    } catch (e) {
      // ZCL method failed
    }

    // Method 2: Check if Tuya DP battery was reported
    if (this.lastBatteryValue !== null) {
      this._confirmBattery(this.batterySource || 'tuya_dp', this.lastBatteryValue);
      return;
    }

    // No battery detected yet
    if (this.batteryReadAttempts >= this.maxBatteryAttempts) {
      this.log(`[INTELLIGENT-BATTERY] ❌ No battery detected after ${this.maxBatteryAttempts} attempts`);
      this._removeBatteryCapability();
    }
  }

  /**
   * Confirm battery capability
   */
  _confirmBattery(source, value) {
    this.batteryDetected = true;
    this.batterySource = source;
    this.lastBatteryValue = value;
    this.lastBatteryTime = Date.now();

    this.log(`[INTELLIGENT-BATTERY] ✅ Battery CONFIRMED via ${source}: ${value}%`);

    // Ensure capability exists
    if (!this.device.hasCapability('measure_battery')) {
      this.device.addCapability('measure_battery').catch(() => { });
    }

    // Set value
    this.device.setCapabilityValue('measure_battery', value).catch(() => { });
  }

  /**
   * Record battery value (call from device data handler)
   */
  recordBatteryValue(value, source = 'unknown') {
    if (typeof value !== 'number' || value < 0 || value > 100) return;

    this.lastBatteryValue = value;
    this.lastBatteryTime = Date.now();
    this.batterySource = source;

    if (!this.batteryDetected) {
      this._confirmBattery(source, value);
    }
  }

  /**
   * Remove battery capability if not needed
   */
  async _removeBatteryCapability() {
    // Check if device is AC powered
    const settings = this.device.getSettings() || {};
    const powerSource = settings.power_source;

    if (powerSource === 'ac' || !this.batteryDetected) {
      try {
        if (this.device.hasCapability('measure_battery')) {
          await this.device.removeCapability('measure_battery');
          this.log(`[INTELLIGENT-BATTERY] ➖ Removed measure_battery (AC powered or not detected)`);
        }
      } catch (e) {
        // Ignore
      }
    }
  }
}

/**
 * IntelligentPowerManager - Smart power measurement management
 */
class IntelligentPowerManager {

  constructor(device) {
    this.device = device;
    this.log = device.log?.bind(device) || console.log;

    // Power measurement tracking
    this.measurements = {
      power: { detected: false, lastValue: null, lastTime: null, count: 0 },
      energy: { detected: false, lastValue: null, lastTime: null, count: 0 },
      voltage: { detected: false, lastValue: null, lastTime: null, count: 0 },
      current: { detected: false, lastValue: null, lastTime: null, count: 0 },
    };

    this.adaptationApplied = false;
  }

  /**
   * Initialize power management
   */
  async initialize() {
    this.log(`[INTELLIGENT-POWER] ⚡ Starting smart power measurement detection...`);

    // Schedule adaptation check after learning period
    setTimeout(() => {
      this._applyAdaptation();
    }, LEARNING_PHASE_MIN_MS);

    return this;
  }

  /**
   * Record power measurement
   */
  recordMeasurement(type, value) {
    if (!this.measurements[type]) return;

    const m = this.measurements[type];
    m.count++;
    m.lastValue = value;
    m.lastTime = Date.now();

    if (m.count >= MIN_DATA_POINTS_TO_CONFIRM) {
      m.detected = true;
    }
  }

  /**
   * Apply power capability adaptations
   */
  async _applyAdaptation() {
    if (this.adaptationApplied) return;
    this.adaptationApplied = true;

    this.log(`[INTELLIGENT-POWER] 🔄 Applying power capability adaptations...`);

    const capabilityMap = {
      power: 'measure_power',
      energy: 'meter_power',
      voltage: 'measure_voltage',
      current: 'measure_current',
    };

    for (const [type, cap] of Object.entries(capabilityMap)) {
      const m = this.measurements[type];
      const hasCapability = this.device.hasCapability(cap);

      if (m.detected && !hasCapability) {
        // Add detected capability
        try {
          await this.device.addCapability(cap);
          this.log(`[INTELLIGENT-POWER] ➕ Added ${cap} (detected ${m.count} data points)`);
        } catch (e) {
          // Ignore
        }
      } else if (!m.detected && hasCapability && m.count === 0) {
        // Remove unused capability
        try {
          await this.device.removeCapability(cap);
          this.log(`[INTELLIGENT-POWER] ➖ Removed ${cap} (no data received)`);
        } catch (e) {
          // Ignore
        }
      }
    }
  }
}

module.exports = {
  IntelligentDeviceAdapter,
  IntelligentBatteryManager,
  IntelligentPowerManager,
  MANAGEABLE_CAPABILITIES,
  LEARNING_PHASE_MIN_MS,
  LEARNING_PHASE_MAX_MS,
  MAINTENANCE_INTERVAL_MS,
};
