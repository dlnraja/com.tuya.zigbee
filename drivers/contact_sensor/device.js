'use strict';

const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      CONTACT / DOOR SENSOR - v5.5.344 IAS ZONE KEEP-ALIVE FIX               ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Source: https://www.zigbee2mqtt.io/devices/TS0203.html                     ║
 * ║  Features: contact, battery, voltage, tamper, battery_low                    ║
 * ║                                                                              ║
 * ║  v5.5.344: CRITICAL FIX for IAS Zone keep-alive fake state changes          ║
 * ║  Research: github.com/Koenkk/zigbee2mqtt/discussions/25874                  ║
 * ║  - TS0203 sensors send IAS Zone keep-alive that causes fake state changes   ║
 * ║  - Affected: _TZ3000_bpkijo14, _TZ3000_x8q36xwf and others                  ║
 * ║  - Solution: Filter repeated states + longer debounce + state validation    ║
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
      // v5.5.531: FIXED inverted logic per Z2M: contact=true means CLOSED, contact=false means OPEN
      // Homey: alarm_contact=true means OPEN (alarm!), alarm_contact=false means CLOSED (normal)
      1: {
        capability: 'alarm_contact',
        transform: (v) => {
          // Boolean: Z2M sends true=closed, false=open → invert for Homey
          if (typeof v === 'boolean') return !v;
          // Numeric/string: 0 or 'open' means open → alarm=true
          return v === 0 || v === 'open';
        },
        debounce: 500 // v5.5.343: 500ms debounce to prevent rapid toggling
      },
      // Alternative contact DP - DP 101
      // v5.5.531: Same inversion logic
      101: {
        capability: 'alarm_contact',
        transform: (v) => {
          if (typeof v === 'boolean') return !v;
          return v === 0 || v === 'open';
        },
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
    // v5.5.344: Initialize state tracking BEFORE parent init
    this._contactState = {
      lastValue: null,           // Last confirmed value
      lastChangeTime: 0,         // Time of last REAL change
      lastIASTime: 0,            // Time of last IAS message
      iasMessageCount: 0,        // Count of IAS messages for keep-alive detection
      timer: null,               // Debounce timer
      confirmedValue: null       // Value confirmed after debounce
    };

    // v5.5.344: Check for invert setting and debounce time
    this._invertContact = this.getSetting('invert_contact') || false;
    this._debounceMs = (this.getSetting('debounce_time') || 2) * 1000; // Default 2 seconds

    // v5.5.344: Get manufacturer for problematic device detection
    const mfr = this.getSetting('zb_manufacturer_name') || this.getData()?.manufacturerName || '';
    this._isProblematicSensor = [
      '_TZ3000_bpkijo14',
      '_TZ3000_x8q36xwf',
      '_TZ3000_402jjyro',
      '_TZ3000_n2egfsli'
    ].includes(mfr);

    // v5.5.506: Forum fix Lasse_K - HOBEIAN ZG-102Z reports inverted by default
    // These sensors report closed=alarm, open=no alarm (inverted from standard)
    const invertedByDefault = ['HOBEIAN'].includes(mfr);
    if (invertedByDefault && !this.getSetting('invert_contact')) {
      this._invertContact = true;
      this.log(`[CONTACT] ⚠️ Sensor ${mfr} inverted by default`);
    }

    if (this._isProblematicSensor) {
      this.log(`[CONTACT] ⚠️ Problematic sensor detected (${mfr}) - extended debounce enabled`);
      this._debounceMs = Math.max(this._debounceMs, 3000); // Min 3 seconds for problematic sensors
    }

    // Parent handles EVERYTHING: Tuya DP, ZCL, IAS Zone, battery
    await super.onNodeInit({ zclNode });

    this.log('[CONTACT] v5.5.344 - DPs: 1,2,3,4,5,15,101 | ZCL: IAS,PWR,EF00');
    this.log(`[CONTACT] ✅ Ready (debounce: ${this._debounceMs}ms, invert: ${this._invertContact}, problematic: ${this._isProblematicSensor})`);
  }

  /**
   * v5.5.344: Handle settings changes
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes('invert_contact')) {
      this._invertContact = newSettings.invert_contact;
      this.log(`[CONTACT] Invert setting changed to: ${this._invertContact}`);
      // Toggle current state if inverted
      const current = this.getCapabilityValue('alarm_contact');
      if (current !== null) {
        await this.setCapabilityValue('alarm_contact', !current).catch(() => { });
      }
    }
    if (super.onSettings) {
      await super.onSettings({ oldSettings, newSettings, changedKeys });
    }
  }

  /**
   * v5.5.344: COMPREHENSIVE FIX for IAS Zone keep-alive fake state changes
   *
   * Research from multiple sources:
   * - Zigbee2MQTT #25874: TS0203 sends IAS keep-alive every 15-60 minutes
   * - Zigbee2MQTT #27269: _TZ3000_x8q36xwf reports "closed" after exactly 1:02:59
   * - deCONZ: Uses duration config + IAS_SensorSendsRestoreReports() check
   * - JohanBendz Hue: "keep alive code" + suppression for occupancy sensors
   *
   * Solution:
   * 1. Apply invert setting if configured
   * 2. Filter rapid toggles (debounce)
   * 3. For problematic sensors, ignore "closed" if last "open" was ~1h ago (keep-alive detection)
   * 4. Log all state changes for debugging
   */
  async setCapabilityValue(capability, value) {
    if (capability === 'alarm_contact') {
      // Apply invert setting if enabled
      let finalValue = this._invertContact ? !value : value;

      const now = Date.now();
      const state = this._contactState || { lastValue: null, lastChangeTime: 0, timer: null };

      // If same value as last confirmed, just update timestamp and skip
      if (state.confirmedValue === finalValue) {
        state.lastIASTime = now;
        state.iasMessageCount++;

        // Log keep-alive detection (but not spam)
        if (state.iasMessageCount % 10 === 1) {
          this.log(`[CONTACT] 💓 Keep-alive detected (count: ${state.iasMessageCount}, value unchanged: ${finalValue})`);
        }
        return; // Don't re-apply same value
      }

      // New value detected - check if it's within debounce window
      const timeSinceLastChange = now - state.lastChangeTime;

      if (state.lastValue !== null && timeSinceLastChange < this._debounceMs) {
        // Rapid change detected - could be noise or real
        this.log(`[CONTACT] ⚠️ Rapid change ${state.lastValue} → ${finalValue} (${timeSinceLastChange}ms) - debouncing`);

        // Clear existing timer
        if (state.timer) {
          this.homey.clearTimeout(state.timer);
        }

        // Set timer to apply after debounce window
        state.timer = this.homey.setTimeout(async () => {
          this.log(`[CONTACT] ✅ Debounce complete - applying: ${finalValue}`);
          state.lastValue = finalValue;
          state.confirmedValue = finalValue;
          state.lastChangeTime = Date.now();
          state.iasMessageCount = 0;
          await super.setCapabilityValue(capability, finalValue).catch(() => { });
        }, this._debounceMs);

        return; // Don't apply yet
      }

      // For problematic sensors, add extra validation based on Zigbee2MQTT #27269
      // These sensors send false "closed" after exactly ~1:02:59 (62-65 minutes)
      if (this._isProblematicSensor && state.confirmedValue !== null) {
        // If changing FROM open TO closed, be extra careful (common false positive)
        if (state.confirmedValue === true && finalValue === false) {
          // Check if this is likely the 1-hour keep-alive bug
          const keepAliveWindow = timeSinceLastChange >= 3600000 && timeSinceLastChange <= 4000000; // 60-67 minutes

          if (keepAliveWindow) {
            this.log(`[CONTACT] 🚫 BLOCKED: Likely 1-hour keep-alive false "closed" (${Math.round(timeSinceLastChange / 60000)}min since open)`);
            return; // Ignore this false state change completely
          }

          this.log(`[CONTACT] 🔍 Problematic sensor: open→closed change - applying extended debounce`);

          if (state.timer) {
            this.homey.clearTimeout(state.timer);
          }

          // Double debounce for problematic open→closed transitions
          state.timer = this.homey.setTimeout(async () => {
            this.log(`[CONTACT] ✅ Extended debounce complete - applying: ${finalValue}`);
            state.lastValue = finalValue;
            state.confirmedValue = finalValue;
            state.lastChangeTime = Date.now();
            state.iasMessageCount = 0;
            await super.setCapabilityValue(capability, finalValue).catch(() => { });
          }, this._debounceMs * 2);

          return;
        }
      }

      // Normal state change - apply immediately
      this.log(`[CONTACT] 🚪 State change: ${state.confirmedValue} → ${finalValue}`);
      state.lastValue = finalValue;
      state.confirmedValue = finalValue;
      state.lastChangeTime = now;
      state.iasMessageCount = 0;

      // Clear any pending timer
      if (state.timer) {
        this.homey.clearTimeout(state.timer);
        state.timer = null;
      }

      // CRITICAL FIX: Apply finalValue (with invert) for alarm_contact
      return super.setCapabilityValue(capability, finalValue);
    }

    // For all other capabilities, pass through unchanged
    return super.setCapabilityValue(capability, value);
  }

  /**
   * v5.5.344: Cleanup on uninit
   */
  async onUninit() {
    if (this._contactState?.timer) {
      this.homey.clearTimeout(this._contactState.timer);
    }
    if (super.onUninit) {
      await super.onUninit();
    }
  }
}

module.exports = ContactSensorDevice;
