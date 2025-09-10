#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const { debug } = require('zigbee-clusters');

// Enable debug logging for development
// debug(true);

class TuyaMultiSensor extends ZigBeeDevice {
  
  state = {
    // Motion detection
    motionDetected: false,
    motionTimeout: null,
    motionTimeoutDuration: 60, // seconds
    
    // Temperature and humidity
    temperature: null,
    humidity: null,
    temperatureOffset: 0,
    humidityOffset: 0,
    
    // Contact sensor
    contactState: 'unknown', // 'open', 'closed', 'unknown'
    
    // Water leak
    waterLeak: false,
    
    // Tamper
    tamper: false,
    
    // Battery
    battery: null,
    batteryLow: false,
    batteryThreshold: 20, // %
    
    // Device state
    lastUpdate: null,
    reportInterval: 300, // seconds
    ledEnabled: true,
    sensitivity: 'medium', // 'low', 'medium', 'high'
  };

  async onNodeInit({ zclNode }) {
    this.log('Tuya Multi-Sensor has been initialized');
    
    try {
      // Register all capabilities
      await this.registerMotionCapability(zclNode);
      await this.registerTemperatureCapability(zclNode);
      await this.registerHumidityCapability(zclNode);
      await this.registerContactCapability(zclNode);
      await this.registerWaterLeakCapability(zclNode);
      await this.registerTamperCapability(zclNode);
      await this.registerBatteryCapability(zclNode);
      
      // Enable debugging
      this.enableDebug();
      this.printNode();
      
      this.log('Multi-sensor initialization complete');
    } catch (error) {
      this.error('Error initializing multi-sensor:', error);
    }
  }

