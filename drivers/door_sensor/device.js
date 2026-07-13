'use strict';
// v2026-07-12: Door / Window Sensor driver
// Created to absorb the 5 mfrs that were previously mapped to the non-existent
// 'door_sensor' driver. These mfrs use TS0203 (door/window contact sensor)
// and are common Tuya/Zigbee devices.
//
// Inherits from UnifiedSensorBase (IAS Zone handling, debounce, etc.)

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');
const { includesCI } = require('../../lib/utils/CaseInsensitiveMatcher');

const VALIDATION = {
  BATTERY_MIN: 0,
  BATTERY_MAX: 100,
};

const BATTERY_THROTTLE_MS = 300000; // 5 minutes
const DEBOUNCE_MS = 1500;          // 1.5s default for door sensors

class DoorSensorDevice extends UnifiedSensorBase {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    // Register IAS Zone for contact state (if not already)
    if (this.hasCapability('alarm_contact') === false) {
      await this.addCapability('alarm_contact').catch((e) => this.error('add alarm_contact', e));
    }

    // Mark as door sensor device
    this._deviceType = 'door_sensor';
    this._debounceMs = DEBOUNCE_MS;
    this._batteryThrottleMs = BATTERY_THROTTLE_MS;
  }

  // Override capability listener to use _safeSet (avoid infinite loop)
  async setCapabilityValueSafe(cap, value) {
    if (typeof this._safeSetCapability === 'function') {
      return this._safeSetCapability(cap, value);
    }
    // Fallback: use safeSetCapabilityValue from BaseUnifiedDevice (avoids raw setCapabilityValue)
    if (typeof this.safeSetCapabilityValue === 'function') {
      return this.safeSetCapabilityValue(cap, value);
    }
    return undefined;
  }
}

module.exports = DoorSensorDevice;
