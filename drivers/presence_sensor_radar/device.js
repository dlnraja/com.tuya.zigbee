'use strict';

const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      RADAR/mmWAVE PRESENCE SENSOR - v5.5.128 COMPLETE DP ENRICHMENT         ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  TUYA DP MAPPINGS: 1=presence, 2=sensitivity, 3=near distance, 4=far dist   ║
 * ║  5=detection delay, 6=fading time, 9=illuminance, 101=target distance       ║
 * ║  102=illuminance threshold, 103=motion sensitivity, 104=static sensitivity  ║
 * ║  105=breathe detection, 106=small move detection                            ║
 * ║  ZCL: 0x0400 Illuminance, 0x0406 Occupancy                                  ║
 * ║  Models: _TZE200_*, _TZE204_*, ZY-M100, TS0601 mmWave                       ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class PresenceSensorRadarDevice extends HybridSensorBase {

  get mainsPowered() { return true; }

  get sensorCapabilities() {
    return ['alarm_motion', 'alarm_human', 'measure_luminance', 'measure_distance'];
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
      112: { capability: 'alarm_motion', transform: (v) => v === 1 || v === true }
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    this.log('[RADAR] v5.5.128 - DPs: 1-6,9,101-107,112 | ZCL: 400,406,EF00');

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
