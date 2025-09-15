'use strict';

const { ZigbeeDevice } = require('homey-zigbeedriver');
const { Cluster, CLUSTER } = require("zigbee-clusters");
const { debug, ClusterCapabilityConfiguration } = require('zigbee-clusters');

// Enable debug logging for development
// debug(true);

/**
 * Base class for all Tuya Zigbee devices
 * @extends ZigbeeDevice
 */
class BaseZigbeeDevice extends ZigbeeDevice {
  
  /**
   * Device initialization
   * @param {Object} node - The Zigbee node
   * @param {Object} client - The Zigbee client
   * @param {Object} [opts] - Additional options
   */
  async onNodeInit({ zclNode, node, ...opts } = {}) {
    this.log(`Initializing ${this.getName()} (${this.getStoreValue('modelId') || 'unknown model'})`);
    
    // Store references to the node and zclNode for later use
    this._zclNode = zclNode;
    this._node = node;
    
    // Register device capabilities
    await this.registerCapabilities();
    
    // Configure device settings
    await this.configureDevice();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Perform any post-initialization setup
    await this.onReady();
    
    this.log('Device initialized successfully');
  }
  
  /**
   * Register device capabilities
   * Should be implemented by subclasses
   */
  async registerCapabilities() {
    // Base implementation does nothing
    // Subclasses should override this method to register their capabilities
  }
  
  /**
   * Configure device settings
   * Can be overridden by subclasses
   */
  async configureDevice() {
    try {
      // Configure reporting for basic attributes
      await this.configureReporting({
        endpoint: 1,
        cluster: CLUSTER.BASIC,
        attributes: [
          { attribute: 'zclVersion', minInterval: 0, maxInterval: 3600, minChange: 0 },
          { attribute: 'appVersion', minInterval: 0, maxInterval: 3600, minChange: 0 },
          { attribute: 'stackVersion', minInterval: 0, maxInterval: 3600, minChange: 0 },
          { attribute: 'hwVersion', minInterval: 0, maxInterval: 3600, minChange: 0 },
          { attribute: 'manufacturerName', minInterval: 0, maxInterval: 3600, minChange: 0 },
          { attribute: 'modelId', minInterval: 0, maxInterval: 3600, minChange: 0 },
          { attribute: 'dateCode', minInterval: 0, maxInterval: 3600, minChange: 0 },
          { attribute: 'powerSource', minInterval: 0, maxInterval: 3600, minChange: 0 },
        ]
      });
    } catch (error) {
      this.error('Error configuring basic cluster reporting:', error);
    }
  }
  
  /**
   * Set up event listeners
   * Can be overridden by subclasses
   */
  setupEventListeners() {
    // Listen for device settings changes
    this.registerSettingListener('setting_changed', (newValue, oldValue) => {
      this.log(`Setting changed: ${newValue.key} = ${newValue.newValue} (was: ${newValue.oldValue})`);
      return this.onSettings({ [newValue.key]: newValue.newValue }, [newValue.key]);
    });
    
    // Listen for device online/offline events
    this.registerCapabilityListener('alarm_battery', async (value, opts) => {
      this.log('Battery alarm:', value);
    });
  }
  
  /**
   * Called when the device is ready
   * Can be overridden by subclasses
   */
  async onReady() {
    // Base implementation does nothing
  }
  
  /**
   * Configure attribute reporting for a cluster
   * @param {Object} options - Reporting options
   * @param {number} options.endpoint - The endpoint to configure
   * @param {string|number} options.cluster - The cluster to configure
   * @param {Array} options.attributes - Array of attribute reporting configurations
   * @returns {Promise} A promise that resolves when reporting is configured
   */
  async configureReporting({ endpoint, cluster, attributes }) {
    const clusterName = typeof cluster === 'string' ? cluster : Cluster.NAME[cluster] || cluster;
    this.log(`Configuring reporting for ${clusterName} cluster on endpoint ${endpoint}`);
    
    try {
      const clusterInstance = this.zclNode.endpoints[endpoint].clusters[clusterName];
      if (!clusterInstance) {
        throw new Error(`Cluster ${clusterName} not found on endpoint ${endpoint}`);
      }
      
      // Configure reporting for each attribute
      for (const attr of attributes) {
        const { attribute, minInterval, maxInterval, minChange } = attr;
        const attributeName = Cluster.ATTRIBUTE_NAME[attribute] || attribute;
        
        this.log(`  - ${attributeName}: min=${minInterval}s, max=${maxInterval}s, change=${minChange}`);
        
        await clusterInstance.configureReporting({
          attributeId: attribute,
          minInterval,
          maxInterval,
          minChange,
        });
      }
      
      return true;
    } catch (error) {
      this.error(`Error configuring reporting for ${clusterName}:`, error);
      throw error;
    }
  }
  
