'use strict';

/**
 * DynamicEnergyManager - v5.3.59
 *
 * Intelligent real-time energy monitoring and adaptation.
 * Auto-detects and configures energy capabilities based on device data.
 *
 * Features:
 * - Auto-detect power monitoring capabilities
 * - Dynamic energy calculation
 * - Cost estimation
 * - Historical tracking
 * - Threshold alerts
 */

// Energy capability definitions
const ENERGY_CAPABILITIES = {
  measure_power: {
    title: 'Power',
    units: 'W',
    icon: '⚡',
    tuyaDPs: [19, 20, 104, 112, 113],
    converters: {
      default: (v) => v / 10,
      raw: (v) => v,
      divide100: (v) => v / 100
    }
  },
  measure_voltage: {
    title: 'Voltage',
    units: 'V',
    icon: '🔌',
    tuyaDPs: [18, 20, 101, 111],
    converters: {
      default: (v) => v / 10,
      raw: (v) => v
    }
  },
  measure_current: {
    title: 'Current',
    units: 'A',
    icon: '⚡',
    tuyaDPs: [18, 19, 102, 112],
    converters: {
      default: (v) => v / 1000,
      divide100: (v) => v / 100
    }
  },
  meter_power: {
    title: 'Energy',
    units: 'kWh',
    icon: '📊',
    tuyaDPs: [17, 101, 103, 121],
    converters: {
      default: (v) => v / 100,
      divide1000: (v) => v / 1000
    }
  }
};

// Tuya DP to energy mapping heuristics
const ENERGY_DP_HEURISTICS = [
  // Power consumption (Watts)
  { dpIds: [19, 104, 113], valueRange: [0, 50000], capability: 'measure_power', converter: 'default' },
  { dpIds: [20, 112], valueRange: [0, 500000], capability: 'measure_power', converter: 'divide100' },

  // Voltage (Volts)
  { dpIds: [18, 101, 111], valueRange: [1000, 2600], capability: 'measure_voltage', converter: 'default' },
  { dpIds: [20], valueRange: [100, 260], capability: 'measure_voltage', converter: 'raw' },

  // Current (Amps)
  { dpIds: [18, 102, 112], valueRange: [0, 100000], capability: 'measure_current', converter: 'default' },

  // Energy consumption (kWh)
  { dpIds: [17, 103, 121], valueRange: [0, 10000000], capability: 'meter_power', converter: 'default' }
];

class DynamicEnergyManager {

  constructor(device) {
    this.device = device;
    this.homey = device.homey;
    this._destroyed = false;
    this.log = (...args) => {
      if (!this._destroyed) device.log('[ENERGY]', ...args);
    };
    this.error = (...args) => {
      if (!this._destroyed) device.error('[ENERGY]', ...args);
    };

    // Energy tracking
    this._energyData = {
      power: { current: 0, min: Infinity, max: 0, avg: 0, samples: [] },
      voltage: { current: 0, min: Infinity, max: 0, avg: 0, samples: [] },
      current: { current: 0, min: Infinity, max: 0, avg: 0, samples: [] },
      energy: { current: 0, startOfDay: 0, startOfMonth: 0 }
    };

    // Discovered energy DPs
    this._discoveredEnergyDPs = new Map();

    // Thresholds for alerts
    this._thresholds = {
      power: { high: 3000, low: 0 },
      voltage: { high: 250, low: 200 },
      current: { high: 16, low: 0 }
    };

    // Listeners
    this._listeners = new Map();

    // Sample history (for averages)
    this._maxSamples = 100;
  }

