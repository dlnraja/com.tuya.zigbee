'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Zigbee Weather Station - Outdoor Module
 * Alternative to Netatmo Outdoor Module
 */
class WeatherStationOutdoorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Weather Station Outdoor initializing...');

    const endpoint = zclNode.endpoints[1];

    // Temperature
    if (this.hasCapability('measure_temperature') && endpoint?.clusters?.temperatureMeasurement) {
      this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT, {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => {
          const offset = this.getSetting('temperature_offset') || 0;
          return (value / 100) + offset;
        }
      });
    }

    // Humidity
    if (this.hasCapability('measure_humidity') && endpoint?.clusters?.relativeHumidity) {
      this.registerCapability('measure_humidity', CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT, {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => {
          const offset = this.getSetting('humidity_offset') || 0;
          return Math.round(value / 100) + offset;
        }
      });
    }

    // Pressure
    if (this.hasCapability('measure_pressure') && endpoint?.clusters?.pressureMeasurement) {
      this.registerCapability('measure_pressure', CLUSTER.PRESSURE_MEASUREMENT, {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => value
      });
    }

    // Battery
    if (this.hasCapability('measure_battery') && endpoint?.clusters?.genPowerCfg) {
      this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        reportParser: value => Math.round(value / 2)
      });
    }

    // Illuminance
    if (this.hasCapability('measure_luminance') && endpoint?.clusters?.illuminanceMeasurement) {
      this.registerCapability('measure_luminance', CLUSTER.ILLUMINANCE_MEASUREMENT, {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => value > 0 ? Math.round(Math.pow(10, (value - 1) / 10000)) : 0
      });
    }

    this.log('Weather Station Outdoor initialized');
  }
}

module.exports = WeatherStationOutdoorDevice;
