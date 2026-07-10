'use strict';

/**
 * RoomSignalAggregator - Listens to device capability changes and maps them to presence signals
 *
 * v1.0.0: Subscribes to Homey device capability events, maps them to SIGNAL types,
 * and feeds them into PresenceConfidenceScorer. Handles temporal debouncing,
 * capability-to-signal mapping, and device lifecycle.
 *
 * Supported capability mappings:
 *   alarm_motion              -> motion
 *   onoff (true)              -> light_on
 *   dim                       -> dimmer_change (delta > 5)
 *   measure_temperature       -> temperature (delta > 0.3)
 *   measure_humidity          -> humidity (delta > 1.0)
 *   measure_power / meter_power -> energy (> 5W threshold)
 *   alarm_contact             -> door_contact
 *   button / alarm_1          -> button_press
 */

const { SIGNAL } = require('./PresenceConfidenceScorer');

/** Debounce windows per signal type (ms) */
const DEBOUNCE_MS = Object.freeze({
  [SIGNAL.MOTION]: 2000,
  [SIGNAL.LIGHT_ON]: 1000,
  [SIGNAL.DIMMER_CHANGE]: 3000,
  [SIGNAL.TEMPERATURE]: 30000,
  [SIGNAL.HUMIDITY]: 30000,
  [SIGNAL.ENERGY]: 5000,
  [SIGNAL.DOOR_CONTACT]: 1000,
  [SIGNAL.BUTTON_PRESS]: 500,
});

/** Minimum change thresholds before a signal fires */
const THRESHOLDS = Object.freeze({
  dim: 5,            // dimmer delta
  temperature: 0.3,  // degrees C delta
  humidity: 1.0,     // % delta
  energy: 5,         // watts minimum
});

/**
 * Map Homey capabilities to signal types.
 * Each entry: { signalType, getValue?(value, prevValue) => boolean, customWeight?(value) }
 */
const CAPABILITY_MAP = {
  alarm_motion: {
    signalType: SIGNAL.MOTION,
    getValue: (val) => val === true,
  },
  onoff: {
    signalType: SIGNAL.LIGHT_ON,
    getValue: (val) => val === true,
  },
  dim: {
    signalType: SIGNAL.DIMMER_CHANGE,
    getValue: (val, prev) => Math.abs((val || 0) - (prev || 0)) > THRESHOLDS.dim,
  },
  measure_temperature: {
    signalType: SIGNAL.TEMPERATURE,
    getValue: (val, prev) => prev !== null && Math.abs((val || 0) - (prev || 0)) > THRESHOLDS.temperature,
    // Temperature is a weak presence indicator, reduce weight for small drifts
    customWeight: (val, prev) => {
      const delta = Math.abs((val || 0) - (prev || 0));
      return delta > 2 ? 12 : delta > 1 ? 8 : 5;
    },
  },
  measure_humidity: {
    signalType: SIGNAL.HUMIDITY,
    getValue: (val, prev) => prev !== null && Math.abs((val || 0) - (prev || 0)) > THRESHOLDS.humidity,
  },
  measure_power: {
    signalType: SIGNAL.ENERGY,
    getValue: (val) => (val || 0) > THRESHOLDS.energy,
  },
  meter_power: {
    signalType: SIGNAL.ENERGY,
    getValue: (val, prev) => prev !== null && (val || 0) > (prev || 0),
  },
  alarm_contact: {
    signalType: SIGNAL.DOOR_CONTACT,
    getValue: (val) => val === true, // contact opened = someone entered
  },
  button: {
    signalType: SIGNAL.BUTTON_PRESS,
    getValue: () => true, // any button event counts
  },
  alarm_1: {
    signalType: SIGNAL.BUTTON_PRESS,
    getValue: (val) => val === true,
  },
};

class RoomSignalAggregator {
  /**
   * @param {Object} homey - Homey App instance
   * @param {import('./PresenceConfidenceScorer')} scorer - Confidence scorer
   * @param {Object} [options]
   * @param {Function} [options.logger]
   * @param {Function} [options.onConfidenceChange] - Callback(confidenceResult)
   */
  constructor(homey, scorer, options = {}) {
    this._homey = homey;
    this._scorer = scorer;
    this._logger = options.logger || (() => {});
    this._onConfidenceChange = options.onConfidenceChange || (() => {});

    /** Map<deviceId, Map<capability, lastValue>> */
    this._deviceStates = new Map();

    /** Map<deviceId, Map<capability, debounceTimer>> */
    this._debouncers = new Map();

    /** Set<deviceId> - devices we are actively monitoring */
    this._monitoredDevices = new Set();

    /** The device IDs that belong to our room */
    this._roomDeviceIds = new Set();

    /** Map<capability, signalType> of capabilities we are interested in */
    this._activeCapabilities = new Map();
  }

  /**
   * Initialize by scanning the Homey device registry.
   * @param {string[]} deviceIds - IDs of devices to monitor for this room
   */
  async initialize(deviceIds = []) {
    this._roomDeviceIds = new Set(deviceIds);

    for (const deviceId of deviceIds) {
      try {
        const device = this._findDevice(deviceId);
        if (!device) {
          this._logger(`[AGGREGATOR] Device ${deviceId} not found, skipping`);
          continue;
        }

        this._monitorDevice(device, deviceId);
      } catch (err) {
        this._logger(`[AGGREGATOR] Failed to monitor ${deviceId}: ${err.message}`);
      }
    }

    this._logger(`[AGGREGATOR] Monitoring ${this._monitoredDevices.size} devices for ${deviceIds.length} configured`);
  }

