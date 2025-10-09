'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class MotionTempHumidityIlluminationSensorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('motion_temp_humidity_illumination_sensor device initialized');

    // Call parent
    await super.onNodeInit({ zclNode });

    // Motion/vibration alarm (IAS Zone)
    if (this.hasCapability('alarm_motion')) {
      this.registerCapability('alarm_motion', 'iasZone', {
        report: 'zoneStatus',
        reportParser: value => (value & 1) === 1
      });
      this.log('✅ Motion alarm capability registered');
    }

    // Battery measurement
    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', 'genPowerCfg', {
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        reportParser: value => Math.max(0, Math.min(100, value / 2)),
        getParser: value => Math.max(0, Math.min(100, value / 2))
      });
      this.log('✅ Battery capability registered');
    }

    // Illuminance measurement
    if (this.hasCapability('measure_luminance')) {
      this.registerCapability('measure_luminance', 'msIlluminanceMeasurement', {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => Math.pow(10, (value - 1) / 10000),
        getParser: value => Math.pow(10, (value - 1) / 10000)
      });
      this.log('✅ Luminance capability registered');
    }

    // Temperature measurement
    if (this.hasCapability('measure_temperature')) {
      this.registerCapability('measure_temperature', 'msTemperatureMeasurement', {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => value / 100,
        getParser: value => value / 100
      });
      this.log('✅ Temperature capability registered');
    }

    // Humidity measurement
    if (this.hasCapability('measure_humidity')) {
      this.registerCapability('measure_humidity', 'msRelativeHumidity', {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => value / 100,
        getParser: value => value / 100
      });
      this.log('✅ Humidity capability registered');
    }

    // Configure attribute reporting
    try {
      await this.configureAttributeReporting([
        {
          endpointId: 1,
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 0,
          maxInterval: 3600,
          minChange: 1
        }
      ]);
    } catch (error) {
      this.error('Failed to configure reporting:', error);
    }

    // Mark device as available
    await this.setAvailable();
  }

  async onDeleted() {
    this.log('motion_temp_humidity_illumination_sensor device deleted');
  }

}

module.exports = MotionTempHumidityIlluminationSensorDevice;
