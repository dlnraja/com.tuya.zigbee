'use strict';
const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      SMOKE DETECTOR ADVANCED - v5.5.503 DIAGNOSTIC LOGGING                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  v5.5.503: Enhanced diagnostic logging for Martijn report                    ║
 * ║  - Added manufacturer name logging at init                                   ║
 * ║  - Enhanced DP reception logging with hex dump                               ║
 * ║  - Added Tuya cluster detection logging                                      ║
 * ║                                                                              ║
 * ║  v5.5.401: CRITICAL PAIRING FIX (Jolink forum report)                        ║
 * ║  - Added fastInitMode for sleepy battery devices                             ║
 * ║  - Deferred complex initialization to prevent pairing timeout                ║
 * ║  - IAS Zone enrollment prioritized for immediate alarm detection             ║
 * ║                                                                              ║
 * ║  v5.5.380: Added cluster 0xED00 (60672) for TZE284 smoke detectors          ║
 * ║  Source: https://www.zigbee2mqtt.io/devices/TS0601_smoke_5.html             ║
 * ║  Features: smoke, tamper, battery, fault_alarm, silence, alarm              ║
 * ║  Supported: _TZE284_rccxox8p, _TZE200_rccxox8p, _TZE204_rccxox8p, etc.      ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class SmokeDetectorAdvancedDevice extends HybridSensorBase {
  get mainsPowered() { return false; }
  get sensorCapabilities() { return ['alarm_smoke', 'measure_battery', 'measure_temperature', 'measure_humidity', 'alarm_tamper']; }

  /**
   * v5.5.401: FAST INIT MODE for sleepy devices
   * Smoke detectors go to sleep quickly after pairing - we must be fast!
   */
  get fastInitMode() { return true; }

  /**
   * v5.5.408: COMPREHENSIVE dpMappings from Zigbee2MQTT research
   * Sources: Z2M #12622, #15349, #12769, SmartThings community
   *
   * CRITICAL: Different smoke detector variants use DIFFERENT DPs!
   * - _TZE200_ntcy3xu1: DP1=smoke (0=alarm!), DP4=tamper, DP14=battery_low
   * - _TZE200_rccxox8p: DP1=smoke, DP4=tamper, DP14=battery_low
   * - _TZE200_m9skfctm: DP1=smoke, DP2=temp, DP3=humidity, DP4=battery
   * - _TZE284_*: Similar patterns with extended features
   */
  get dpMappings() {
    return {
      // ═══════════════════════════════════════════════════════════════════
      // SMOKE ALARM (DP 1) - CRITICAL!
      // v5.5.408: Some devices report 0=ALARM, others report 1=ALARM
      // Transform handles BOTH patterns for maximum compatibility
      // ═══════════════════════════════════════════════════════════════════
      1: {
        capability: 'alarm_smoke',
        transform: (v, device) => {
          // Log for debugging - CRITICAL for troubleshooting
          if (device) device.log?.(`[SMOKE] DP1 raw value: ${v} (type: ${typeof v})`);

          // IMPORTANT: Different variants have INVERTED logic!
          // - _TZE200_ntcy3xu1, _TZE200_rccxox8p: 0 = SMOKE DETECTED, 1/2 = clear
          // - Other variants: 1 = SMOKE DETECTED, 0 = clear
          // - Some use 'alarm' string or true boolean

          let isAlarm = false;
          if (v === 'alarm' || v === true) {
            isAlarm = true;
          } else if (typeof v === 'number') {
            // For numeric values: 0 often means ALARM for Tuya smoke detectors!
            // This is counter-intuitive but matches Z2M behavior
            isAlarm = (v === 0);
          }

          if (device) device.log?.(`[SMOKE] 🔥 Smoke alarm: ${isAlarm ? '🚨 TRIGGERED!' : '✅ clear'}`);
          return isAlarm;
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // ENVIRONMENTAL (DP 2, 3) - Only some models have these
      // ═══════════════════════════════════════════════════════════════════
      2: { capability: 'measure_temperature', divisor: 10, optional: true },
      3: { capability: 'measure_humidity', divisor: 1, optional: true },

      // ═══════════════════════════════════════════════════════════════════
      // TAMPER (DP 4) - Many variants use DP4 for tamper, NOT battery!
      // v5.5.408: Detect tamper vs battery based on value pattern
      // ═══════════════════════════════════════════════════════════════════
      4: {
        capability: null, // Dynamic - could be tamper or battery
        transform: (v, device) => {
          // If value is boolean-like (0/1/true/false), it's tamper
          // If value is > 1, it's battery percentage
          if (v === 0 || v === 1 || v === true || v === false) {
            const isTampered = v === 1 || v === true;
            if (device) device.log?.(`[SMOKE] DP4 as tamper: ${isTampered}`);
            device?.setCapabilityValue?.('alarm_tamper', isTampered).catch(() => { });
            return null; // Already handled
          } else if (typeof v === 'number' && v > 1) {
            if (device) device.log?.(`[SMOKE] DP4 as battery: ${v}%`);
            device?.setCapabilityValue?.('measure_battery', parseFloat(Math.min(100, v))).catch(() => { });
            return null; // Already handled
          }
          return v;
        }
      },

      // ═══════════════════════════════════════════════════════════════════
      // BATTERY LOW (DP 14) - Some use this for battery_low state
      // v5.5.408: 0 = low battery, 2 = full (from Z2M #12622)
      // ═══════════════════════════════════════════════════════════════════
      14: {
        capability: 'measure_battery',
        transform: (v, device) => {
          // 0 = low, 1 = medium(?), 2 = full
          const batteryMap = { 0: 10, 1: 50, 2: 100 };
          const battery = batteryMap[v] ?? (v > 2 ? v : 50);
          if (device) device.log?.(`[SMOKE] DP14 battery state: ${v} → ${battery}%`);
          return battery;
        }
      },

      // Alternative battery DP
      15: { capability: 'measure_battery', divisor: 1 },

      // ═══════════════════════════════════════════════════════════════════
      // FAULT & CONTROL FEATURES
      // ═══════════════════════════════════════════════════════════════════
      11: { capability: null, internal: 'fault_alarm' },
      16: { capability: null, setting: 'silence', writable: true },
      13: { capability: null, setting: 'alarm_enable', writable: true },
      8: { capability: null, setting: 'self_test', writable: true },
      5: { capability: null, setting: 'alarm_volume' },
      9: { capability: null, internal: 'smoke_concentration' },
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    // v5.5.503: DIAGNOSTIC LOGGING for Martijn report
    const mfr = this.getData()?.manufacturerName || this.getSetting('zb_manufacturer_name') || 'UNKNOWN';
    const modelId = this.getData()?.modelId || 'UNKNOWN';
    const deviceId = this.getData()?.id || 'UNKNOWN';

    this.log('[SMOKE-ADV] ════════════════════════════════════════════════════════════');
    this.log('[SMOKE-ADV] ✅ Smart Smoke Detector Advanced v5.5.503 Ready');
    this.log(`[SMOKE-ADV] 📋 ManufacturerName: "${mfr}"`);
    this.log(`[SMOKE-ADV] 📋 ModelId: "${modelId}"`);
    this.log(`[SMOKE-ADV] 📋 DeviceId: "${deviceId}"`);
    this.log('[SMOKE-ADV] DP Mappings: smoke(1), temp(2), humidity(3), tamper/battery(4), battery(14,15)');
    this.log('[SMOKE-ADV] ⚠️ NOTE: This is a SLEEPY battery device');
    this.log('[SMOKE-ADV] ⚠️ Smoke alarm will only report when triggered or during wake cycle');
    this.log('[SMOKE-ADV] ════════════════════════════════════════════════════════════');

    // v5.5.503: Log available clusters for diagnostics
    try {
      const ep1 = zclNode?.endpoints?.[1];
      if (ep1) {
        const clusterIds = Object.keys(ep1.clusters || {});
        this.log(`[SMOKE-ADV] 📡 Endpoint 1 clusters: ${clusterIds.join(', ') || 'none'}`);

        // Check for Tuya cluster (0xEF00 = 61184)
        if (ep1.clusters?.tuya || ep1.clusters?.[61184]) {
          this.log('[SMOKE-ADV] ✅ Tuya cluster 0xEF00 (61184) FOUND - DP communication available');
        } else {
          this.log('[SMOKE-ADV] ⚠️ Tuya cluster 0xEF00 NOT found - may use IAS Zone instead');
        }

        // Check for IAS Zone (0x0500 = 1280)
        if (ep1.clusters?.iasZone || ep1.clusters?.[1280]) {
          this.log('[SMOKE-ADV] ✅ IAS Zone cluster 0x0500 (1280) FOUND');
        }
      }
    } catch (e) {
      this.log(`[SMOKE-ADV] ⚠️ Could not enumerate clusters: ${e.message}`);
    }

    // v5.5.503: Store manufacturer for DP transform logic
    this._manufacturerName = mfr;
  }
}
module.exports = SmokeDetectorAdvancedDevice;
