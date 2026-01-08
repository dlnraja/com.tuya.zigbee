'use strict';
const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      SMOKE DETECTOR ADVANCED - v5.5.401 PAIRING FIX                         ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
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
   * v5.5.130: ENRICHED dpMappings from Zigbee2MQTT TS0601_smoke_5
   */
  get dpMappings() {
    return {
      // ═══════════════════════════════════════════════════════════════════
      // SMOKE ALARM (DP 1)
      // ═══════════════════════════════════════════════════════════════════
      1: { capability: 'alarm_smoke', transform: (v) => v === 1 || v === true || v === 'alarm' },

      // ═══════════════════════════════════════════════════════════════════
      // ENVIRONMENTAL (DP 2, 3)
      // ═══════════════════════════════════════════════════════════════════
      2: { capability: 'measure_temperature', divisor: 10 },
      3: { capability: 'measure_humidity', divisor: 1 },

      // ═══════════════════════════════════════════════════════════════════
      // BATTERY (DP 4, 15)
      // ═══════════════════════════════════════════════════════════════════
      4: { capability: 'measure_battery', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 },

      // ═══════════════════════════════════════════════════════════════════
      // TAMPER (DP 14) + FAULT ALARM (DP 11)
      // ═══════════════════════════════════════════════════════════════════
      14: { capability: 'alarm_tamper', transform: (v) => v === 1 || v === true },
      11: { capability: null, internal: 'fault_alarm' }, // Device fault indicator

      // ═══════════════════════════════════════════════════════════════════
      // v5.5.130: CONTROL FEATURES from Zigbee2MQTT
      // ═══════════════════════════════════════════════════════════════════
      // Silence the alarm (writable)
      16: { capability: null, setting: 'silence', writable: true },
      // Enable/disable alarm
      13: { capability: null, setting: 'alarm_enable', writable: true },
      // Self-test trigger
      8: { capability: null, setting: 'self_test', writable: true },
      // Alarm sound level
      5: { capability: null, setting: 'alarm_volume' },
      // Smoke concentration (PPM)
      9: { capability: null, internal: 'smoke_concentration' },
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[SMOKE-ADV] ✅ Ready');
    this.log('[SMOKE-ADV] DP Mappings: smoke(1), temp(2), humidity(3), battery(4,15), tamper(14)');
    // v5.5.292: Flow triggers now handled by HybridSensorBase._triggerCustomFlowsIfNeeded()
  }
}
module.exports = SmokeDetectorAdvancedDevice;
