#!/usr/bin/env node
'use strict';

const TuyaZigbeeDevice = require('../../drivers/base/device');
const { CLUSTER } = require('zigbee-clusters');
const { log } = require('../../drivers/_common/helpers');

/**
 * Switch device driver for Tuya Zigbee devices
 * Supports: On/Off, Dimmer, Scene, and other switch types
 * @extends TuyaZigbeeDevice
 */
class TuyaZigbeeSwitchDevice extends TuyaZigbeeDevice {
  /**
   * Device initialization
   */
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    
    try {
      this.logger.info(`Initializing switch device ${this.getName()} (${this.getStoreValue('modelId')})`);
      
      // Store the ZCL node for later use
      this.zclNode = zclNode;
      
      // Initialize switch state
      this.switchState = {
        onOff: false,
        level: 0,
        lastUpdated: null
      };
      
      // Register capabilities
      await this.registerCapabilities();
      
      // Configure device
      await this.configureDevice();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Initial state read
      await this.readState();
      
      this.logger.info(`Switch device ${this.getName()} initialized successfully`);
    } catch (error) {
      this.logger.error(`Error initializing switch device ${this.getName()}:`, error);
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
        'onoff',
        'dim',
        'measure_power',
        'meter_power',
        'measure_voltage',
        'measure_current',
        'alarm_battery'
      ];
      
      for (const capability of capabilities) {
        if (this.hasCapability(capability)) {
          await this.registerCapability(capability);
          this.logger.debug(`Registered capability: ${capability}`);
        }
      }
      
      // Register capability listeners
      if (this.hasCapability('onoff')) {
        this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
      }
      
