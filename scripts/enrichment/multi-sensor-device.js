#!/usr/bin/env node
'use strict';

const TuyaZigbeeDevice = require('../../drivers/base/device');
const { CLUSTER } = require('zigbee-clusters');
const { log } = require('../../drivers/_common/helpers');

/**
 * Multi-sensor device driver for Tuya Zigbee devices
 * Supports: temperature, humidity, motion, contact, illuminance, battery
 * @extends TuyaZigbeeDevice
 */
class TuyaZigbeeMultiSensorDevice extends TuyaZigbeeDevice {
  /**
   * Device initialization
   */
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    
    try {
      this.logger.info(`Initializing multi-sensor ${this.getName()} (${this.getStoreValue('modelId')})`);
      
      // Store the ZCL node for later use
      this.zclNode = zclNode;
      
      // Initialize sensor data cache
      this.sensorData = {
        temperature: null,
        humidity: null,
        motion: null,
        contact: null,
        illuminance: null,
        battery: null,
        lastUpdated: null
      };
      
      // Register capabilities
      await this.registerCapabilities();
      
      // Configure device
      await this.configureDevice();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Initial sensor read
      await this.readSensors();
      
      this.logger.info(`Multi-sensor ${this.getName()} initialized successfully`);
    } catch (error) {
      this.logger.error(`Error initializing multi-sensor ${this.getName()}:`, error);
      throw error;
    }
  }
  
  /**
   * Register device capabilities
   */
  async registerCapabilities() {
    try {
      // Register standard capabilities
      const capabilities = [
        'measure_temperature',
        'measure_humidity',
        'alarm_motion',
        'alarm_contact',
        'measure_luminance',
        'measure_battery',
        'alarm_battery'
      ];
      
      for (const capability of capabilities) {
        if (this.hasCapability(capability)) {
          await this.registerCapability(capability);
          this.logger.debug(`Registered capability: ${capability}`);
        }
      }
      
    } catch (error) {
      this.logger.error('Error registering capabilities:', error);
      throw error;
    }
  }
  
  /**
   * Configure device
   */
  async configureDevice() {
    try {
      // Configure reporting for basic cluster
      await this.configureReporting('genBasic', {
        // Add basic cluster reporting configuration
      });
      
      // Configure reporting for temperature measurement
      if (this.hasCapability('measure_temperature')) {
        await this.configureReporting('msTemperatureMeasurement', {
          measuredValue: {
            minInterval: 300, // 5 minutes
            maxInterval: 600, // 10 minutes
            minChange: 10, // 0.1°C
          },
        });
      }
      
      // Configure reporting for humidity measurement
      if (this.hasCapability('measure_humidity')) {
        await this.configureReporting('msRelativeHumidity', {
          measuredValue: {
            minInterval: 300, // 5 minutes
            maxInterval: 600, // 10 minutes
            minChange: 10, // 0.1%
          },
        });
      }
      
      // Configure reporting for motion detection
      if (this.hasCapability('alarm_motion')) {
        await this.configureReporting('ssIasZone', {
          zoneStatus: {
            minInterval: 0, // Report immediately
            maxInterval: 3600, // 1 hour
          },
        });
      }
      
      // Configure reporting for contact sensor
      if (this.hasCapability('alarm_contact')) {
        await this.configureReporting('ssIasZone', {
          zoneStatus: {
            minInterval: 0, // Report immediately
            maxInterval: 3600, // 1 hour
          },
        });
      }
      
      // Configure reporting for illuminance
      if (this.hasCapability('measure_luminance')) {
        await this.configureReporting('msIlluminanceMeasurement', {
          measuredValue: {
            minInterval: 300, // 5 minutes
            maxInterval: 1800, // 30 minutes
            minChange: 10, // 1 lux
          },
        });
      }
      
      // Configure reporting for battery
      if (this.hasCapability('measure_battery')) {
        await this.configureReporting('genPowerCfg', {
          batteryPercentageRemaining: {
            minInterval: 3600, // 1 hour
            maxInterval: 21600, // 6 hours
            minChange: 5, // 0.5%
          },
        });
      }
      
    } catch (error) {
      this.logger.error('Error configuring device:', error);
      throw error;
    }
  }
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Listen for attribute reports
    this.zclNode.endpoints.forEach(endpoint => {
      endpoint.clusters.forEach(cluster => {
        cluster.on('attr', (data) => {
          this.handleAttributeReport(cluster, data);
        });
      });
    });
    
    // Set up polling for sensors that don't support reporting
    this.pollingInterval = setInterval(
      () => this.readSensors(),
      this.getSetting('polling_interval') || 300000 // Default 5 minutes
    );
    
    // Update polling interval when settings change
    this.homey.settings.on('set', (key) => {
      if (key === 'polling_interval') {
        clearInterval(this.pollingInterval);
        this.pollingInterval = setInterval(
          () => this.readSensors(),
          this.getSetting('polling_interval') || 300000
        );
      }
    });
  }
  
  /**
   * Handle attribute reports
   * @param {Object} cluster - ZCL cluster
   * @param {Object} data - Attribute data
   */
  handleAttributeReport(cluster, data) {
    const { attributes, clusterId } = cluster;
    const attributeName = Object.keys(attributes).find(
      key => attributes[key].id === data.attrId
    );
    
    if (!attributeName) return;
    
    this.logger.debug(`Attribute report: cluster=${clusterId}, attribute=${attributeName}, value=${data.attrData}`);
    
    // Handle specific attribute updates
    switch (clusterId) {
      case CLUSTER.TEMPERATURE_MEASUREMENT.NAME:
        this.handleTemperatureUpdate(attributeName, data.attrData);
        break;
        
      case CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT.NAME:
        this.handleHumidityUpdate(attributeName, data.attrData);
        break;
        
      case CLUSTER.IAS_ZONE.NAME:
        this.handleIasZoneUpdate(attributeName, data.attrData);
        break;
        
      case CLUSTER.ILLUMINANCE_MEASUREMENT.NAME:
        this.handleIlluminanceUpdate(attributeName, data.attrData);
        break;
        
      case CLUSTER.POWER_CONFIGURATION.NAME:
        this.handleBatteryUpdate(attributeName, data.attrData);
        break;
    }
    
    // Update last updated timestamp
    this.sensorData.lastUpdated = new Date();
  }
  
  /**
   * Read sensor values
   */
  async readSensors() {
    try {
      this.logger.debug('Reading sensor values...');
      
      // Read temperature
      if (this.hasCapability('measure_temperature')) {
        const temp = await this.readAttribute('msTemperatureMeasurement', 'measuredValue');
        if (temp !== undefined) {
          this.handleTemperatureUpdate('measuredValue', temp);
        }
      }
      
      // Read humidity
      if (this.hasCapability('measure_humidity')) {
        const humidity = await this.readAttribute('msRelativeHumidity', 'measuredValue');
        if (humidity !== undefined) {
          this.handleHumidityUpdate('measuredValue', humidity);
        }
      }
      
      // Read illuminance
      if (this.hasCapability('measure_luminance')) {
        const illuminance = await this.readAttribute('msIlluminanceMeasurement', 'measuredValue');
        if (illuminance !== undefined) {
          this.handleIlluminanceUpdate('measuredValue', illuminance);
        }
      }
      
      // Read battery
      if (this.hasCapability('measure_battery')) {
        const battery = await this.readAttribute('genPowerCfg', 'batteryPercentageRemaining');
        if (battery !== undefined) {
          this.handleBatteryUpdate('batteryPercentageRemaining', battery);
        }
      }
      
      // Update last updated timestamp
      this.sensorData.lastUpdated = new Date();
      
    } catch (error) {
      this.logger.error('Error reading sensors:', error);
    }
  }
  
  /**
   * Handle temperature updates
   * @param {string} attribute - Attribute name
   * @param {number} value - Temperature value (in 0.01°C)
   */
  handleTemperatureUpdate(attribute, value) {
    if (attribute === 'measuredValue' && value !== undefined) {
      // Convert from 0.01°C to °C
      const temperature = value / 100;
      this.sensorData.temperature = temperature;
      
      if (this.hasCapability('measure_temperature')) {
        this.setCapabilityValue('measure_temperature', temperature)
          .catch(err => this.logger.error('Error updating temperature:', err));
      }
    }
  }
  
  /**
   * Handle humidity updates
   * @param {string} attribute - Attribute name
   * @param {number} value - Humidity value (in 0.01%)
   */
  handleHumidityUpdate(attribute, value) {
    if (attribute === 'measuredValue' && value !== undefined) {
      // Convert from 0.01% to %
      const humidity = value / 100;
      this.sensorData.humidity = humidity;
      
      if (this.hasCapability('measure_humidity')) {
        this.setCapabilityValue('measure_humidity', humidity)
          .catch(err => this.logger.error('Error updating humidity:', err));
      }
    }
  }
  
  /**
   * Handle IAS Zone updates
   * @param {string} attribute - Attribute name
   * @param {number} value - Zone status value
   */
  handleIasZoneUpdate(attribute, value) {
    if (attribute === 'zoneStatus' && value !== undefined) {
      // Check for motion detection
      if (this.hasCapability('alarm_motion')) {
        const motionDetected = (value & 0x0001) === 0x0001;
        this.sensorData.motion = motionDetected;
        
        this.setCapabilityValue('alarm_motion', motionDetected)
          .catch(err => this.logger.error('Error updating motion detection:', err));
      }
      
      // Check for contact sensor
      if (this.hasCapability('alarm_contact')) {
        const contactDetected = (value & 0x0002) === 0x0002;
        this.sensorData.contact = contactDetected;
        
        this.setCapabilityValue('alarm_contact', contactDetected)
          .catch(err => this.logger.error('Error updating contact sensor:', err));
      }
    }
  }
  
  /**
   * Handle illuminance updates
   * @param {string} attribute - Attribute name
   * @param {number} value - Illuminance value (in lux)
   */
  handleIlluminanceUpdate(attribute, value) {
    if (attribute === 'measuredValue' && value !== undefined) {
      // Convert to lux (formula may vary by device)
      const illuminance = Math.pow(10, (value - 1) / 10000);
      this.sensorData.illuminance = illuminance;
      
      if (this.hasCapability('measure_luminance')) {
        this.setCapabilityValue('measure_luminance', illuminance)
          .catch(err => this.logger.error('Error updating illuminance:', err));
      }
    }
  }
  
  /**
   * Handle battery updates
   * @param {string} attribute - Attribute name
   * @param {number} value - Battery value
   */
  handleBatteryUpdate(attribute, value) {
    if (attribute === 'batteryPercentageRemaining' && value !== undefined) {
      // Convert from 0-200% to 0-100%
      const batteryPercentage = Math.min(100, value / 2);
      this.sensorData.battery = batteryPercentage;
      
      if (this.hasCapability('measure_battery')) {
        this.setCapabilityValue('measure_battery', batteryPercentage)
          .catch(err => this.logger.error('Error updating battery level:', err));
        
        // Update battery alarm if capacity is low
        const batteryLow = batteryPercentage < 20; // 20% threshold
        this.setCapabilityValue('alarm_battery', batteryLow)
          .catch(err => this.logger.error('Error updating battery alarm:', err));
      }
    }
  }
  
  /**
   * Read an attribute from the device
   * @param {string} clusterName - Cluster name
   * @param {string} attributeName - Attribute name
   * @returns {Promise<*>} Attribute value
   */
  async readAttribute(clusterName, attributeName) {
    try {
      const cluster = this.zclNode.endpoints[1].clusters[clusterName];
      if (!cluster) {
        throw new Error(`Cluster ${clusterName} not found`);
      }
      
      const result = await cluster.readAttributes(attributeName);
      return result[attributeName];
      
    } catch (error) {
      this.logger.error(`Error reading ${attributeName} from ${clusterName}:`, error);
      throw error;
    }
  }
  
  /**
   * Clean up resources when device is deleted
   */
  async onDeleted() {
    try {
      this.logger.info(`Multi-sensor ${this.getName()} is being deleted`);
      
      // Clear polling interval
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
      }
      
      // Clean up event listeners
      if (this.zclNode) {
        this.zclNode.endpoints.forEach(endpoint => {
          endpoint.clusters.forEach(cluster => {
            cluster.removeAllListeners();
          });
        });
      }
      
      await super.onDeleted();
      
    } catch (error) {
      this.logger.error('Error during device deletion:', error);
      throw error;
    }
  }
}

module.exports = TuyaZigbeeMultiSensorDevice;
