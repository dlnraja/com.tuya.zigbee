'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * TuyaZigbeeDevice - Base class for all Tuya Zigbee devices
 * Provides common functionality for Tuya devices
 */
class TuyaZigbeeDevice extends ZigBeeDevice {

  /**
   * onNodeInit is called when the device is initialized
   */
  async onNodeInit() {
    this.log('TuyaZigbeeDevice initialized');
    
    // Enable debug logging if needed
    this.enableDebug();
    
    // Print cluster information
    this.printNode();
  }

  /**
   * onDeleted is called when the user deleted the device
   */
  async onDeleted() {
    this.log('TuyaZigbeeDevice has been deleted');
  }

  /**
   * enableDebug - Enable debug logging for this device
   */
  enableDebug() {
    // Can be overridden in child classes
  }

  /**
   * parseTuyaBatteryValue - Parse Tuya battery value (0-100 or 0-200)
   */
  parseTuyaBatteryValue(value) {
    if (typeof value !== 'number') return null;
    
    // Tuya devices report battery in 0-100 or 0-200 scale
    const percentage = value <= 100 ? value : value / 2;
    return Math.max(0, Math.min(100, Math.round(percentage)));
  }

  /**
   * registerBatteryCapability - Register battery capability with proper reporting
   */
  async registerBatteryCapability(options = {}) {
    const {
      cluster = 'genPowerCfg',
      attribute = 'batteryPercentageRemaining',
      minInterval = 300,
      maxInterval = 3600,
      minChange = 2
    } = options;

    try {
      await this.registerCapability('measure_battery', cluster, {
        get: attribute,
        report: attribute,
        reportOpts: {
          configureAttributeReporting: {
            minInterval,
            maxInterval,
            minChange
          }
        },
        getOpts: {
          getOnStart: true,
          getOnOnline: true
        },
        reportParser: value => {
          return this.parseTuyaBatteryValue(value);
        }
      });
      
      this.log('Battery capability registered successfully');
    } catch (err) {
      this.error('Error registering battery capability:', err);
    }
  }

  /**
   * registerOnOffCapability - Register onOff capability
   */
  async registerOnOffCapability() {
    try {
      await this.registerCapability('onoff', 'genOnOff', {
        getOpts: {
          getOnStart: true,
          getOnOnline: true
        }
      });
      
      this.log('OnOff capability registered successfully');
    } catch (err) {
      this.error('Error registering onoff capability:', err);
    }
  }

  /**
   * registerTemperatureCapability - Register temperature capability
   */
  async registerTemperatureCapability() {
    try {
      await this.registerCapability('measure_temperature', 'msTemperatureMeasurement', {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => value / 100,
        getOpts: {
          getOnStart: true
        }
      });
      
      this.log('Temperature capability registered successfully');
    } catch (err) {
      this.error('Error registering temperature capability:', err);
    }
  }

  /**
   * registerHumidityCapability - Register humidity capability
   */
  async registerHumidityCapability() {
    try {
      await this.registerCapability('measure_humidity', 'msRelativeHumidity', {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => value / 100,
        getOpts: {
          getOnStart: true
        }
      });
      
      this.log('Humidity capability registered successfully');
    } catch (err) {
      this.error('Error registering humidity capability:', err);
    }
  }

  /**
   * registerLuminanceCapability - Register luminance capability with proper LUX conversion
   */
  async registerLuminanceCapability() {
    try {
      await this.registerCapability('measure_luminance', 'msIlluminanceMeasurement', {
        get: 'measuredValue',
        report: 'measuredValue',
        getOpts: {
          getOnStart: true
        },
        reportParser: value => {
          this.log('Luminance raw value:', value);
          // Convert from illuminance to lux
          const lux = value > 0 ? Math.pow(10, (value - 1) / 10000) : 0;
          this.log('Luminance lux:', lux);
          return Math.round(lux);
        }
      });
      
      this.log('Luminance capability registered successfully');
    } catch (err) {
      this.error('Error registering luminance capability:', err);
    }
  }

}

module.exports = TuyaZigbeeDevice;
