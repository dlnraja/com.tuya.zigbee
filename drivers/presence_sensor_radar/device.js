'use strict';

const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      RADAR/mmWAVE PRESENCE SENSOR - v5.5.250 BATTERY DEVICE FIX             ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  TUYA DP MAPPINGS: 1=presence, 2=sensitivity, 3=near distance, 4=far dist   ║
 * ║  5=detection delay, 6=fading time, 9=illuminance, 101=target distance       ║
 * ║  102=illuminance threshold, 103=motion sensitivity, 104=static sensitivity  ║
 * ║  105=breathe detection, 106=small move detection                            ║
 * ║  ZCL: 0x0400 Illuminance, 0x0406 Occupancy                                  ║
 * ║  Models: _TZE200_*, _TZE204_*, ZY-M100, TS0601 mmWave                       ║
 * ║                                                                              ║
 * ║  v5.5.250: Fix for battery-powered sensors like ZG-204ZM that become        ║
 * ║  unavailable. These are EndDevices that sleep to save battery.              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// Battery-powered presence sensors (EndDevices that sleep)
const BATTERY_POWERED_SENSORS = [
  '_TZE200_2aaelwxk',  // ZG-204ZM battery presence sensor
  '_TZE200_kb5noeto',  // ZG-204ZM variant
  '_TZE204_2aaelwxk',  // ZG-204ZM variant
];

class PresenceSensorRadarDevice extends HybridSensorBase {

  /**
   * v5.5.250: Dynamic power source detection
   * Most radar sensors are mains-powered, but some like ZG-204ZM are battery
   */
  get mainsPowered() {
    const mfr = this.getData()?.manufacturerName || '';
    if (BATTERY_POWERED_SENSORS.includes(mfr)) {
      return false; // Battery-powered EndDevice
    }
    return true; // Default: mains-powered radar
  }

  /**
   * v5.5.250: Dynamic capabilities based on power source
   * Battery sensors need measure_battery capability
   */
  get sensorCapabilities() {
    const base = ['alarm_motion', 'alarm_human', 'measure_luminance', 'measure_distance'];
    if (!this.mainsPowered) {
      base.push('measure_battery');
    }
    return base;
  }

  get dpMappings() {
    return {
      // Presence detected - DP 1 - v5.5.170: Also sets alarm_human
      1: {
        capability: 'alarm_motion',
        transform: (v) => v === 1 || v === true || v === 'presence',
        alsoSets: { 'alarm_human': (v) => v === 1 || v === true || v === 'presence' }
      },

      // Sensitivity - DP 2 (0-10)
      2: { capability: null, internal: 'sensitivity', writable: true },

      // Near detection distance - DP 3 (cm)
      3: { capability: null, internal: 'near_distance', writable: true },

      // Far detection distance - DP 4 (cm)
      4: { capability: null, internal: 'far_distance', writable: true },

      // Detection delay - DP 5 (seconds)
      5: { capability: null, internal: 'detection_delay', writable: true },

      // Fading time - DP 6 (seconds after no motion)
      6: { capability: null, internal: 'fading_time', writable: true },

      // Illuminance - DP 9 (lux)
      9: { capability: 'measure_luminance', divisor: 1, unit: 'lux' },

      // Target distance - DP 101 (cm)
      101: {
        capability: 'measure_distance',
        divisor: 100, // cm to m
        unit: 'm',
        transform: (v) => Math.round(v) / 100
      },

      // Illuminance threshold - DP 102 (lux)
      102: { capability: null, internal: 'illuminance_threshold', writable: true },

      // Motion sensitivity - DP 103
      103: { capability: null, internal: 'motion_sensitivity', writable: true },

      // Static sensitivity - DP 104
      104: { capability: null, internal: 'static_sensitivity', writable: true },

      // Breathe detection - DP 105
      105: { capability: null, internal: 'breathe_detection', writable: true },

      // Small move detection - DP 106
      106: { capability: null, internal: 'small_move_detection', writable: true },

      // Illuminance alt - DP 104 (some models)
      107: { capability: 'measure_luminance', divisor: 1, unit: 'lux' },

      // Presence state alt - DP 112 (some ZY-M100)
      112: { capability: 'alarm_motion', transform: (v) => v === 1 || v === true },

      // v5.5.250: Battery for ZG-204ZM and similar battery sensors
      4: { capability: 'measure_battery', divisor: 1 },  // DP4 = battery %
      15: { capability: 'measure_battery', divisor: 1 }  // DP15 = battery % alt
    };
  }

