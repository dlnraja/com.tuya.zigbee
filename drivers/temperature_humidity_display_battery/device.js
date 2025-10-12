'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Temperature Humidity Display (Battery)
 * 
 * Category: Climate Control
 * Priority: 3
 * 
 * Capabilities: measure_temperature, measure_humidity, measure_battery
 */
class TemperatureHumidityDisplayBatteryDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('temperature_humidity_display_battery initialized');
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

    // measure_temperature capability
    if (this.hasCapability('measure_temperature')) {
      try {
        this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT, {
          get: 'measuredValue',
          report: 'measuredValue',
          reportParser: value => value / 100
        });
        this.log('✅ measure_temperature capability registered');
      } catch (err) {
        this.error('measure_temperature capability failed:', err.message);
      }
    }

    // measure_humidity capability
    if (this.hasCapability('measure_humidity')) {
      try {
        this.registerCapability('measure_humidity', CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT, {
          get: 'measuredValue',
          report: 'measuredValue',
          reportParser: value => value / 100
        });
        this.log('✅ measure_humidity capability registered');
      } catch (err) {
        this.error('measure_humidity capability failed:', err.message);
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
    this.log('temperature_humidity_display_battery deleted');
  }

}

module.exports = TemperatureHumidityDisplayBatteryDevice;
