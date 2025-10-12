'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Motion Sensor with Illuminance (Battery)
 * 
 * Category: Motion & Presence
 * Priority: 2
 * 
 * Capabilities: alarm_motion, measure_luminance, measure_battery
 */
class MotionSensorIlluminanceBatteryDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('motion_sensor_illuminance_battery initialized');
    this.log('Manufacturer:', this.getData().manufacturerName);
    this.log('Model:', this.getData().productId);

    // Call parent
    await super.onNodeInit({ zclNode });

    // Register capabilities
    await this.registerCapabilities();

    // Mark as available
    await this.setAvailable();
  }

  /**
   * Register all device capabilities
   */
  async registerCapabilities() {

    // alarm_motion capability
    if (this.hasCapability('alarm_motion')) {
      try {
        this.registerCapability('alarm_motion', CLUSTER.OCCUPANCY_SENSING, {
          get: 'occupancy',
          report: 'occupancy',
          reportParser: value => value === 1
        });
        this.log('✅ alarm_motion capability registered');
      } catch (err) {
        this.error('alarm_motion capability failed:', err.message);
      }
    }

    // measure_luminance capability
    if (this.hasCapability('measure_luminance')) {
      try {
        this.registerCapability('measure_luminance', CLUSTER.ILLUMINANCE_MEASUREMENT, {
          get: 'measuredValue',
          report: 'measuredValue',
          reportParser: value => Math.pow(10, (value - 1) / 10000)
        });
        this.log('✅ measure_luminance capability registered');
      } catch (err) {
        this.error('measure_luminance capability failed:', err.message);
      }
    }

    // measure_battery capability
    if (this.hasCapability('measure_battery')) {
      try {
        this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
          get: 'batteryPercentageRemaining',
          report: 'batteryPercentageRemaining',
          reportParser: value => value / 2
        });
        this.log('✅ measure_battery capability registered');
      } catch (err) {
        this.error('measure_battery capability failed:', err.message);
      }
    }
  }

  /**
   * Handle device deletion
   */
  async onDeleted() {
    this.log('motion_sensor_illuminance_battery deleted');
  }

}

module.exports = MotionSensorIlluminanceBatteryDevice;
