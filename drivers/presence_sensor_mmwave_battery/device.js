'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Presence Sensor Mmwave Battery
 * 
 * UNBRANDED Architecture
 * Generated: 2025-10-12
 * Supports: Tuya
 */
class PresenceSensorMmwaveBatteryDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('presence_sensor_mmwave_battery initialized');
    this.log('Device:', this.getData());

    await super.onNodeInit({ zclNode });

    // Register capabilities
    await this.registerCapabilities();

    await this.setAvailable();
  }

  async registerCapabilities() {
    // alarm_motion
    if (this.hasCapability('alarm_motion')) {
      try {
        this.registerCapability('alarm_motion', CLUSTER.OCCUPANCY_SENSING, {
      get: 'occupancy',
      report: 'occupancy',
      reportParser: value => (value & 1) === 1
    });
        this.log('✅ alarm_motion registered');
      } catch (err) {
        this.error('alarm_motion failed:', err);
      }
    }

    // measure_luminance
    if (this.hasCapability('measure_luminance')) {
      try {
        this.registerCapability('measure_luminance', CLUSTER.ILLUMINANCE_MEASUREMENT, {
      get: 'measuredValue',
      report: 'measuredValue',
      reportParser: value => Math.round(Math.pow(10, (value - 1) / 10000))
    });
        this.log('✅ measure_luminance registered');
      } catch (err) {
        this.error('measure_luminance failed:', err);
      }
    }

    // measure_battery
    if (this.hasCapability('measure_battery')) {
      try {
        this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryPercentageRemaining',
      report: 'batteryPercentageRemaining',
      reportParser: value => Math.round(value / 2)
    });
        this.log('✅ measure_battery registered');
      } catch (err) {
        this.error('measure_battery failed:', err);
      }
    }
  }

  async onDeleted() {
    this.log('presence_sensor_mmwave_battery deleted');
  }

}

module.exports = PresenceSensorMmwaveBatteryDevice;
