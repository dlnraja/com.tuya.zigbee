/**
 * 🔧 Cluster Helpers - Universal Tuya Zigbee
 * ZCL cluster binding and attribute helpers
 */

const CLUSTER_IDS = {
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

const ATTRIBUTE_IDS = {
  // Basic attributes
  ZCL_VERSION: 0x0000,
  APPLICATION_VERSION: 0x0001,
  STACK_VERSION: 0x0002,
  HARDWARE_VERSION: 0x0003,
  MANUFACTURER_NAME: 0x0004,
  MODEL_IDENTIFIER: 0x0005,
  DATE_CODE: 0x0006,
  POWER_SOURCE: 0x0007,
  
  // On/Off attributes
  ON_OFF: 0x0000,
  
  // Level Control attributes
  CURRENT_LEVEL: 0x0000,
  REMAINING_TIME: 0x0001,
  ON_OFF_TRANSITION_TIME: 0x0010,
  ON_LEVEL: 0x0011,
  
  // Color Control attributes
  CURRENT_HUE: 0x0000,
  CURRENT_SATURATION: 0x0001,
  CURRENT_X: 0x0003,
  CURRENT_Y: 0x0004,
  COLOR_TEMPERATURE: 0x0007,
  
  // Measurement attributes
  MEASURED_VALUE: 0x0000,
  MIN_MEASURED_VALUE: 0x0001,
  MAX_MEASURED_VALUE: 0x0002,
  TOLERANCE: 0x0003,
  
  // Tuya specific
  TUYA_DP_ID: 0x0000,
  TUYA_DP_TYPE: 0x0001,
  TUYA_DP_VALUE: 0x0002
};

class ClusterHelpers {
  constructor() {
    this.clusters = CLUSTER_IDS;
    this.attributes = ATTRIBUTE_IDS;
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
   * Get attribute name from ID
   */
  getAttributeName(attributeId) {
    for (const [name, id] of Object.entries(this.attributes)) {
      if (id === attributeId) return name;
    }
    return `UNKNOWN_${attributeId.toString(16).toUpperCase()}`;
  }

  /**
   * Create cluster binding
   */
  createClusterBinding(clusterId, endpointId = 1) {
    return {
      clusterId,
      endpointId,
      clusterName: this.getClusterName(clusterId)
    };
  }

  /**
   * Create attribute binding
   */
  createAttributeBinding(clusterId, attributeId, endpointId = 1) {
    return {
      clusterId,
      attributeId,
      endpointId,
      clusterName: this.getClusterName(clusterId),
      attributeName: this.getAttributeName(attributeId)
    };
  }

  /**
   * Validate cluster binding
   */
  validateClusterBinding(binding) {
    const required = ['clusterId', 'endpointId'];
    const missing = required.filter(field => !binding[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    
    if (!this.clusters[binding.clusterId] && !Object.values(this.clusters).includes(binding.clusterId)) {
      throw new Error(`Invalid cluster ID: ${binding.clusterId}`);
    }
    
    return true;
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

  /**
   * Create Tuya DP binding
   */
  createTuyaDPBinding(dpId, dpType, endpointId = 1) {
    return {
      clusterId: this.clusters.MANU_TUYA,
      attributeId: this.attributes.TUYA_DP_ID,
      endpointId,
      dpId,
      dpType,
      clusterName: 'MANU_TUYA',
      attributeName: 'TUYA_DP_ID'
    };
  }
}

module.exports = new ClusterHelpers();
