#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class TuyaTemperatureHumiditySensor extends ZigBeeDevice {
  
  // Sensor state
  state = {
    temperature: null,
    humidity: null,
    battery: null,
    batteryLow: false,
    lastUpdate: null,
    temperatureOffset: 0,
    humidityOffset: 0,
    batteryThreshold: 20, // Battery low threshold in %
    minReportInterval: 60, // Minimum report interval in seconds
    maxReportInterval: 3600, // Maximum report interval in seconds
  };

  async onNodeInit({ zclNode }) {
    this.log('Tuya Temperature/Humidity Sensor has been initialized');

    // Register battery capability
    await this.registerBatteryCapability(zclNode);
    
    // Register temperature and humidity capabilities
    await this.registerTemperatureCapability(zclNode);
    await this.registerHumidityCapability(zclNode);
    
    // Enable debugging
    this.enableDebug();
    this.printNode();
  }

  /**
   * Register battery capability and set up reporting
   */
  async registerBatteryCapability(zclNode) {
    // Add battery capability if not already present
    if (this.hasCapability('measure_battery') === false) {
      await this.addCapability('measure_battery').catch(this.error);
    }
    
    if (this.hasCapability('alarm_battery') === false) {
      await this.addCapability('alarm_battery').catch(this.error);
    }

    // Configure battery voltage reporting
    if (zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]) {
      this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
        get: 'batteryPercentageRemaining',
        getOpts: {
          getOnStart: true,
        },
        report: 'batteryPercentageRemaining',
        reportParser: value => {
          // Convert from 0-200 to 0-100%
          const batteryPercentage = Math.min(100, value / 2);
          this.updateBatteryStatus(batteryPercentage);
          return batteryPercentage;
        },
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 0, // No minimum reporting interval
            maxInterval: this.state.maxReportInterval,
            minChange: 5, // Report when battery changes by 5%
          },
        },
      });
    }
  }

  /**
   * Register temperature capability
   */
  async registerTemperatureCapability(zclNode) {
    // Add temperature capability if not already present
    if (this.hasCapability('measure_temperature') === false) {
      await this.addCapability('measure_temperature').catch(this.error);
    }

    // Configure temperature reporting
    if (zclNode.endpoints[1].clusters[CLUSTER.TEMPERATURE_MEASUREMENT.NAME]) {
      this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT, {
        get: 'measuredValue',
        getOpts: {
          getOnStart: true,
        },
        report: 'measuredValue',
        reportParser: value => {
          // Convert from 0.01°C to °C and apply offset
          const temperature = (value / 100) + this.state.temperatureOffset;
          this.state.temperature = temperature;
          this.state.lastUpdate = Date.now();
          this.log(`Temperature updated: ${temperature}°C`);
          return temperature;
        },
        reportOpts: {
          configureAttributeReporting: {
            minInterval: this.state.minReportInterval,
            maxInterval: this.state.maxReportInterval,
            minChange: 10, // 0.1°C
          },
        },
      });
    }
  }

  /**
   * Register humidity capability
   */
  async registerHumidityCapability(zclNode) {
    // Add humidity capability if not already present
    if (this.hasCapability('measure_humidity') === false) {
      await this.addCapability('measure_humidity').catch(this.error);
    }

    // Configure humidity reporting
    if (zclNode.endpoints[1].clusters[CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT.NAME]) {
      this.registerCapability('measure_humidity', CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT, {
        get: 'measuredValue',
        getOpts: {
          getOnStart: true,
        },
        report: 'measuredValue',
        reportParser: value => {
          // Convert from 0.01% to % and apply offset
          const humidity = (value / 100) + this.state.humidityOffset;
          this.state.humidity = Math.min(100, Math.max(0, humidity)); // Clamp between 0-100%
          this.state.lastUpdate = Date.now();
          this.log(`Humidity updated: ${this.state.humidity}%`);
          return this.state.humidity;
        },
        reportOpts: {
          configureAttributeReporting: {
            minInterval: this.state.minReportInterval,
            maxInterval: this.state.maxReportInterval,
            minChange: 10, // 0.1%
          },
        },
      });
    }
  }

  /**
   * Update battery status and trigger low battery alarm if needed
   */
  updateBatteryStatus(batteryPercentage) {
    // Check if battery is low
    const batteryLow = batteryPercentage <= this.state.batteryThreshold;
    
    // Update battery low alarm if state changed
    if (this.state.batteryLow !== batteryLow) {
      this.state.batteryLow = batteryLow;
      this.setCapabilityValue('alarm_battery', batteryLow).catch(this.error);
      
      if (batteryLow) {
        this.log(`Battery low: ${batteryPercentage}%`);
      }
    }
    
    // Update last battery update time
    this.state.lastBatteryUpdate = Date.now();
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Settings changed:', changedKeys);
    
    // Handle temperature offset changes
    if (changedKeys.includes('temperature_offset')) {
      this.state.temperatureOffset = parseFloat(newSettings.temperature_offset) || 0;
      this.log(`Temperature offset updated to: ${this.state.temperatureOffset}°C`);
      
      // Re-apply the offset to the current temperature
      if (this.state.temperature !== null) {
        const currentTemp = this.getCapabilityValue('measure_temperature');
        const newTemp = (currentTemp - (oldSettings.temperature_offset || 0)) + this.state.temperatureOffset;
        this.setCapabilityValue('measure_temperature', newTemp).catch(this.error);
      }
    }
    
    // Handle humidity offset changes
    if (changedKeys.includes('humidity_offset')) {
      this.state.humidityOffset = parseFloat(newSettings.humidity_offset) || 0;
      this.log(`Humidity offset updated to: ${this.state.humidityOffset}%`);
      
      // Re-apply the offset to the current humidity
      if (this.state.humidity !== null) {
        const currentHumidity = this.getCapabilityValue('measure_humidity');
        const newHumidity = (currentHumidity - (oldSettings.humidity_offset || 0)) + this.state.humidityOffset;
        this.setCapabilityValue('measure_humidity', Math.min(100, Math.max(0, newHumidity))).catch(this.error);
      }
    }
    
    // Handle report interval changes
    if (changedKeys.includes('report_interval')) {
      const interval = parseInt(newSettings.report_interval) || 300;
      this.state.maxReportInterval = Math.max(this.state.minReportInterval, interval);
      this.log(`Report interval updated to: ${this.state.maxReportInterval} seconds`);
      
      // TODO: Update report configuration for all clusters
    }
  }

  onDeleted() {
    this.log('Temperature/Humidity sensor removed');
  }
}

module.exports = TuyaTemperatureHumiditySensor;