  async onNodeInit({ zclNode }) {
    const mfr = this.getData()?.manufacturerName || '';
    const isBattery = BATTERY_POWERED_SENSORS.includes(mfr);

    this.log(`[RADAR] v5.5.252 - ${isBattery ? 'BATTERY (sleepy EndDevice)' : 'MAINS'} powered`);
    this.log('[RADAR] DPs: 1-6,9,101-107,112 | ZCL: 400,406,EF00');

    // v5.5.252: For battery sensors, use minimal init to avoid timeouts
    // Battery EndDevices sleep immediately after pairing, so we can't do heavy init
    if (isBattery) {
      this.log('[RADAR] ⚡ Using MINIMAL init for battery sensor (avoid timeouts)');

      // Only do essential setup - NO blocking operations
      this.zclNode = zclNode;

      // Add battery capability
      if (!this.hasCapability('measure_battery')) {
        try {
          await this.addCapability('measure_battery');
          this.log('[RADAR] ✅ Added measure_battery');
        } catch (e) { /* ignore */ }
      }

      // Setup passive listeners only (no queries)
      this._setupPassiveListeners(zclNode);

      // Mark as available - don't wait for data
      await this.setAvailable().catch(() => { });

      this.log('[RADAR] ✅ Battery sensor ready (passive mode)');
      return; // Skip heavy HybridSensorBase init
    }

    // For mains-powered sensors, do full init
    await super.onNodeInit({ zclNode });

    // Setup ZCL clusters
    await this._setupZclClusters(zclNode);

    // Try to add measure_distance capability if not present
    if (!this.hasCapability('measure_distance')) {
      try {
        await this.addCapability('measure_distance');
        this.log('[RADAR] ✅ Added measure_distance capability');
      } catch (e) { /* ignore */ }
    }

    this.log('[RADAR] ✅ Radar presence sensor ready');
  }

  /**
   * v5.5.252: Setup passive listeners for battery sensors
   * These only listen for incoming data, no outgoing queries
   */
  _setupPassiveListeners(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    // Listen for Tuya DP reports (cluster 0xEF00)
    try {
      const tuyaCluster = ep1.clusters?.tuya || ep1.clusters?.[61184];
      if (tuyaCluster?.on) {
        tuyaCluster.on('response', (data) => {
          this.log('[RADAR-BATTERY] Tuya response received');
          this._handleTuyaResponse(data);
        });
        tuyaCluster.on('reporting', (data) => {
          this.log('[RADAR-BATTERY] Tuya reporting received');
          this._handleTuyaResponse(data);
        });
        tuyaCluster.on('datapoint', (data) => {
          this.log('[RADAR-BATTERY] Tuya datapoint received');
          this._handleTuyaResponse(data);
        });
        this.log('[RADAR] ✅ Passive Tuya listener configured');
      }
    } catch (e) { /* ignore */ }

    // Listen for occupancy reports
    try {
      const occCluster = ep1.clusters?.msOccupancySensing;
      if (occCluster?.on) {
        occCluster.on('attr.occupancy', (v) => {
          const occupied = (v & 0x01) !== 0;
          this.log(`[RADAR-BATTERY] Occupancy: ${occupied}`);
          this.setCapabilityValue('alarm_motion', occupied).catch(() => { });
        });
        this.log('[RADAR] ✅ Passive occupancy listener configured');
      }
    } catch (e) { /* ignore */ }
  }

  /**
   * v5.5.252: Handle Tuya response for battery sensors
   */
  _handleTuyaResponse(data) {
    if (!data) return;

    // Mark device as available when we receive data
    this.setAvailable().catch(() => { });

    // Process DPs
    const dpMappings = this.dpMappings;
    const dpId = data.dp || data.dpId || data.datapoint;
    const value = data.value ?? data.data;

    if (dpId && dpMappings[dpId]) {
      const mapping = dpMappings[dpId];
      if (mapping.capability) {
        let finalValue = value;
        if (mapping.transform) {
          finalValue = mapping.transform(value);
        } else if (mapping.divisor) {
          finalValue = value / mapping.divisor;
        }
        this.log(`[RADAR-BATTERY] DP${dpId} → ${mapping.capability} = ${finalValue}`);
        this.setCapabilityValue(mapping.capability, finalValue).catch(() => { });
      }
    }
  }

  async _setupZclClusters(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    // Illuminance cluster (0x0400)
    try {
      const illumCluster = ep1.clusters?.msIlluminanceMeasurement;
      if (illumCluster?.on) {
        illumCluster.on('attr.measuredValue', (v) => {
          const lux = Math.pow(10, (v - 1) / 10000);
          this.setCapabilityValue('measure_luminance', Math.round(lux)).catch(() => { });
        });
        this.log('[RADAR] ✅ Illuminance cluster configured');
      }
    } catch (e) { /* ignore */ }

    // Occupancy cluster (0x0406)
    try {
      const occCluster = ep1.clusters?.msOccupancySensing;
      if (occCluster?.on) {
        occCluster.on('attr.occupancy', (v) => {
          const occupied = (v & 0x01) !== 0;
          this.setCapabilityValue('alarm_motion', occupied).catch(() => { });
        });
        this.log('[RADAR] ✅ Occupancy cluster configured');
      }
    } catch (e) { /* ignore */ }
  }
}

module.exports = PresenceSensorRadarDevice;
