'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');

/**
 * MotionSensorDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class MotionSensorDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    this.log('MotionSensorDevice initializing...');

    // Initialize base (auto power detection + dynamic capabilities)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));

    // Setup IAS Zone (SDK3 - based on Peter's success patterns)
    await this.setupIASZone();

    this.log('MotionSensorDevice initialized - Power source:', this.powerSource || 'unknown');
  }


  /**
   * Setup IAS Zone for Motion detection (SDK3 Compliant)
   *
   * Based on Peter's successful diagnostic patterns:
   * - Temperature/Humidity/Lux work via standard clusters [OK]
   * - IAS Zone requires special SDK3 enrollment method
   *
   * Cluster 1280 (IASZone) - Motion/Alarm detection
   */
  /**
   * Setup IAS Zone (SDK3 - Based on IASZoneEnroller_SIMPLE_v4.0.6.js)
   * Version la plus récente du projet (2025-10-21)
   */
  async setupIASZone() {
    this.log('🔐 Setting up IAS Zone (SDK3 latest method)...');

    const endpoint = this.zclNode.endpoints[1];

    if (!endpoint?.clusters?.iasZone) {
      this.log('[INFO]  IAS Zone cluster not available');
      return;
    }

    try {
      // Step 1: Setup Zone Enroll Request listener (SYNCHRONOUS - property assignment)
      // SDK3: Use property assignment, NOT .on() event listener
      endpoint.clusters.iasZone.onZoneEnrollRequest = async () => {
        this.log('[MSG] Zone Enroll Request received');

        try {
          // Send response IMMEDIATELY (synchronous, no async, no delay)
          await endpoint.clusters.iasZone.zoneEnrollResponse({
            enrollResponseCode: 0, // 0 = Success
            zoneId: 10
          });

          this.log('[OK] Zone Enroll Response sent (zoneId: 10)');
        } catch (err) {
          this.error('Failed to send Zone Enroll Response:', err.message);
        }
      };

      this.log('[OK] Zone Enroll Request listener configured');

      // Step 2: Send proactive Zone Enroll Response (SDK3 official method)
      // Per Homey docs: "driver could send Zone Enroll Response when initializing
      // regardless of having received Zone Enroll Request"
      this.log('[SEND] Sending proactive Zone Enroll Response...');

      try {
        await endpoint.clusters.iasZone.zoneEnrollResponse({
          enrollResponseCode: 0,
          zoneId: 10
        });

        this.log('[OK] Proactive Zone Enroll Response sent');
      } catch (err) {
        this.log('[WARN]  Proactive response failed (normal if device not ready):', err.message);
      }

      // Step 3: Setup Zone Status Change listener (property assignment)
      // SDK3: Use .onZoneStatusChangeNotification property, NOT .on() event
      endpoint.clusters.iasZone.onZoneStatusChangeNotification = async (payload) => {
        this.log('[IAS] 🚨 Zone notification received:', payload);

        if (payload && payload.zoneStatus !== undefined) {
          // v5.2.66: Fix Bitmap parsing - check alarm1 property directly
          const status = payload.zoneStatus;
          let motionDetected = false;

          // Method 1: Direct property access (zigbee-clusters Bitmap)
          if (typeof status === 'object' && status !== null) {
            // Check alarm1 property directly on Bitmap object
            motionDetected = status.alarm1 === true || status['alarm1'] === true;
            // Fallback: check bits property if available
            if (!motionDetected && typeof status.bits === 'number') {
              motionDetected = (status.bits & 0x01) !== 0;
            }
            this.log('[IAS] Bitmap alarm1:', status.alarm1, 'bits:', status.bits);
          } else if (typeof status === 'number') {
            // Method 2: Already a number
            motionDetected = (status & 0x01) !== 0;
            this.log('[IAS] Numeric status:', status);
          }

          this.log('[IAS] Motion detected:', motionDetected);
          const previousState = this.getCapabilityValue('alarm_motion');

          // Update capability
          try {
            await this.setCapabilityValue('alarm_motion', motionDetected);
            this.log(`[IAS] ✅ alarm_motion = ${motionDetected}`);

            // Trigger flow cards on state change
            if (motionDetected !== previousState) {
              try {
                if (motionDetected) {
                  const trigger = this.homey.flow.getDeviceTriggerCard('motion_sensor_motion_detected');
                  if (trigger) {
                    await trigger.trigger(this, {});
                    this.log('[FLOW] ✅ Triggered: motion_sensor_motion_detected');
                  }
                } else {
                  const trigger = this.homey.flow.getDeviceTriggerCard('motion_sensor_motion_cleared');
                  if (trigger) {
                    await trigger.trigger(this, {});
                    this.log('[FLOW] ✅ Triggered: motion_sensor_motion_cleared');
                  }
                }
              } catch (flowErr) {
                this.log('[FLOW] Flow trigger failed:', flowErr.message);
              }
            }
          } catch (err) {
            this.error('[IAS] ❌ Failed to set alarm_motion:', err.message);
          }

          this.log(`[IAS] ${motionDetected ? '🚶 MOTION DETECTED!' : '✅ Motion cleared'}`);
        }
      };

      this.log('[OK] Zone Status listener configured');

      // Step 4: Setup Zone Status attribute listener (property assignment)
      // Alternative listener for attribute reports
      endpoint.clusters.iasZone.onZoneStatus = async (zoneStatus) => {
        this.log('[IAS] Zone attribute report:', zoneStatus);

        // v5.2.66: Fix Bitmap parsing - same fix as onZoneStatusChangeNotification
        let motionDetected = false;
        if (typeof zoneStatus === 'object' && zoneStatus !== null) {
          motionDetected = zoneStatus.alarm1 === true || zoneStatus['alarm1'] === true;
          if (!motionDetected && typeof zoneStatus.bits === 'number') {
            motionDetected = (zoneStatus.bits & 0x01) !== 0;
          }
        } else if (typeof zoneStatus === 'number') {
          motionDetected = (zoneStatus & 0x01) !== 0;
        }

        try {
          await this.setCapabilityValue('alarm_motion', motionDetected);
          this.log(`[IAS] ✅ alarm_motion = ${motionDetected} (via attribute)`);
        } catch (err) {
          this.error('[IAS] ❌ Failed to set alarm_motion:', err.message);
        }
      };

      this.log('[OK] IAS Zone configured successfully');

    } catch (err) {
      this.error('IAS Zone setup failed:', err);
    }

    // Step 5: Setup Illuminance Measurement listener
    await this.setupIlluminance();
  }

  /**
   * Setup Illuminance Measurement cluster listener
   */
  async setupIlluminance() {
    const endpoint = this.zclNode?.endpoints?.[1];

    if (!endpoint?.clusters?.illuminanceMeasurement) {
      this.log('[LUX] Illuminance cluster not available');
      return;
    }

    try {
      // Listen for illuminance attribute reports
      endpoint.clusters.illuminanceMeasurement.on('attr.measuredValue', async (value) => {
        this.log('[LUX] Illuminance report:', value);

        // Convert to lux (value is in log10(lux) * 10000 format for some devices, or direct lux for others)
        let lux = value;
        if (value > 10000) {
          // Zigbee standard: measuredValue = 10000 * log10(lux) + 1
          lux = Math.round(Math.pow(10, (value - 1) / 10000));
        }

        if (this.hasCapability('measure_luminance')) {
          try {
            await this.setCapabilityValue('measure_luminance', lux);
            this.log(`[LUX] ✅ measure_luminance = ${lux} lux`);

            // Trigger flow
            try {
              const trigger = this.homey.flow.getDeviceTriggerCard('motion_sensor_luminance_changed');
              if (trigger) {
                await trigger.trigger(this, { lux });
              }
            } catch (flowErr) {
              // Ignore flow errors
            }
          } catch (err) {
            this.error('[LUX] ❌ Failed to set measure_luminance:', err.message);
          }
        }
      });

      this.log('[LUX] ✅ Illuminance listener configured');
    } catch (err) {
      this.error('[LUX] Setup failed:', err.message);
    }
  }

  async onDeleted() {
    this.log('MotionSensorDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = MotionSensorDevice;
