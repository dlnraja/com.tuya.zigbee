'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');


const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');
const { setupSonoffSensor, handleSonoffSensorSettings } = require('../../lib/mixins/SonoffSensorMixin');
// v5.11.99: IASZoneManager removed  UnifiedSensorBase handles IAS enrollment+inversion
// v5.12.0: FIX Lasse_K #802  IEEEAddressManager (7 methods) for CIE write + warn hybrid devices

// 
// v5.5.793: VALIDATION CONSTANTS - Centralized thresholds for data validation
// 
const VALIDATION = {
  BATTERY_MIN: 0,
  BATTERY_MAX: 100,
};

// v5.5.793: Battery report throttling (prevents spam on frequent reports)
const BATTERY_THROTTLE_MS = 300000; // 5 minutes minimum between updates

// v5.5.793: Debounce defaults
const DEBOUNCE = {
  DEFAULT_MS: 2000,           // 2 seconds default
  PROBLEMATIC_MIN_MS: 3000,   // 3 seconds minimum for problematic sensors
  KEEP_ALIVE_MIN_MS: 3600000, // 60 minutes (keep-alive window start)
  KEEP_ALIVE_MAX_MS: 4000000, // ~67 minutes (keep-alive window end)
};

/**
 * 
 *       CONTACT / DOOR SENSOR - v5.5.344 IAS ZONE KEEP-ALIVE FIX               
 * 
 *   Source: https://www.zigbee2mqtt.io/devices/TS0203.html                     
 *   Features: contact, battery, voltage, tamper, battery_low                    
 *                                                                               
 *   v5.5.344: CRITICAL FIX for IAS Zone keep-alive fake state changes          
 *   Research: github.com/Koenkk/zigbee2mqtt/discussions/25874                  
 *   - TS0203 sensors send IAS Zone keep-alive that causes fake state changes   
 *   - Affected: _TZ3000_bpkijo14, _TZ3000_x8q36xwf and others                  
 *   - Solution: Filter repeated states + longer debounce + state validation    
 * 
 */
class ContactSensorDevice extends UnifiedSensorBase {

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
      // 
      // CONTACT STATE - v5.5.343: Debounced to prevent rapid toggling
      // 
      // Contact state - DP 1 (0=open, 1=closed for most)
      // v5.5.531: FIXED inverted logic per Z2M: contact=true means CLOSED, contact=false means OPEN
      // Homey: alarm_contact=true means OPEN (alarm!), alarm_contact=false means CLOSED (normal)
      1: {
        capability: 'alarm_contact',
        transform: (v) => {
          // Boolean: Z2M sends true=closed, false=open  invert for Homey
          if (typeof v === 'boolean') return !v;
          // Numeric/string: 0 or 'open' means open  alarm=true
          return v === 0 || v === 'open';
        },
        debounce: 500 // v5.5.343: 500ms debounce to prevent rapid toggling
      },
      // v5.12.2: DP 101 now mapped to measure_luminance only (line 128)
      // 
      // BATTERY (multiple DPs depending on model)
      // 
      // Battery level - DP 2 (v5.5.793: Added validation)
      2: { 
        capability: 'measure_battery', 
        transform: (v) => {
          const battery = Math.max(VALIDATION.BATTERY_MIN, Math.min(VALIDATION.BATTERY_MAX, v));
          return battery;
        }
      },
      // Battery state - DP 3 (enum: 0=normal, 1=low) - SDK3: alarm_battery obsolÃ¨te, utiliser internal
      3: { internal: true, type: 'battery_low', transform: (v) => v === 1 || v === 'low' },
      // Battery alt - DP 4 (v5.5.793: Added validation)
      4: { 
        capability: 'measure_battery', 
        transform: (v) => {
          const battery = Math.max(VALIDATION.BATTERY_MIN, Math.min(VALIDATION.BATTERY_MAX, v));
          return battery;
        }
      },
      // Battery alt2 - DP 15 (v5.5.793: Added validation)
      15: { 
        capability: 'measure_battery', 
        transform: (v) => {
          const battery = Math.max(VALIDATION.BATTERY_MIN, Math.min(VALIDATION.BATTERY_MAX, v));
          return battery;
        }
      },

