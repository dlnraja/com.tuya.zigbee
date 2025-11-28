'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Philips Hue Motion Sensor
 */
class PhilipsHueMotionDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Philips Hue Motion Sensor initializing...');

    const endpoint = zclNode.endpoints[2] || zclNode.endpoints[1];

    // Motion detection
    if (endpoint?.clusters?.occupancySensing) {
      endpoint.clusters.occupancySensing.on('attr.occupancy', (value) => {
        const motion = (value & 0x01) === 1;
        this.log(`[HUE] Motion: ${motion}`);
        this.setCapabilityValue('alarm_motion', motion).catch(this.error);
      });
    }

    // Illuminance
    if (this.hasCapability('measure_luminance') && endpoint?.clusters?.illuminanceMeasurement) {
      endpoint.clusters.illuminanceMeasurement.on('attr.measuredValue', (value) => {
        const lux = value > 0 ? Math.pow(10, (value - 1) / 10000) : 0;
        this.log(`[HUE] Illuminance: ${Math.round(lux)} lux`);
        this.setCapabilityValue('measure_luminance', Math.round(lux)).catch(this.error);
      });
    }

    // Temperature
    if (this.hasCapability('measure_temperature') && endpoint?.clusters?.temperatureMeasurement) {
      endpoint.clusters.temperatureMeasurement.on('attr.measuredValue', (value) => {
        const temp = value / 100;
        this.log(`[HUE] Temperature: ${temp}°C`);
        this.setCapabilityValue('measure_temperature', temp).catch(this.error);
      });
    }

    // Battery
    if (endpoint?.clusters?.genPowerCfg) {
      this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        reportParser: value => Math.round(value / 2)
      });
    }

    this.log('Philips Hue Motion Sensor initialized');
  }
}

module.exports = PhilipsHueMotionDevice;