      if (this.hasCapability('dim')) {
        this.registerCapabilityListener('dim', this.onCapabilityDim.bind(this));
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
      
      // Configure reporting for on/off
      if (this.hasCapability('onoff')) {
        await this.configureReporting('genOnOff', {
          onOff: {
            minInterval: 0, // Report immediately
            maxInterval: 300, // 5 minutes
          },
        });
      }
      
      // Configure reporting for level control
      if (this.hasCapability('dim')) {
        await this.configureReporting('genLevelCtrl', {
          currentLevel: {
            minInterval: 1, // 1 second
            maxInterval: 300, // 5 minutes
            minChange: 1, // 1% change
          },
        });
      }
      
      // Configure reporting for electrical measurements
      if (this.hasCapability('measure_power') || 
          this.hasCapability('measure_voltage') || 
          this.hasCapability('measure_current')) {
        await this.configureReporting('haElectricalMeasurement', {
          activePower: {
            minInterval: 10, // 10 seconds
            maxInterval: 300, // 5 minutes
            minChange: 10, // 1W
          },
          rmsVoltage: {
            minInterval: 10,
            maxInterval: 300,
            minChange: 5, // 0.5V
          },
          rmsCurrent: {
            minInterval: 10,
            maxInterval: 300,
            minChange: 10, // 0.01A
          },
        });
      }
      
      // Configure reporting for metering
      if (this.hasCapability('meter_power')) {
        await this.configureReporting('seMetering', {
          currentSummationDelivered: {
            minInterval: 300, // 5 minutes
            maxInterval: 3600, // 1 hour
            minChange: 10, // 0.01kWh
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
    
    // Set up polling for state updates
    this.pollingInterval = setInterval(
      () => this.readState(),
      this.getSetting('polling_interval') || 300000 // Default 5 minutes
    );
    
    // Update polling interval when settings change
    this.homey.settings.on('set', (key) => {
      if (key === 'polling_interval') {
        clearInterval(this.pollingInterval);
        this.pollingInterval = setInterval(
          () => this.readState(),
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
      case CLUSTER.ON_OFF.NAME:
        this.handleOnOffUpdate(attributeName, data.attrData);
        break;
        
      case CLUSTER.LEVEL_CONTROL.NAME:
        this.handleLevelUpdate(attributeName, data.attrData);
        break;
        
      case CLUSTER.ELECTRICAL_MEASUREMENT.NAME:
        this.handleElectricalMeasurementUpdate(attributeName, data.attrData);
        break;
        
      case CLUSTER.METERING.NAME:
        this.handleMeteringUpdate(attributeName, data.attrData);
        break;
    }
    
    // Update last updated timestamp
    this.switchState.lastUpdated = new Date();
  }
  
  /**
   * Read current device state
   */
  async readState() {
    try {
      this.logger.debug('Reading device state...');
      
      // Read on/off state
      if (this.hasCapability('onoff')) {
        const onOff = await this.readAttribute('genOnOff', 'onOff');
        if (onOff !== undefined) {
          this.handleOnOffUpdate('onOff', onOff);
        }
      }
      
      // Read dim level
      if (this.hasCapability('dim')) {
        const level = await this.readAttribute('genLevelCtrl', 'currentLevel');
        if (level !== undefined) {
          this.handleLevelUpdate('currentLevel', level);
        }
      }
      
      // Read electrical measurements
      if (this.hasCapability('measure_power') || 
          this.hasCapability('measure_voltage') || 
          this.hasCapability('measure_current')) {
        
        const [power, voltage, current] = await Promise.all([
          this.readAttribute('haElectricalMeasurement', 'activePower'),
          this.readAttribute('haElectricalMeasurement', 'rmsVoltage'),
          this.readAttribute('haElectricalMeasurement', 'rmsCurrent'),
        ]);
        
        if (power !== undefined) {
          this.handleElectricalMeasurementUpdate('activePower', power);
        }
        
        if (voltage !== undefined) {
          this.handleElectricalMeasurementUpdate('rmsVoltage', voltage);
        }
        
        if (current !== undefined) {
          this.handleElectricalMeasurementUpdate('rmsCurrent', current);
        }
      }
      
      // Read metering
      if (this.hasCapability('meter_power')) {
        const energy = await this.readAttribute('seMetering', 'currentSummationDelivered');
        if (energy !== undefined) {
          this.handleMeteringUpdate('currentSummationDelivered', energy);
        }
      }
      
      // Update last updated timestamp
      this.switchState.lastUpdated = new Date();
      
    } catch (error) {
      this.logger.error('Error reading device state:', error);
    }
  }
  
  /**
   * Handle on/off updates
   * @param {string} attribute - Attribute name
   * @param {boolean} value - On/Off state
   */
  handleOnOffUpdate(attribute, value) {
    if (attribute === 'onOff' && value !== undefined) {
      this.switchState.onOff = value;
      
      if (this.hasCapability('onoff')) {
        this.setCapabilityValue('onoff', value)
          .catch(err => this.logger.error('Error updating on/off state:', err));
      }
    }
  }
  
  /**
   * Handle level updates
   * @param {string} attribute - Attribute name
   * @param {number} value - Level value (0-254)
   */
  handleLevelUpdate(attribute, value) {
    if (attribute === 'currentLevel' && value !== undefined) {
      // Convert from 0-254 to 0-1 range
      const level = value / 254;
      this.switchState.level = level;
      
      if (this.hasCapability('dim')) {
        this.setCapabilityValue('dim', level)
          .catch(err => this.logger.error('Error updating dim level:', err));
      }
    }
  }
  
  /**
   * Handle electrical measurement updates
   * @param {string} attribute - Attribute name
   * @param {number} value - Measurement value
   */
  handleElectricalMeasurementUpdate(attribute, value) {
    if (value === undefined) return;
    
    switch (attribute) {
      case 'activePower':
        // Convert from 0.1W to W
        const power = value / 10;
        if (this.hasCapability('measure_power')) {
          this.setCapabilityValue('measure_power', power)
            .catch(err => this.logger.error('Error updating power measurement:', err));
        }
        break;
        
      case 'rmsVoltage':
        // Convert from 0.1V to V
        const voltage = value / 10;
        if (this.hasCapability('measure_voltage')) {
          this.setCapabilityValue('measure_voltage', voltage)
            .catch(err => this.logger.error('Error updating voltage measurement:', err));
        }
        break;
        
      case 'rmsCurrent':
        // Convert from 0.001A to A
        const current = value / 1000;
        if (this.hasCapability('measure_current')) {
          this.setCapabilityValue('measure_current', current)
            .catch(err => this.logger.error('Error updating current measurement:', err));
        }
        break;
    }
  }
  
  /**
   * Handle metering updates
   * @param {string} attribute - Attribute name
   * @param {number} value - Metering value
   */
  handleMeteringUpdate(attribute, value) {
    if (attribute === 'currentSummationDelivered' && value !== undefined && this.hasCapability('meter_power')) {
      // Convert from 0.001kWh to kWh
      const energy = value / 1000;
      this.setCapabilityValue('meter_power', energy)
        .catch(err => this.logger.error('Error updating energy meter:', err));
    }
  }
  
  /**
   * Handle on/off capability changes
   * @param {boolean} value - New on/off state
   * @param {Object} opts - Options
   */
  async onCapabilityOnoff(value, opts = {}) {
    try {
      this.logger.debug(`Setting on/off state to: ${value}`);
      
      // Update local state
      this.switchState.onOff = value;
      
      // Send command to device
      const command = value ? 'setOn' : 'setOff';
      await this.zclNode.endpoints[1].clusters.genOnOff[command]({});
      
      // Update capability value
      await this.setCapabilityValue('onoff', value);
      
    } catch (error) {
      this.logger.error('Error setting on/off state:', error);
      throw error;
    }
  }
  
  /**
   * Handle dim capability changes
   * @param {number} value - New dim level (0-1)
   * @param {Object} opts - Options
   */
  async onCapabilityDim(value, opts = {}) {
    try {
      // Convert from 0-1 to 0-254
      const level = Math.round(value * 254);
      this.logger.debug(`Setting dim level to: ${level}`);
      
      // Update local state
      this.switchState.level = value;
      
      // Send command to device
      await this.zclNode.endpoints[1].clusters.genLevelCtrl.moveToLevelWithOnOff({
        level,
        transitionTime: opts.transitionTime || 0, // Default: immediate
      });
      
      // Update capability value
      await this.setCapabilityValue('dim', value);
      
    } catch (error) {
      this.logger.error('Error setting dim level:', error);
      throw error;
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
   * Configure reporting for attributes
   * @param {string} clusterName - Cluster name
   * @param {Object} config - Reporting configuration
   */
  async configureReporting(clusterName, config) {
    try {
      const cluster = this.zclNode.endpoints[1].clusters[clusterName];
      if (!cluster) {
        throw new Error(`Cluster ${clusterName} not found`);
      }
      
      await cluster.configureReporting(config);
      this.logger.debug(`Configured reporting for ${clusterName}`);
      
    } catch (error) {
      this.logger.error(`Error configuring reporting for ${clusterName}:`, error);
      throw error;
    }
  }
  
  /**
   * Clean up resources when device is deleted
   */
  async onDeleted() {
    try {
      this.logger.info(`Switch device ${this.getName()} is being deleted`);
      
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

module.exports = TuyaZigbeeSwitchDevice;