  /**
   * Initialize energy manager
   */
  async initialize() {
    this.log('Initializing energy manager...');

    // Restore saved data
    try {
      const saved = await this.device.getStoreValue('energy_data') || {};
      if (saved.energyData) {
        this._energyData = { ...this._energyData, ...saved.energyData };
      }
      if (saved.discoveredDPs) {
        for (const [dpId, mapping] of Object.entries(saved.discoveredDPs)) {
          this._discoveredEnergyDPs.set(parseInt(dpId), mapping);
        }
      }
    } catch (err) {
      this.error('Failed to restore energy data:', err.message);
    }

    // Ensure energy capabilities exist
    await this._ensureEnergyCapabilities();

    // Setup periodic saving
    this._startPeriodicSave();

    this.log(`✅ Energy manager initialized with ${this._discoveredEnergyDPs.size} discovered DPs`);
  }

  /**
   * Process incoming DP for energy data
   */
  async processDP(dpId, value, dpType = null) {
    // Check if already mapped
    if (this._discoveredEnergyDPs.has(dpId)) {
      const mapping = this._discoveredEnergyDPs.get(dpId);
      await this._applyEnergyValue(mapping, value);
      return mapping;
    }

    // Try to discover energy capability
    const mapping = this._discoverEnergyCapability(dpId, value);

    if (mapping) {
      this._discoveredEnergyDPs.set(dpId, mapping);
      await this._saveData();
      await this._applyEnergyValue(mapping, value);

      this._emit('energyDiscovered', { dpId, mapping });
      return mapping;
    }

    return null;
  }

  /**
   * Discover energy capability for a DP
   */
  _discoverEnergyCapability(dpId, value) {
    if (typeof value !== 'number') return null;

    for (const heuristic of ENERGY_DP_HEURISTICS) {
      if (!heuristic.dpIds.includes(dpId)) continue;

      const [min, max] = heuristic.valueRange;
      if (value >= min && value <= max) {
        this.log(`🔋 Discovered energy DP${dpId} → ${heuristic.capability}`);

        return {
          capability: heuristic.capability,
          dpId,
          converter: heuristic.converter,
          discoveredAt: Date.now()
        };
      }
    }

    return null;
  }

  /**
   * Apply energy value to capability
   */
  async _applyEnergyValue(mapping, rawValue) {
    const capDef = ENERGY_CAPABILITIES[mapping.capability];
    if (!capDef) return;

    // Convert value
    const converter = capDef.converters[mapping.converter] || capDef.converters.default;
    const value = converter(rawValue);

    // Update tracking
    this._updateTracking(mapping.capability, value);

    // Set capability
    if (this.device.hasCapability(mapping.capability)) {
      try {
        await this.device.setCapabilityValue(mapping.capability, value);
        this.log(`📊 ${mapping.capability} = ${value} ${capDef.units}`);

        // Check thresholds
        await this._checkThresholds(mapping.capability, value);

        // Emit for flow triggers
        this._emit('energyChanged', {
          capability: mapping.capability,
          value,
          unit: capDef.units,
          dpId: mapping.dpId
        });
      } catch (err) {
        this.error(`Failed to set ${mapping.capability}:`, err.message);
      }
    }
  }

  /**
   * Update tracking data
   */
  _updateTracking(capability, value) {
    const key = capability.replace('measure_', '').replace('meter_', '');
    const data = this._energyData[key];

    if (!data) return;

    data.current = value;
    data.min = Math.min(data.min, value);
    data.max = Math.max(data.max, value);

    // Add to samples for average
    if (!data.samples) data.samples = [];
    data.samples.push(value);
    if (data.samples.length > this._maxSamples) {
      data.samples.shift();
    }

    // Calculate average
    data.avg = data.samples.reduce((a, b) => a + b, 0) / data.samples.length;
  }

  /**
   * Check thresholds and trigger alerts
   */
  async _checkThresholds(capability, value) {
    const key = capability.replace('measure_', '');
    const threshold = this._thresholds[key];

    if (!threshold) return;

    if (value > threshold.high) {
      this._emit('thresholdExceeded', {
        capability,
        value,
        threshold: threshold.high,
        type: 'high'
      });

      // Trigger flow
      await this._triggerThresholdFlow(capability, value, 'high');
    }

    if (value < threshold.low && threshold.low > 0) {
      this._emit('thresholdExceeded', {
        capability,
        value,
        threshold: threshold.low,
        type: 'low'
      });

      await this._triggerThresholdFlow(capability, value, 'low');
    }
  }