      // 
      // TAMPER DETECTION
      // 
      5: { capability: 'alarm_tamper', transform: (v) => v === true || v === 1 },

      // 
      // v5.5.130: ADDITIONAL FEATURES from Zigbee2MQTT
      // 
      // Battery voltage (mV) - for diagnostic purposes
      6: { internal: true, type: 'battery_voltage' },
      // Sensitivity setting (some models)
      9: { setting: 'sensitivity' },
      // Report interval (some models)
      10: { setting: 'report_interval' },
      // v5.11.102: Luminance (lux) for _TZE200_pay2byax ZG-102ZL variant
      101: { capability: 'measure_luminance', divisor: 1 },
    };
  }

  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'ssIasZone',
          attributeName: 'zoneStatus',
          minInterval: 0,
          maxInterval: 3600,
          minChange: 1,
        },
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        },
        {
          cluster: 'msIlluminanceMeasurement',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 50,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

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
    // v5.5.793: Use constants for defaults
    // v5.8.98: Wire up reverse_alarm (was dead) + track user-explicit invert
    const userInvert = this.getSetting('invert_contact') || false;
    const userReverse = this.getSetting('reverse_alarm') || false;
    this._invertContact = userInvert || userReverse;
    this._userExplicitInvert = this._invertContact;
    this._debounceMs = (this.getSetting('debounce_time') || safeParse(DEBOUNCE.DEFAULT_MS,1000), 1000);
    this._lastBatteryReportTime = 0; // v5.5.793: Battery throttling

    // v5.5.344: Get manufacturer for problematic device detection
    const mfr = this.getSetting('zb_manufacturer_name') || this.getData()?.manufacturerName || '';this._isProblematicSensor = [
      '_TZ3000_bpkijo14',
      '_TZ3000_x8q36xwf',
      '_TZ3000_402jjyro',
      '_TZ3000_n2egfsli'
    ].includes(mfr);

    // v5.5.506: Forum fix Lasse_K - HOBEIAN ZG-102Z reports inverted by default
    // v5.5.713: Expanded list of sensors that report inverted by default
    // v5.5.776: REMOVED HOBEIAN - Lasse_K forum Jan 2026 confirms ZG-102Z works correctly WITHOUT inversion
    // These sensors report closed=alarm, open=no alarm (inverted from standard)
    // v5.5.908: Added _TZ3000_996rpfy6 (blutch32 forum - always shows no)
    // v5.12.2: Added _TZE200_pay2byax (ZG-102ZL reversed contact)
    const invertedByDefault = [
      // v5.12.1: REMOVED HOBEIAN  Lasse_K #1592 'always ja': standard TS0203 IAS bit0=1=open maps directly to alarm_contact=true, no inversion needed
      // 'HOBEIAN',  
      '_TZ3000_26fmupbb',  // Known inverted
      '_TZ3000_n2egfsli',  // Known inverted
      '_TZ3000_oxslv1c9',  // Known inverted
      '_TZ3000_402jjyro',  // Known inverted
      '_TZ3000_2mbfxlzr',  // Known inverted
      '_TZ3000_bzxloft2',  // Known inverted (forum reports)
      '_TZ3000_yxqnffam',  // Known inverted (forum reports)
      '_TZ3000_996rpfy6',  // v5.5.908: blutch32 forum - TS0203 always "no" fix
      '_TZE200_pay2byax',  // v5.12.2: ZG-102ZL reversed
    ].some(id => mfr.toLowerCase().includes(id.toLowerCase()));
    // v5.12.3: XOR  default inversion + user invert cancel each other out
    this._invertedByDefault = invertedByDefault;
    if (invertedByDefault) {
      this._invertContact = !(userInvert || userReverse);
      this._userExplicitInvert = false;
      this.log(`[CONTACT] Sensor ${mfr} invertedByDefault=true userInvert=${userInvert} => _invertContact=${this._invertContact}`);
    }

    if (this._isProblematicSensor) {
      this.log(`[CONTACT]  Problematic sensor detected (${mfr}) - extended debounce enabled`);
      this._debounceMs = Math.max(this._debounceMs, DEBOUNCE.PROBLEMATIC_MIN_MS);
    }

    // Parent handles EVERYTHING: Tuya DP, ZCL, IAS Zone, battery
    await super.onNodeInit({ zclNode });
    this._registerCapabilityListeners(); // rule-12a injected

    await setupSonoffSensor(this, zclNode);
    this.log('[CONTACT] v5.11.106 - DPs: 1,2,3,4,5,15,101 | ZCL: IAS,PWR,EF00 | SONOFF: tamper');
    this.log(`[CONTACT]  Ready (debounce: ${this._debounceMs}ms, invert: ${this._invertContact}, problematic: ${this._isProblematicSensor})`);
  }

  /**
   * v5.5.344: Handle settings changes
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    // v5.8.98: Handle both invert_contact and reverse_alarm (were separate, now unified)
    if (changedKeys.includes('invert_contact') || changedKeys.includes('reverse_alarm')) {
      const inv = changedKeys.includes('invert_contact') ? newSettings.invert_contact : (this.getSetting('invert_contact') || false);
      const rev = changedKeys.includes('reverse_alarm') ? newSettings.reverse_alarm : (this.getSetting('reverse_alarm') || false);
      if (this._invertedByDefault) {
        this._invertContact = !(inv || rev);
        this._userExplicitInvert = false;
      } else {
        this._invertContact = inv || rev;
        this._userExplicitInvert = this._invertContact;
      }
      this.log(`[CONTACT] Invert setting changed to: ${this._invertContact} (invert=${inv}, reverse=${rev})`);
      // Toggle current displayed state  use super to bypass invert override
      const current = this.getCapabilityValue('alarm_contact');
      if (current !== null) {
        const newValue = !current;
        await super.setCapabilityValue('alarm_contact', newValue).catch(() => { });
        // v5.11.16: CRITICAL FIX (Lasse_K #1401-1403/#1426 "stops responding")
        // Reset confirmedValue to match new capability state, otherwise the
        // setCapabilityValue override's duplicate filter blocks next IAS event
        if (this._contactState) {
          if (this._invertedByDefault) {
            // v5.12.4: For invertedByDefault devices, clear confirmedValue so next DP
            // event always passes duplicate filter  avoids stuck state when user
            // toggles invert (XOR cancels default, raw values become wrong)
            this._contactState.confirmedValue = null;
            this._contactState.lastValue = null;
          } else {
            this._contactState.confirmedValue = newValue;
            this._contactState.lastValue = newValue;
            this._contactState.lastChangeTime = Date.now();
          }
        }
      }
    }
    if (super.onSettings) {
      await super.onSettings({ oldSettings, newSettings, changedKeys }).catch(e => this.error('[CONTACT] super.onSettings error:', e.message));
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
      // v5.11.5: For IAS events, UnifiedSensorBase already applied correct inversion
      // (manufacturer defaults XOR user settings including reverse_alarm)
      // Only apply device-level inversion for non-IAS events (Tuya DP)
      const isIAS = this._iasOriginatedAlarm;
      this._iasOriginatedAlarm = false; // Reset flag

      const shouldInvert = isIAS ? false : (this._userExplicitInvert || this._invertContact);
      let finalValue = shouldInvert ? !value : value;

      const now = Date.now();
      const state = this._contactState || { lastValue: null, lastChangeTime: 0, timer: null };

      // If same value as last confirmed, just update timestamp and skip
      if (state.confirmedValue === finalValue) {
        state.lastIASTime = now;
        state.iasMessageCount++;

        // Log keep-alive detection (but not spam)
        if (state.iasMessageCount % 10 === 1) {
          this.log(`[CONTACT]  Keep-alive detected (count: ${state.iasMessageCount}, value unchanged: ${finalValue})`);
        }
        return; // Don't re-apply same value
      }

      // New value detected - check if it's within debounce window
      const timeSinceLastChange = now - state.lastChangeTime;

      if (state.lastValue !== null && timeSinceLastChange < this._debounceMs) {
        // Rapid change detected - could be noise or real
        this.log(`[CONTACT]  Rapid change ${state.lastValue}  ${finalValue} (${timeSinceLastChange}ms) - debouncing`);

        // Clear existing timer
        if (state.timer) {
          this.homey.clearTimeout(state.timer);
        }

        // Set timer to apply after debounce window
        state.timer = this.homey.setTimeout(async () => {
          this.log(`[CONTACT]  Debounce complete - applying: ${finalValue}`);
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
          // v5.5.793: Use constants for keep-alive window
          const keepAliveWindow = timeSinceLastChange >= DEBOUNCE.KEEP_ALIVE_MIN_MS && timeSinceLastChange <= DEBOUNCE.KEEP_ALIVE_MAX_MS;

          if (keepAliveWindow) {
            this.log(`[CONTACT]  BLOCKED: Likely 1-hour keep-alive false "closed" (${Math.round(timeSinceLastChange / 60000)}min since open)`);
            return; // Ignore this false state change completely
          }

          this.log('[CONTACT]  Problematic sensor: openclosed change - applying extended debounce');

          if (state.timer) {
            this.homey.clearTimeout(state.timer);
          }

          // Double debounce for problematic openclosed transitions
          state.timer = this.homey.setTimeout(async () => {
            this.log(`[CONTACT]  Extended debounce complete - applying: ${finalValue}`);
            state.lastValue = finalValue;
            state.confirmedValue = finalValue;
            state.lastChangeTime = Date.now();
            state.iasMessageCount = 0;
            await super.setCapabilityValue(capability, finalValue).catch(() => { });
          },safeMultiply(this._debounceMs, 2));

          return;
        }
      }

      // Normal state change - apply immediately
      this.log(`[CONTACT]  State change: ${state.confirmedValue}  ${finalValue}`);
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
   * v5.5.793: Override setCapabilityValue for battery throttling
   */
  async _handleBatteryUpdate(value) {
    const now = Date.now();
    if (this._lastBatteryReportTime && (now - this._lastBatteryReportTime) < BATTERY_THROTTLE_MS) {
      return; // Skip - too soon since last report
    }
    this._lastBatteryReportTime = now;
    
    const battery = Math.max(VALIDATION.BATTERY_MIN, Math.min(VALIDATION.BATTERY_MAX, value));
    this.log(`[CONTACT]  Battery: ${battery}%`);
    await super.setCapabilityValue('measure_battery', parseFloat(battery)).catch(() => { });
  }

  /**
   * v5.5.344: Cleanup on uninit
   * v5.5.793: Enhanced cleanup
   */
  async onUninit() {
    this.log('[CONTACT] onUninit - cleaning up...');
    if (this._contactState?.timer) {
      this.homey.clearTimeout(this._contactState.timer);
      this._contactState.timer = null;
    }
    if (super.onUninit) {
      await super.onUninit();
    }
    this.log('[CONTACT]  Cleanup complete' );
  }

  /**
   * v5.5.793: Cleanup on device delete
   */
  async onDeleted() {
    if (this._contactState?.timer) {
      this.homey.clearTimeout(this._contactState.timer );
      this._contactState.timer = null;
    }
    await super.onDeleted?.();
  }

  /**
   * v7.4.6: Refresh state when device announces itself (rejoin/wakeup)
   */
  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself, refreshing state...');
    if (typeof this._updateLastSeen === 'function') this._updateLastSeen();
    // Proactive data recovery if supported
    if (this._dataRecoveryManager) {
       this._dataRecoveryManager.triggerRecovery();
    }
  }
}

module.exports = ContactSensorDevice;