  /**
   * Register a capability with the device
   * @param {string} capability - The capability to register
   * @param {string|number} cluster - The cluster that provides this capability
   * @param {Object} options - Capability options
   * @param {string|number} [options.attribute] - The attribute to bind to the capability
   * @param {Function} [options.get] - Function to get the capability value
   * @param {Function} [options.set] - Function to set the capability value
   * @param {Function} [options.report] - Function to handle attribute reports
   * @param {Function} [options.parser] - Function to parse attribute values
   * @param {Function} [options.parserOpts] - Options for the parser
   */
  registerCapability(capability, cluster, options = {}) {
    const clusterName = typeof cluster === 'string' ? cluster : Cluster.NAME[cluster] || cluster;
    const attribute = options.attribute || capability;
    const attributeName = Cluster.ATTRIBUTE_NAME[attribute] || attribute;
    
    this.log(`Registering capability '${capability}' from ${clusterName}.${attributeName}`);
    
    // Register the capability with the device
    this.registerCapability(capability, {
      get: options.get || this._defaultCapabilityGetter(cluster, attribute, options.parser, options.parserOpts),
      set: options.set || this._defaultCapabilitySetter(cluster, attribute, options.parser, options.parserOpts),
      report: options.report || this._defaultCapabilityReporter(capability, cluster, attribute, options.parser, options.parserOpts),
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 0, // No minimum reporting interval
          maxInterval: 300, // Maximum reporting interval (5 minutes)
          minChange: options.minChange || 0, // Report any change by default
        },
      },
    });
  }
  
  /**
   * Default capability getter
   * @private
   */
  _defaultCapabilityGetter(cluster, attribute, parser, parserOpts) {
    return async () => {
      try {
        const value = await this.zclNode.endpoints[1].clusters[cluster].readAttribute(attribute);
        return parser ? parser(value, parserOpts) : value;
      } catch (error) {
        this.error(`Error getting capability ${attribute}:`, error);
        throw error;
      }
    };
  }
  
  /**
   * Default capability setter
   * @private
   */
  _defaultCapabilitySetter(cluster, attribute, parser, parserOpts) {
    return async (value) => {
      try {
        const parsedValue = parser ? parser(value, parserOpts) : value;
        await this.zclNode.endpoints[1].clusters[cluster].writeAttribute(attribute, parsedValue);
        return parsedValue;
      } catch (error) {
        this.error(`Error setting capability ${attribute} to ${value}:`, error);
        throw error;
      }
    };
  }
  
  /**
   * Default capability reporter
   * @private
   */
  _defaultCapabilityReporter(capability, cluster, attribute, parser, parserOpts) {
    return (value) => {
      try {
        const parsedValue = parser ? parser(value, parserOpts) : value;
        this.log(`Received report for ${capability}:`, parsedValue);
        this.setCapabilityValue(capability, parsedValue).catch(this.error);
        return parsedValue;
      } catch (error) {
        this.error(`Error processing report for ${capability}:`, error);
        throw error;
      }
    };
  }
  
  /**
   * Get the Zigbee node
   * @returns {Object} The Zigbee node
   */
  get node() {
    return this._node;
  }
  
  /**
   * Get the ZCL node
   * @returns {Object} The ZCL node
   */
  get zclNode() {
    return this._zclNode;
  }
  
  /**
   * Handle device settings changes
   * @param {Object} settings - The new settings
   * @param {Array} changedKeys - Array of changed setting keys
   * @returns {Promise} A promise that resolves when the settings have been applied
   */
  async onSettings(settings, changedKeys) {
    this.log('Settings changed:', settings, 'Changed keys:', changedKeys);
    
    // Apply settings to the device
    for (const key of changedKeys) {
      try {
        await this.applySetting(key, settings[key]);
      } catch (error) {
        this.error(`Error applying setting ${key}:`, error);
      }
    }
    
    return super.onSettings(settings, changedKeys);
  }
  
  /**
   * Apply a single setting to the device
   * @param {string} key - The setting key
   * @param {*} value - The setting value
   * @returns {Promise} A promise that resolves when the setting has been applied
   */
  async applySetting(key, value) {
    this.log(`Applying setting ${key} = ${value}`);
    
    // Base implementation does nothing
    // Subclasses should override this method to apply settings to the device
  }
  
  /**
   * Handle device deleted event
   */
  async onDeleted() {
    this.log('Device deleted');
    // Clean up any resources
    await super.onDeleted();
  }
}

module.exports = BaseZigbeeDevice;