  // Motion Detection
  async registerMotionCapability(zclNode) {
    if (!this.hasCapability('alarm_motion')) {
      await this.addCapability('alarm_motion').catch(this.error);
    }

    if (zclNode.endpoints[1]?.clusters[CLUSTER.OCCUPANCY_SENSING.NAME]) {
      this.registerCapability('alarm_motion', CLUSTER.OCCUPANCY_SENSING, {
        get: 'occupancy',
        getOpts: { getOnStart: true },
        report: 'occupancy',
        reportParser: value => {
          const motionDetected = (value & 1) === 1;
          this.handleMotionDetected(motionDetected);
          return motionDetected;
        },
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 0,
            maxInterval: this.state.reportInterval,
            minChange: 1,
          },
        },
      });
    }
  }

  handleMotionDetected(detected) {
    if (detected) {
      this.state.motionDetected = true;
      this.state.lastMotion = Date.now();
      
      // Clear any existing timeout
      if (this.state.motionTimeout) {
        clearTimeout(this.state.motionTimeout);
      }
      
      // Set new timeout to clear motion
      this.state.motionTimeout = setTimeout(() => {
        this.state.motionDetected = false;
        this.setCapabilityValue('alarm_motion', false).catch(this.error);
      }, this.state.motionTimeoutDuration * 1000);
      
      this.log(`Motion detected at ${new Date().toISOString()}`);
    }
  }

  // Temperature Measurement
  async registerTemperatureCapability(zclNode) {
    if (!this.hasCapability('measure_temperature')) {
      await this.addCapability('measure_temperature').catch(this.error);
    }

    if (zclNode.endpoints[1]?.clusters[CLUSTER.TEMPERATURE_MEASUREMENT.NAME]) {
      this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT, {
        get: 'measuredValue',
        getOpts: { getOnStart: true },
        report: 'measuredValue',
        reportParser: value => {
          const temperature = (value / 100) + this.state.temperatureOffset;
          this.state.temperature = temperature;
          this.state.lastUpdate = Date.now();
          return temperature;
        },
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 60,
            maxInterval: this.state.reportInterval,
            minChange: 10, // 0.1°C
          },
        },
      });
    }
  }

  // Humidity Measurement
  async registerHumidityCapability(zclNode) {
    if (!this.hasCapability('measure_humidity')) {
      await this.addCapability('measure_humidity').catch(this.error);
    }

    if (zclNode.endpoints[1]?.clusters[CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT.NAME]) {
      this.registerCapability('measure_humidity', CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT, {
        get: 'measuredValue',
        getOpts: { getOnStart: true },
        report: 'measuredValue',
        reportParser: value => {
          const humidity = (value / 100) + this.state.humidityOffset;
          this.state.humidity = Math.min(100, Math.max(0, humidity));
          this.state.lastUpdate = Date.now();
          return this.state.humidity;
        },
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 60,
            maxInterval: this.state.reportInterval,
            minChange: 10, // 0.1%
          },
        },
      });
    }
  }

  // Contact Sensor
  async registerContactCapability(zclNode) {
    if (!this.hasCapability('alarm_contact')) {
      await this.addCapability('alarm_contact').catch(this.error);
    }

    if (zclNode.endpoints[1]?.clusters[CLUSTER.IAS_ZONE.NAME]) {
      this.registerCapability('alarm_contact', CLUSTER.IAS_ZONE, {
        get: 'zoneStatus',
        getOpts: { getOnStart: true },
        report: 'zoneStatusChangeNotification',
        reportParser: value => {
          const isOpen = (value.zoneStatus & 1) === 1;
          this.state.contactState = isOpen ? 'open' : 'closed';
          this.state.lastUpdate = Date.now();
          return isOpen;
        },
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 0,
            maxInterval: this.state.reportInterval,
            minChange: 1,
          },
        },
      });
    }
  }

  // Water Leak Detection
  async registerWaterLeakCapability(zclNode) {
    if (!this.hasCapability('alarm_water')) {
      await this.addCapability('alarm_water').catch(this.error);
    }

    if (zclNode.endpoints[1]?.clusters[CLUSTER.IAS_ZONE.NAME]) {
      this.registerCapability('alarm_water', CLUSTER.IAS_ZONE, {
        get: 'zoneStatus',
        getOpts: { getOnStart: true },
        report: 'zoneStatusChangeNotification',
        reportParser: value => {
          const isLeaking = (value.zoneStatus & 1) === 1;
          this.state.waterLeak = isLeaking;
          this.state.lastUpdate = Date.now();
          return isLeaking;
        },
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 0,
            maxInterval: this.state.reportInterval,
            minChange: 1,
          },
        },
      });
    }
  }

  // Tamper Detection
  async registerTamperCapability(zclNode) {
    if (!this.hasCapability('alarm_tamper')) {
      await this.addCapability('alarm_tamper').catch(this.error);
    }

    if (zclNode.endpoints[1]?.clusters[CLUSTER.IAS_ZONE.NAME]) {
      this.registerCapability('alarm_tamper', CLUSTER.IAS_ZONE, {
        get: 'zoneStatus',
        getOpts: { getOnStart: true },
        report: 'zoneStatusChangeNotification',
        reportParser: value => {
          const isTampered = ((value.zoneStatus >> 3) & 1) === 1;
          this.state.tamper = isTampered;
          return isTampered;
        },
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 0,
            maxInterval: this.state.reportInterval,
            minChange: 1,
          },
        },
      });
    }
  }

  // Battery Monitoring
  async registerBatteryCapability(zclNode) {
    if (!this.hasCapability('measure_battery')) {
      await this.addCapability('measure_battery').catch(this.error);
    }
    
    if (!this.hasCapability('alarm_battery')) {
      await this.addCapability('alarm_battery').catch(this.error);
    }

    if (zclNode.endpoints[1]?.clusters[CLUSTER.POWER_CONFIGURATION.NAME]) {
      this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
        get: 'batteryPercentageRemaining',
        getOpts: { getOnStart: true },
        report: 'batteryPercentageRemaining',
        reportParser: value => {
          const batteryPercentage = Math.min(100, value / 2);
          this.updateBatteryStatus(batteryPercentage);
          return batteryPercentage;
        },
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 0,
            maxInterval: this.state.reportInterval,
            minChange: 5, // 5% change
          },
        },
      });
    }
  }

  updateBatteryStatus(batteryPercentage) {
    const batteryLow = batteryPercentage <= this.state.batteryThreshold;
    
    if (this.state.batteryLow !== batteryLow) {
      this.state.batteryLow = batteryLow;
      this.setCapabilityValue('alarm_battery', batteryLow).catch(this.error);
      
      if (batteryLow) {
        this.log(`Battery low: ${batteryPercentage}%`);
      }
    }
    
    this.state.battery = batteryPercentage;
    this.state.lastBatteryUpdate = Date.now();
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Settings changed:', changedKeys);
    
    // Handle motion timeout changes
    if (changedKeys.includes('motion_timeout')) {
      const timeout = parseInt(newSettings.motion_timeout) || 60;
      this.state.motionTimeoutDuration = Math.max(10, Math.min(3600, timeout));
      this.log(`Motion timeout updated to: ${this.state.motionTimeoutDuration} seconds`);
    }
    
    // Handle temperature offset
    if (changedKeys.includes('temperature_offset')) {
      this.state.temperatureOffset = parseFloat(newSettings.temperature_offset) || 0;
      if (this.state.temperature !== null) {
        const currentTemp = this.getCapabilityValue('measure_temperature');
        const newTemp = (currentTemp - (oldSettings.temperature_offset || 0)) + this.state.temperatureOffset;
        this.setCapabilityValue('measure_temperature', newTemp).catch(this.error);
      }
    }
    
    // Handle humidity offset
    if (changedKeys.includes('humidity_offset')) {
      this.state.humidityOffset = parseFloat(newSettings.humidity_offset) || 0;
      if (this.state.humidity !== null) {
        const currentHumidity = this.getCapabilityValue('measure_humidity');
        const newHumidity = (currentHumidity - (oldSettings.humidity_offset || 0)) + this.state.humidityOffset;
        this.setCapabilityValue('measure_humidity', Math.min(100, Math.max(0, newHumidity))).catch(this.error);
      }
    }
    
    // Handle report interval
    if (changedKeys.includes('report_interval')) {
      const interval = parseInt(newSettings.report_interval) || 300;
      this.state.reportInterval = Math.max(60, interval);
      this.log(`Report interval updated to: ${this.state.reportInterval} seconds`);
    }
    
    // Handle battery threshold
    if (changedKeys.includes('battery_threshold')) {
      const threshold = parseInt(newSettings.battery_threshold) || 20;
      this.state.batteryThreshold = Math.min(50, Math.max(5, threshold));
      this.updateBatteryStatus(this.state.battery);
    }
    
    // Handle LED setting
    if (changedKeys.includes('led_enabled')) {
      this.state.ledEnabled = !!newSettings.led_enabled;
      this.log(`LED ${this.state.ledEnabled ? 'enabled' : 'disabled'}`);
    }
    
    // Handle sensitivity
    if (changedKeys.includes('sensitivity')) {
      this.state.sensitivity = ['low', 'medium', 'high'].includes(newSettings.sensitivity) 
        ? newSettings.sensitivity 
        : 'medium';
      this.log(`Sensitivity set to: ${this.state.sensitivity}`);
    }
  }

  onDeleted() {
    this.log('Multi-sensor removed');
    
    // Clean up any timeouts
    if (this.state.motionTimeout) {
      clearTimeout(this.state.motionTimeout);
    }
  }
}

module.exports = TuyaMultiSensor;
