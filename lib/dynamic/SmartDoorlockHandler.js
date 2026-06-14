'use strict';

/**
 * SmartDoorlockHandler
 * Universal Tuya DP mapping for Doorlocks (Tuya MCU and Standard)
 */
class SmartDoorlockHandler {
  constructor(device) {
    this.device = device;
    // DP Definitions for typical Tuya Doorlocks
    this.DP_UNLOCK = 1;         // Bool / Enum
    this.DP_UNLOCK_RECORD = 19; // String / Raw
    this.DP_BATTERY = 40;       // Value (Percentage)
    this.DP_ALARM = 11;         // Enum (e.g. tamper, wrong code)
    this.DP_DOOR_STATUS = 2;    // Bool (open/closed)
  }

  log(...args) {
    if (this.device && typeof this.device.log === 'function') {
      this.device.log('[DOORLOCK]', ...args);
    }
  }

  error(...args) {
    if (this.device && typeof this.device.error === 'function') {
      this.device.error('[DOORLOCK]', ...args);
    }
  }

  async handleDP(dpId, value) {
    try {
      if (!this.device.hasCapability('locked') && dpId === this.DP_UNLOCK) {
        // Safe addition if device doesn't have it natively
        await this.device.safeAddCapability('locked').catch(() => {});
      }

      switch (dpId) {
      case this.DP_UNLOCK:
      case this.DP_DOOR_STATUS:
        // Tuya DP: usually true = unlocked/open, false = locked/closed
        // Homey 'locked': true = locked, false = unlocked
        const isLocked = value === false || value === 0;
        await this.device.safeSetCapabilityValue('locked', isLocked);
        this.log(`🔒 Lock state updated to: ${isLocked ? 'LOCKED' : 'UNLOCKED'}`);
        return true;

      case this.DP_BATTERY:
        if (!this.device.hasCapability('measure_battery')) {
          await this.device.safeAddCapability('measure_battery').catch(() => {});
        }
        await this.device.safeSetCapabilityValue('measure_battery', value);
        this.log(`🔋 Doorlock Battery updated: ${value}%`);
        return true;

      case this.DP_UNLOCK_RECORD:
        this.log(`🗝️ Unlock Record received: ${value}`);
        // Can be tied to a flow card later
        return true;

      case this.DP_ALARM:
        this.log(`🚨 Lock Alarm triggered: code ${value}`);
        return true;
      }
    } catch (err) {
      this.error(`Failed to handle DP ${dpId}: ${err?.message}`);
    }
    return false;
  }
}

module.exports = SmartDoorlockHandler;
