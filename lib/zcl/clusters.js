#!/usr/bin/env node
'use strict';

/**
 * 🔧 ZCL Cluster Helpers - Universal Tuya Zigbee
 * ZCL cluster binding and attribute helpers
 */

const { getCapabilityMapping, transformValue } = require('./cluster-cap-map');

class ClusterHelpers {
  constructor() {
    this.clusters = {
      // Basic clusters
      BASIC: 0x0000,
      POWER_CONFIG: 0x0001,
      DEVICE_TEMP: 0x0002,
      IDENTIFY: 0x0003,
      GROUPS: 0x0004,
      SCENES: 0x0005,
      ON_OFF: 0x0006,
      ON_OFF_SWITCH_CONFIG: 0x0007,
      LEVEL_CONTROL: 0x0008,
      ALARMS: 0x0009,
      TIME: 0x000A,
      RSSI_LOCATION: 0x000B,
      ANALOG_INPUT: 0x000C,
      ANALOG_OUTPUT: 0x000D,
      ANALOG_VALUE: 0x000E,
      BINARY_INPUT: 0x000F,
      BINARY_OUTPUT: 0x0010,
      BINARY_VALUE: 0x0011,
      MULTISTATE_INPUT: 0x0012,
      MULTISTATE_OUTPUT: 0x0013,
      MULTISTATE_VALUE: 0x0014,
      OTA: 0x0019,
      TOUCHLINK: 0x1000,
      
      // Lighting clusters
      COLOR_CONTROL: 0x0300,
      BALLAST_CONFIG: 0x0301,
      ILLUMINANCE_MEASUREMENT: 0x0400,
      ILLUMINANCE_LEVEL_SENSING: 0x0401,
      TEMPERATURE_MEASUREMENT: 0x0402,
      PRESSURE_MEASUREMENT: 0x0403,
      FLOW_MEASUREMENT: 0x0404,
      HUMIDITY_MEASUREMENT: 0x0405,
      CONCENTRATION_MEASUREMENT: 0x0406,
      
      // Security clusters
      IAS_ZONE: 0x0500,
      IAS_ACE: 0x0501,
      IAS_WD: 0x0502,
      
      // HVAC clusters
      THERMOSTAT: 0x0201,
      FAN_CONTROL: 0x0202,
      THERMOSTAT_UI_CONFIG: 0x0204,
      
      // Tuya specific
      MANU_TUYA: 0xE001,
      TUYA_DP: 0xE001
    };
  }

  /**
   * Setup cluster bindings for a device
   */
  async setupClusterBindings(device, zclNode) {
    try {
      const endpoints = await this.discoverEndpoints(zclNode);
      const primaryEndpoint = this.selectPrimaryEndpoint(endpoints);
      
      if (!primaryEndpoint) {
        throw new Error('No primary endpoint found');
      }
      
      // Setup bindings for primary endpoint
      await this.setupEndpointBindings(device, zclNode, primaryEndpoint);
      
      // Setup additional endpoints if needed
      for (const endpoint of endpoints) {
        if (endpoint !== primaryEndpoint) {
          await this.setupEndpointBindings(device, zclNode, endpoint);
        }
      }
      
      return true;
      
    } catch (error) {
      console.error('Failed to setup cluster bindings:', error);
      return false;
    }
  }

  /**
   * Discover endpoints on a ZCL node
   */
  async discoverEndpoints(zclNode) {
    try {
      const endpoints = [];
      
      // Get all endpoints
      const endpointList = await zclNode.endpoints;
      
      for (const endpoint of endpointList) {
        try {
          const clusters = await endpoint.clusters;
          if (clusters && Object.keys(clusters).length > 0) {
            endpoints.push(endpoint);
          }
        } catch (error) {
          console.warn(`Failed to get clusters for endpoint ${endpoint.ID}:`, error.message);
        }
      }
      
      return endpoints;
      
    } catch (error) {
      console.error('Failed to discover endpoints:', error);
      return [];
    }
  }

  /**
   * Select primary endpoint based on cluster availability
   */
  selectPrimaryEndpoint(endpoints) {
    if (endpoints.length === 0) return null;
    if (endpoints.length === 1) return endpoints[0];
    
    // Score endpoints based on cluster importance
    const scoredEndpoints = endpoints.map(endpoint => {
      let score = 0;
      
      // Basic clusters get high priority
      if (endpoint.clusters.genBasic) score += 100;
      if (endpoint.clusters.genOnOff) score += 50;
      if (endpoint.clusters.genLevelCtrl) score += 40;
      if (endpoint.clusters.lightingColorCtrl) score += 30;
      
      // Measurement clusters
      if (endpoint.clusters.msTemperatureMeasurement) score += 20;
      if (endpoint.clusters.msRelativeHumidity) score += 20;
      if (endpoint.clusters.haElectricalMeasurement) score += 25;
      
      // Tuya specific
      if (endpoint.clusters.manuSpecificTuya) score += 35;
      
      return { endpoint, score };
    });
    
    // Sort by score (highest first)
    scoredEndpoints.sort((a, b) => b.score - a.score);
    
    return scoredEndpoints[0].endpoint;
  }

