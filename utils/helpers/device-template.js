#!/usr/bin/env node
'use strict';

const TuyaZigbeeDevice = require('../../drivers/base/device');
const { CLUSTER } = require('zigbee-clusters');
const { log } = require('../../drivers/_common/helpers');

/**
 * Template device driver for Tuya Zigbee devices
 * @extends TuyaZigbeeDevice
 */
class TuyaZigbeeTemplateDevice extends TuyaZigbeeDevice {
  /**
   * Device initialization
   */
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    
    try {
      this.logger.info(`Initializing ${this.getName()} (${this.getStoreValue('modelId')})`);
      
      // Store the ZCL node for later use
      this.zclNode = zclNode;
      
      // Register capabilities
      await this.registerCapabilities();
      
      // Configure device-specific settings
      await this.configureDevice();
      
      // Set up event listeners
      this.setupEventListeners();
      
      this.logger.info(`${this.getName()} initialized successfully`);
    } catch (error) {
      this.logger.error(`Error initializing ${this.getName()}:`, error);
      throw error;
    }
  }
  
  /**
   * Register device capabilities
   */
  async registerCapabilities() {
    try {
      const manifest = this.getManifest();
      
      // Register each capability from the manifest
      for (const capability of manifest.capabilities || []) {
        await this.registerCapability(capability);
        this.logger.debug(`Registered capability: ${capability}`);
      }
      
      // Register capability listeners
      this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
      
    } catch (error) {
      this.logger.error('Error registering capabilities:', error);
      throw error;
    }
  }
  
  /**
   * Configure device-specific settings
   */
  async configureDevice() {
    // Example: Configure reporting for basic cluster
    try {
      await this.configureReporting('genBasic', {
        // Add reporting configuration here
      });
      
      // Apply any device-specific configuration
      await this.applyDeviceConfiguration();
      
    } catch (error) {
      this.logger.error('Error configuring device:', error);
      throw error;
    }
  }
  
  /**
   * Apply device-specific configuration
   * Override this method in device-specific drivers
   */
  async applyDeviceConfiguration() {
    // To be implemented by device-specific drivers
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
    
    // Listen for device online/offline events
    this.registerCapabilityListener('alarm_battery', this.onBatteryAlarm.bind(this));
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
      case CLUSTER.GEN_BASIC.NAME:
        this.handleBasicClusterUpdate(attributeName, data.attrData);
        break;
      // Add more cluster handlers as needed
    }
  }
  
  /**
   * Handle basic cluster updates
   * @param {string} attribute - Attribute name
   * @param {*} value - Attribute value
   */
  handleBasicClusterUpdate(attribute, value) {
    switch (attribute) {
      case 'zclVersion':
      case 'appVersion':
      case 'stackVersion':
      case 'hwVersion':
      case 'manufacturerName':
      case 'modelId':
      case 'dateCode':
      case 'powerSource':
        // Update device settings with basic cluster information
        this.setSettings({
          [attribute]: value,
        }).catch(err => {
          this.logger.error(`Failed to update setting ${attribute}:`, err);
        });
        break;
    }
  }
  
  /**
   * Handle battery alarm
   * @param {boolean} value - Battery alarm state
   * @param {Object} opts - Options
   */
  async onBatteryAlarm(value, opts = {}) {
    try {
      // Handle battery alarm state changes
      this.logger.debug(`Battery alarm: ${value ? 'triggered' : 'cleared'}`);
      
      // Update battery status
      await this.setCapabilityValue('alarm_battery', value);
      
    } catch (error) {
      this.logger.error('Error handling battery alarm:', error);
      throw error;
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
      
      // Example: Send command to device
      // await this.zclNode.endpoints[1].clusters.onOff.setOnOff({
      //   onOff: value,
      // });
      
      // Update capability value
      await this.setCapabilityValue('onoff', value);
      
    } catch (error) {
      this.logger.error('Error setting on/off state:', error);
      throw error;
    }
  }
  
  /**
   * Configure attribute reporting
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
      this.logger.info(`Device ${this.getName()} is being deleted`);
      
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

module.exports = TuyaZigbeeTemplateDevice;
