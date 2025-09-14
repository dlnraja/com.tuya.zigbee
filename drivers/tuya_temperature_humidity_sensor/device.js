'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * Tuya Temperature & Humidity Sensor Device
 * Supports environmental monitoring with battery status
 * Compatible with TS0201, TS0601, _TZE200_cwbvmsar and similar devices
 */
class TuyaTemperatureHumiditySensorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    try {
      // Enable debugging for development
      this.enableDebug();
      this.printNode();
      
      this.log('Initializing Tuya Temperature & Humidity Sensor...');

      // Register temperature capability with optimized reporting
      if (this.hasCapability('measure_temperature')) {
        await this.registerCapability('measure_temperature', 'msTemperatureMeasurement', {
          reportOpts: {
            configureAttributeReporting: {
              minInterval: 60,    // 1 minute minimum
              maxInterval: 1800,  // 30 minutes maximum
              minChange: 50,      // 0.5°C change threshold
            },
          },
        });
        this.log('Temperature measurement capability registered');
      }

      // Register humidity capability with optimized reporting  
      if (this.hasCapability('measure_humidity')) {
        await this.registerCapability('measure_humidity', 'msRelativeHumidity', {
          reportOpts: {
            configureAttributeReporting: {
              minInterval: 60,    // 1 minute minimum
              maxInterval: 1800,  // 30 minutes maximum
              minChange: 200,     // 2% humidity change
            },
          },
        });
        this.log('Humidity measurement capability registered');
      }

      // Register battery capability with efficient reporting
      if (this.hasCapability('measure_battery')) {
        await this.registerCapability('measure_battery', 'genPowerCfg', {
          reportOpts: {
            configureAttributeReporting: {
              minInterval: 3600,  // 1 hour minimum
              maxInterval: 43200, // 12 hours maximum
              minChange: 5,       // 5% battery change
            },
          },
        });
        this.log('Battery monitoring capability registered');
      }

      // Add environmental change listeners for flow triggers
      this.registerCapabilityListener('measure_temperature', (value) => {
        this.log('Temperature changed:', value, '°C');
        this.homey.flow.getDeviceTriggerCard('temperature_changed').trigger(this, { temperature: value });
      });

      this.registerCapabilityListener('measure_humidity', (value) => {
        this.log('Humidity changed:', value, '%');
        this.homey.flow.getDeviceTriggerCard('humidity_changed').trigger(this, { humidity: value });
      });

      this.log('Tuya Temperature & Humidity Sensor successfully initialized');
    } catch (error) {
      this.error('Failed to initialize Temperature & Humidity Sensor:', error);
      throw error;
    }
  }

  /**
   * Handle device removal cleanup
   */
  async onDeleted() {
    try {
      this.log('Tuya Temperature & Humidity Sensor removed from Homey');
    } catch (error) {
      this.error('Error during device removal:', error);
    }
  }

}

module.exports = TuyaTemperatureHumiditySensorDevice;
