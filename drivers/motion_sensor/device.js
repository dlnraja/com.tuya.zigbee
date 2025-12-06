'use strict';

const { HybridSensorBase } = require('../../lib/devices');

/**
 * Motion Sensor Device - v5.3.64 SIMPLIFIED
 * Extends HybridSensorBase for automatic EF00/ZCL handling
 */
class MotionSensorDevice extends HybridSensorBase {

  get mainsPowered() { return false; }

  get sensorCapabilities() {
    return ['alarm_motion', 'measure_battery', 'measure_luminance'];
  }

  get dpMappings() {
    return {
      1: { capability: 'alarm_motion', transform: (v) => v === 1 || v === true },
      2: { capability: 'measure_battery', divisor: 1 },
      3: { capability: 'measure_luminance', divisor: 1 },
      4: { capability: 'measure_battery', divisor: 1 },
      9: { capability: 'measure_luminance', divisor: 1 },  // PIR sensitivity
      12: { capability: 'measure_luminance', divisor: 1 }, // Lux value
      15: { capability: 'measure_battery', divisor: 1 },
      101: { capability: null }, // Sensitivity setting
      102: { capability: null }  // Keep time setting
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    // v5.5.18: Explicit IAS Zone setup for HOBEIAN and other non-Tuya motion sensors
    await this._setupMotionIASZone(zclNode);

    this.log('[MOTION] ✅ Motion sensor ready');
    this.log('[MOTION] Manufacturer:', this.getSetting('zb_manufacturer_name') || 'unknown');
  }

  /**
   * v5.5.18: Setup IAS Zone for motion detection
   * Required for HOBEIAN ZG-204ZM and similar non-Tuya sensors
   */
  async _setupMotionIASZone(zclNode) {
    try {
      const endpoint = zclNode?.endpoints?.[1];
      const iasCluster = endpoint?.clusters?.iasZone || endpoint?.clusters?.ssIasZone;

      if (!iasCluster) {
        this.log('[MOTION-IAS] No IAS Zone cluster');
        return;
      }

      this.log('[MOTION-IAS] IAS Zone cluster found - setting up motion detection');

      // Zone Status Change Notification (motion detected)
      iasCluster.onZoneStatusChangeNotification = (payload) => {
        // v5.5.17: Use universal parser from HybridSensorBase
        const parsed = this._parseIASZoneStatus(payload?.zoneStatus);
        const motion = parsed.alarm1 || parsed.alarm2;

        this.log(`[ZCL-DATA] motion_sensor.ias_zone raw=${parsed.raw} alarm1=${parsed.alarm1} alarm2=${parsed.alarm2} → motion=${motion}`);

        if (this.hasCapability('alarm_motion')) {
          this.setCapabilityValue('alarm_motion', motion).catch(this.error);
        }

        // v5.5.18: Trigger flow card
        if (motion && this.driver?.motionTrigger) {
          this.driver.motionTrigger.trigger(this, {}, {}).catch(this.error);
        }
      };

      // Attribute listener for zone status
      iasCluster.on('attr.zoneStatus', (status) => {
        const motion = (status & 0x01) !== 0 || (status & 0x02) !== 0;
        this.log(`[ZCL-DATA] motion_sensor.zone_status raw=${status} → alarm_motion=${motion}`);

        if (this.hasCapability('alarm_motion')) {
          this.setCapabilityValue('alarm_motion', motion).catch(this.error);
        }
      });

      // Send Zone Enroll Response
      try {
        await iasCluster.zoneEnrollResponse({
          enrollResponseCode: 0,
          zoneId: 23
        });
        this.log('[MOTION-IAS] ✅ Zone Enroll Response sent');
      } catch (e) {
        this.log('[MOTION-IAS] Zone enroll (normal if already enrolled):', e.message);
      }

      this.log('[MOTION-IAS] ✅ Motion detection via IAS Zone configured');
    } catch (err) {
      this.log('[MOTION-IAS] Setup error:', err.message);
    }
  }
}

module.exports = MotionSensorDevice;
