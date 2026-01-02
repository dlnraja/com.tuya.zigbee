'use strict';

const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      CONTACT / DOOR SENSOR - v5.5.343 DEBOUNCE FIX (Lasse_K forum report)   ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Source: https://www.zigbee2mqtt.io/devices/TS0203.html                     ║
 * ║  Features: contact, battery, voltage, tamper, battery_low                    ║
 * ║  v5.5.343: Added debounce to prevent unstable active/inactive toggling      ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class ContactSensorDevice extends HybridSensorBase {

  get mainsPowered() { return false; }

  get sensorCapabilities() {
    return ['alarm_contact', 'measure_battery', 'alarm_tamper'];
  }

  /**
   * v5.5.130: ENRICHED dpMappings from Zigbee2MQTT TS0203
   * v5.5.343: Added debounce wrapper for contact state
   */
  get dpMappings() {
    return {
      // ═══════════════════════════════════════════════════════════════════
      // CONTACT STATE - v5.5.343: Debounced to prevent rapid toggling
      // ═══════════════════════════════════════════════════════════════════
      // Contact state - DP 1 (0=open, 1=closed for most)
      1: {
        capability: 'alarm_contact',
        transform: (v) => {
          if (typeof v === 'boolean') return v;
          return v === 0 || v === 'open';
        },
        debounce: 500 // v5.5.343: 500ms debounce to prevent rapid toggling
      },
      // Alternative contact DP - DP 101
      101: {
        capability: 'alarm_contact',
        transform: (v) => v === true || v === 1 || v === 'open',
        debounce: 500
      },

      // ═══════════════════════════════════════════════════════════════════
      // BATTERY (multiple DPs depending on model)
      // ═══════════════════════════════════════════════════════════════════
      // Battery level - DP 2
      2: { capability: 'measure_battery', divisor: 1 },
      // Battery state - DP 3 (enum: 0=normal, 1=low) - SDK3: alarm_battery obsolète, utiliser internal
      3: { capability: null, internal: 'battery_low', transform: (v) => v === 1 || v === 'low' },
      // Battery alt - DP 4
      4: { capability: 'measure_battery', divisor: 1 },
      // Battery alt2 - DP 15
      15: { capability: 'measure_battery', divisor: 1 },

      // ═══════════════════════════════════════════════════════════════════
      // TAMPER DETECTION
      // ═══════════════════════════════════════════════════════════════════
      5: { capability: 'alarm_tamper', transform: (v) => v === true || v === 1 },

      // ═══════════════════════════════════════════════════════════════════
      // v5.5.130: ADDITIONAL FEATURES from Zigbee2MQTT
      // ═══════════════════════════════════════════════════════════════════
      // Battery voltage (mV) - for diagnostic purposes
      6: { capability: null, internal: 'battery_voltage' },
      // Sensitivity setting (some models)
      9: { capability: null, setting: 'sensitivity' },
      // Report interval (some models)
      10: { capability: null, setting: 'report_interval' },
    };
  }

  async onNodeInit({ zclNode }) {
    // v5.5.343: Initialize debounce state
    this._contactDebounce = {
      lastValue: null,
      lastTime: 0,
      timer: null
    };

    // Parent handles EVERYTHING: Tuya DP, ZCL, IAS Zone, battery
    await super.onNodeInit({ zclNode });

    // v5.5.343: Override _safeSetCapability for contact debounce
    this._originalSafeSetCapability = this._safeSetCapability?.bind(this);

    this.log('[CONTACT] v5.5.343 - DPs: 1,2,3,4,5,15,101 | ZCL: IAS,PWR,EF00');
    this.log('[CONTACT] ✅ Contact sensor ready (with debounce)');
  }

  /**
   * v5.5.343: FORUM FIX - Debounced contact state to prevent unstable toggling
   * Lasse_K reported: "shows active and inactive in the same time sequence"
   * This debounce prevents rapid state changes within 500ms window
   */
  async setCapabilityValue(capability, value) {
    if (capability === 'alarm_contact') {
      const now = Date.now();
      const debounceMs = 500;

      // Check if this is a rapid toggle (within debounce window)
      if (this._contactDebounce.lastValue !== null &&
          now - this._contactDebounce.lastTime < debounceMs) {

        // If toggling back to previous value rapidly, likely noise - ignore
        if (value !== this._contactDebounce.lastValue) {
          this.log(`[CONTACT-DEBOUNCE] ⚠️ Rapid toggle detected (${now - this._contactDebounce.lastTime}ms) - debouncing`);

          // Clear existing timer
          if (this._contactDebounce.timer) {
            this.homey.clearTimeout(this._contactDebounce.timer);
          }

          // Set timer to apply value after debounce window
          this._contactDebounce.timer = this.homey.setTimeout(async () => {
            this.log(`[CONTACT-DEBOUNCE] ✅ Applying debounced value: ${value}`);
            this._contactDebounce.lastValue = value;
            this._contactDebounce.lastTime = Date.now();
            await super.setCapabilityValue(capability, value).catch(() => {});
          }, debounceMs);

          return; // Don't apply yet
        }
      }

      // Normal update - apply immediately
      this._contactDebounce.lastValue = value;
      this._contactDebounce.lastTime = now;
    }

    return super.setCapabilityValue(capability, value);
  }

  /**
   * v5.5.343: Cleanup on uninit
   */
  async onUninit() {
    if (this._contactDebounce?.timer) {
      this.homey.clearTimeout(this._contactDebounce.timer);
    }
    if (super.onUninit) {
      await super.onUninit();
    }
  }
}

module.exports = ContactSensorDevice;