  /**
   * Add a device at runtime (e.g., from DynamicCapabilityManager discovery).
   */
  addDevice(deviceId) {
    if (this._roomDeviceIds.has(deviceId)) return;
    this._roomDeviceIds.add(deviceId);

    const device = this._findDevice(deviceId);
    if (device) {
      this._monitorDevice(device, deviceId);
    }
  }

  /**
   * Remove a device from monitoring.
   */
  removeDevice(deviceId) {
    this._roomDeviceIds.delete(deviceId);
    this._unmonitorDevice(deviceId);
  }

  /**
   * Get the list of monitored device IDs.
   * @returns {string[]}
   */
  getMonitoredDevices() {
    return [...this._roomDeviceIds];
  }

  /**
   * @private - Subscribe to a device's capability changes
   */
  _monitorDevice(device, deviceId) {
    if (this._monitoredDevices.has(deviceId)) return;
    this._monitoredDevices.add(deviceId);

    const deviceState = new Map();
    this._deviceStates.set(deviceId, deviceState);

    const caps = device.capabilities || [];
    for (const cap of caps) {
      const mapping = CAPABILITY_MAP[cap];
      if (!mapping) continue;

      this._activeCapabilities.set(cap, mapping);

      // Store initial value
      try {
        const currentValue = device.getCapabilityValue(cap);
        deviceState.set(cap, currentValue);
      } catch (e) {
        deviceState.set(cap, null);
      }

      // Listen for changes
      try {
        device.on(`capability.${cap}`, (value) => {
          this._handleCapabilityChange(deviceId, cap, value, device);
        });
      } catch (e) {
        this._logger(`[AGGREGATOR] Could not register listener for ${deviceId}.${cap}: ${e.message}`);
      }
    }
  }

  /**
   * @private - Unsubscribe from a device
   */
  _unmonitorDevice(deviceId) {
    this._monitoredDevices.delete(deviceId);
    this._deviceStates.delete(deviceId);

    const debouncers = this._debouncers.get(deviceId);
    if (debouncers) {
      for (const timer of debouncers.values()) {
        clearTimeout(timer);
      }
      this._debouncers.delete(deviceId);
    }
  }

  /**
   * @private - Handle a capability change with debounce
   */
  _handleCapabilityChange(deviceId, capability, newValue, device) {
    const mapping = CAPABILITY_MAP[capability];
    if (!mapping) return;

    const prevValue = this._deviceStates.get(deviceId)?.get(capability) ?? null;

    // Check if the change is significant
    if (mapping.getValue && !mapping.getValue(newValue, prevValue)) {
      // Still update the stored value
      this._deviceStates.get(deviceId)?.set(capability, newValue);
      return;
    }

    // Update stored value
    this._deviceStates.get(deviceId)?.set(capability, newValue);

    // Debounce
    const debounceMs = DEBOUNCE_MS[mapping.signalType] || 1000;
    this._debounce(deviceId, capability, () => {
      const customWeight = mapping.customWeight
        ? mapping.customWeight(newValue, prevValue)
        : undefined;

      this._scorer.recordSignal(mapping.signalType, Date.now(), customWeight);

      const result = this._scorer.calculate();
      this._logger(`[AGGREGATOR] ${deviceId}.${capability} -> ${mapping.signalType} (confidence: ${result.confidence}%)`);
      this._onConfidenceChange(result);
    }, debounceMs);
  }

  /**
   * @private - Debounce utility
   */
  _debounce(deviceId, capability, fn, delayMs) {
    if (!this._debouncers.has(deviceId)) {
      this._debouncers.set(deviceId, new Map());
    }
    const deviceDebouncers = this._debouncers.get(deviceId);

    const existing = deviceDebouncers.get(capability);
    if (existing) clearTimeout(existing);

    deviceDebouncers.set(capability, this.homey.setTimeout(() => {
      if (this._destroyed) return;
      deviceDebouncers.delete(capability);
      fn();
    }, delayMs));
  }

  /**
   * @private - Find a Homey device by ID
   */
  _findDevice(deviceId) {
    try {
      const drivers = Object.values(this._homey.drivers.getDrivers());
      for (const driver of drivers) {
        const devices = driver.getDevices() || [];
        const found = devices.find(d => d.getData()?.id === deviceId || d.id === deviceId);
        if (found) return found;
      }
    } catch (e) {
      this._logger(`[AGGREGATOR] Device lookup error: ${e.message}`);
    }
    return null;
  }

  /**
   * Cleanup all listeners and timers.
   */
  destroy() {
    for (const deviceId of this._monitoredDevices) {
      this._unmonitorDevice(deviceId);
    }
    this._roomDeviceIds.clear();
    this._activeCapabilities.clear();
  }
}

module.exports = RoomSignalAggregator;
module.exports.CAPABILITY_MAP = CAPABILITY_MAP;