  /**
   * Setup bindings for a specific endpoint
   */
  async setupEndpointBindings(device, zclNode, endpoint) {
    try {
      const clusters = await endpoint.clusters;
      
      for (const [clusterName, cluster] of Object.entries(clusters)) {
        await this.setupClusterBinding(device, cluster, clusterName, endpoint);
      }
      
    } catch (error) {
      console.error(`Failed to setup endpoint ${endpoint.ID} bindings:`, error);
    }
  }

  /**
   * Setup binding for a specific cluster
   */
  async setupClusterBinding(device, cluster, clusterName, endpoint) {
    try {
      // Get capability mappings for this cluster
      const capabilities = require('./cluster-cap-map').getClusterCapabilities(clusterName);
      
      for (const cap of capabilities) {
        try {
          // Subscribe to attribute changes
          await cluster.subscribe({
            attributeName: cap.attribute,
            minInterval: 0,
            maxInterval: 300,
            reportableChange: 0
          });
          
          // Set up attribute change handler
          cluster.on(`attr.${cap.attribute}`, (value) => {
            this.handleAttributeChange(device, clusterName, cap.attribute, value, cap);
          });
          
          // Read initial value
          try {
            const initialValue = await cluster.read(cap.attribute);
            this.handleAttributeChange(device, clusterName, cap.attribute, initialValue, cap);
          } catch (error) {
            console.warn(`Failed to read initial value for ${clusterName}.${cap.attribute}:`, error.message);
          }
          
        } catch (error) {
          console.warn(`Failed to setup capability ${cap.capability} for ${clusterName}:`, error.message);
        }
      }
      
    } catch (error) {
      console.error(`Failed to setup cluster ${clusterName} binding:`, error);
    }
  }

  /**
   * Handle attribute value changes
   */
  handleAttributeChange(device, clusterName, attributeName, value, capability) {
    try {
      // Transform value if needed
      const transformedValue = capability.transform ? capability.transform(value) : value;
      
      // Validate value
      if (!this.validateCapabilityValue(capability.capability, transformedValue)) {
        console.warn(`Invalid value for ${capability.capability}:`, transformedValue);
        return;
      }
      
      // Set capability value
      if (device.hasCapability(capability.capability)) {
        device.setCapabilityValue(capability.capability, transformedValue)
          .catch(error => {
            console.error(`Failed to set capability ${capability.capability}:`, error);
          });
      }
      
    } catch (error) {
      console.error(`Error handling attribute change for ${clusterName}.${attributeName}:`, error);
    }
  }

  /**
   * Validate capability value
   */
  validateCapabilityValue(capabilityName, value) {
    return require('./cluster-cap-map').validateCapabilityValue(capabilityName, value);
  }

  /**
   * Get cluster name from ID
   */
  getClusterName(clusterId) {
    for (const [name, id] of Object.entries(this.clusters)) {
      if (id === clusterId) return name;
    }
    return `UNKNOWN_${clusterId.toString(16).toUpperCase()}`;
  }

  /**
   * Get standard clusters for device type
   */
  getStandardClusters(deviceType) {
    const clusters = {
      switch: [this.clusters.ON_OFF, this.clusters.BASIC, this.clusters.POWER_CONFIG],
      dimmer: [this.clusters.ON_OFF, this.clusters.LEVEL_CONTROL, this.clusters.BASIC],
      light: [this.clusters.ON_OFF, this.clusters.LEVEL_CONTROL, this.clusters.COLOR_CONTROL, this.clusters.BASIC],
      sensor: [this.clusters.BASIC, this.clusters.POWER_CONFIG],
      cover: [this.clusters.WINDOW_COVERING, this.clusters.BASIC],
      lock: [this.clusters.DOOR_LOCK, this.clusters.BASIC],
      thermostat: [this.clusters.THERMOSTAT, this.clusters.BASIC]
    };
    
    return clusters[deviceType] || [this.clusters.BASIC];
  }
}

module.exports = new ClusterHelpers();