  /**
   * Trigger threshold flow card
   */
  async _triggerThresholdFlow(capability, value, type) {
    const driverId = this.device.driver?.id || 'unknown';
    const triggerId = `${driverId}_${capability}_${type}`;

    try {
      const card = this.homey.flow.getDeviceTriggerCard(triggerId);
      if (card) {
        await card.trigger(this.device, { value });
        this.log(`🔔 Triggered: ${triggerId}`);
      }
    } catch (err) {
      // Card doesn't exist, ignore
    }
  }

  /**
   * Ensure energy capabilities exist on device
   */
  async _ensureEnergyCapabilities() {
    for (const [capability, def] of Object.entries(ENERGY_CAPABILITIES)) {
      // Only add if we have discovered DPs for it
      const hasDiscoveredDP = Array.from(this._discoveredEnergyDPs.values())
        .some(m => m.capability === capability);

      if (hasDiscoveredDP && !this.device.hasCapability(capability)) {
        try {
          await this.device.addCapability(capability);
          this.log(`➕ Added energy capability: ${capability}`);
        } catch (err) {
          this.error(`Failed to add ${capability}:`, err.message);
        }
      }
    }
  }

  /**
   * Get energy statistics
   */
  getStats() {
    return {
      power: { ...this._energyData.power },
      voltage: { ...this._energyData.voltage },
      current: { ...this._energyData.current },
      energy: { ...this._energyData.energy },
      discoveredDPs: Array.from(this._discoveredEnergyDPs.entries())
    };
  }

  /**
   * Calculate daily energy cost
   */
  calculateDailyCost(pricePerKwh = 0.15) {
    const dailyKwh = this._energyData.energy.current - this._energyData.energy.startOfDay;
    return {
      kwh: dailyKwh,
      cost: dailyKwh * pricePerKwh,
      currency: '€'
    };
  }

  /**
   * Set custom thresholds
   */
  setThresholds(capability, high, low) {
    const key = capability.replace('measure_', '');
    if (this._thresholds[key]) {
      this._thresholds[key] = { high, low };
      this.log(`⚙️ Thresholds set for ${capability}: high=${high}, low=${low}`);
    }
  }

  /**
   * Save data periodically
   */
  _startPeriodicSave() {
    // Save every 5 minutes
    this._saveInterval = setInterval(() => {
      this._saveData();
    }, 5 * 60 * 1000);
  }

  /**
   * Save data to store
   * v5.5.21: Check if device still exists before saving
   */
  async _saveData() {
    // v5.5.21: Skip if destroyed or device doesn't exist
    if (this._destroyed) return;

    try {
      // v5.5.21: Verify device still exists in Homey
      if (!this.device || typeof this.device.setStoreValue !== 'function') {
        this._destroyed = true;
        this.destroy();
        return;
      }

      await this.device.setStoreValue('energy_data', {
        energyData: this._energyData,
        discoveredDPs: Object.fromEntries(this._discoveredEnergyDPs),
        savedAt: Date.now()
      });
    } catch (err) {
      // v5.5.21: If device not found, mark as destroyed and stop interval
      if (err.message && (err.message.includes('Not Found') || err.message.includes('not found'))) {
        this._destroyed = true;
        this.destroy();
      }
    }
  }

  /**
   * Cleanup
   * v5.5.21: Set destroyed flag to prevent further operations
   */
  destroy() {
    this._destroyed = true;
    if (this._saveInterval) {
      clearInterval(this._saveInterval);
      this._saveInterval = null;
    }
    this._listeners.clear();
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
}

module.exports = DynamicEnergyManager;
