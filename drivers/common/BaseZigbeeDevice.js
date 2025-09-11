const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const path = require('path');
const fs = require('fs').promises;

class BaseZigbeeDevice extends ZigBeeDevice {
  /**
   * Enhanced device initialization for SDK3 compatibility
   */
  async onNodeInit({ zclNode }) {
    this.zclNode = zclNode;
    this._patchesApplied = false;
    this._initializationRetries = 0;
    this._maxRetries = 3;
    
    // SDK3 logging compatibility
    this.logLevel = this.getSetting('log_level') || 'info';
    
    // Enable debug mode if configured
    if (this.getSetting('debug_enabled')) {
      this.enableDebug();
      this.printNode();
    }
    
    try {
      await this.initializeWithRetries();
      this.log('Device initialized successfully with SDK3 enhancements');
    } catch (error) {
      this.error('Device initialization failed after retries:', error);
      throw error;
    }
  }

  /**
   * Initialization with retry logic for better reliability
   */
  async initializeWithRetries() {
    while (this._initializationRetries < this._maxRetries) {
      try {
        await this.applyUserPatches();
        await this.registerCapabilities();
        await this.configureReporting();
        await this.initializeDevice();
        
        // Validate initialization
        if (await this.validateInitialization()) {
          return; // Success
        }
        throw new Error('Initialization validation failed');
        
      } catch (error) {
        this._initializationRetries++;
        this.error(`Initialization attempt ${this._initializationRetries} failed:`, error);
        
        if (this._initializationRetries >= this._maxRetries) {
          throw error;
        }
        
        // Exponential backoff
        await this.delay(Math.pow(2, this._initializationRetries) * 1000);
      }
    }
  }

  /**
   * Validate device initialization
   */
  async validateInitialization() {
    try {
      // Check if essential capabilities are registered
      const essentialCaps = this.getCapabilities().filter(cap => 
        cap.startsWith('alarm_') || cap.startsWith('measure_') || cap === 'onoff'
      );
      
      if (essentialCaps.length === 0) {
        this.log('Warning: No essential capabilities found');
        return false;
      }
      
      // Check cluster availability
      if (!this.zclNode || !this.zclNode.endpoints) {
        this.error('ZCL node not properly initialized');
        return false;
      }
      
      return true;
    } catch (error) {
      this.error('Validation error:', error);
      return false;
    }
  }

  /**
   * Enhanced delay utility
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Apply user patches from forum posts and community contributions
   */
  async applyUserPatches() {
    if (this._patchesApplied) return;
    
    try {
      const modelId = this.getData().modelId;
      const patchesPath = path.join(__dirname, '../../resources/user-patches.json');
      
      // Check if patches file exists
      try {
        await fs.access(patchesPath);
      } catch {
        this.log('No user patches found');
        return;
      }
      
      const patchesData = require(patchesPath);
      const devicePatches = patchesData[modelId] || [];
      
      if (devicePatches.length === 0) {
        this.log(`No patches found for model ${modelId}`);
        return;
      }
      
      this.log(`Applying ${devicePatches.length} patches for ${modelId}`);
      
      for (const patch of devicePatches) {
        try {
          const patchFn = new Function('device', 'zclNode', 'CLUSTER', patch.code);
          patchFn.call(this, this, this.zclNode, CLUSTER);
          this.log(`Applied patch: ${patch.description}`);
        } catch (error) {
          this.error(`Failed to apply patch: ${patch.description}`, error);
        }
      }
      
      this._patchesApplied = true;
    } catch (error) {
      this.error('Error applying user patches:', error);
    }
  }
  
  /**
   * Register device capabilities
   * To be implemented by child classes
   */
  async registerCapabilities() {
    // Override in child classes
  }
  
  /**
   * Configure device reporting
   * To be implemented by child classes
   */
  async configureReporting() {
    // Override in child classes
  }
  
  /**
   * Additional device initialization
   * To be implemented by child classes
   */
  async initializeDevice() {
    // Override in child classes
  }
  
  /**
   * Safe attribute reading with error handling
   */
  async safeReadAttributes(cluster, attributes, endpointId = 1) {
    try {
      const endpoint = this.zclNode.endpoints[endpointId];
      if (!endpoint) {
        throw new Error(`Endpoint ${endpointId} not found`);
      }
      
      const clusterObj = endpoint.clusters[cluster];
      if (!clusterObj) {
        throw new Error(`Cluster ${cluster} not found on endpoint ${endpointId}`);
      }
      
      return await clusterObj.readAttributes(attributes);
    } catch (error) {
      this.error(`Failed to read attributes from ${cluster}:`, error);
      return null;
    }
  }
  
  /**
   * Register a capability with automatic reporting configuration
   */
  async registerCapability(capability, cluster, config) {
    if (!config) {
      this.registerCapabilityListener(capability, () => {
        this.error(`No configuration provided for capability: ${capability}`);
        return Promise.reject(new Error(`No configuration for ${capability}`));
      });
      return;
    }
    
    // Register getter
    if (config.get) {
      this.registerCapabilityListener(capability, async () => {
        try {
          const result = await this.safeReadAttributes(cluster, [config.get]);
          if (result && result[config.get] !== undefined) {
            const value = config.reportParser 
              ? config.reportParser(result[config.get])
              : result[config.get];
            this.setCapabilityValue(capability, value);
          }
        } catch (error) {
          this.error(`Error getting ${capability}:`, error);
          throw error;
        }
      });
    }
    
    // Register setter if provided
    if (config.set) {
      this.registerCapabilityListener(capability, async (value) => {
        try {
          const payload = config.setParser ? config.setParser(value) : value;
          await this.zclNode.endpoints[1].clusters[cluster].writeAttributes({
            [config.set]: payload
          });
        } catch (error) {
          this.error(`Error setting ${capability}:`, error);
          throw error;
        }
      });
    }
    
    // Configure reporting if specified
    if (config.report && config.reportParser) {
      await this.configureReportingForCapability(capability, cluster, config);
    }
  }
  
  /**
   * Configure reporting for a capability
   */
  async configureReportingForCapability(capability, cluster, config) {
    if (!config.report || !config.reportParser) return;
    
    try {
      const endpoint = this.zclNode.endpoints[1];
      const clusterObj = endpoint.clusters[cluster];
      
      if (!clusterObj) {
        this.error(`Cluster ${cluster} not found for capability ${capability}`);
        return;
      }
      
      // Default reporting configuration
      const reportConfig = {
        attribute: config.report,
        minInterval: 0, // No minimum reporting interval
        maxInterval: 300, // 5 minutes default max interval
        minChange: 1, // Report any change by default
      };
      
      // Apply custom reporting configuration if provided
      if (typeof config.reportConfig === 'object') {
        Object.assign(reportConfig, config.reportConfig);
      }
      
      await clusterObj.configureReporting(reportConfig.attribute, {
        minInterval: reportConfig.minInterval,
        maxInterval: reportConfig.maxInterval,
        minChange: reportConfig.minChange,
      });
      
      // Listen for reports
      clusterObj.on('report', (report) => {
        if (report.attributeList && report.attributeList[reportConfig.attribute] !== undefined) {
          const value = config.reportParser(report.attributeList[reportConfig.attribute]);
          this.setCapabilityValue(capability, value);
        }
      });
      
      this.log(`Configured reporting for ${capability} on cluster ${cluster}`);
    } catch (error) {
      this.error(`Failed to configure reporting for ${capability}:`, error);
    }
  }
  
  /**
   * Handle device deletion
   */
  async onDeleted() {
    this.log('Device removed');
    // Cleanup any resources if needed
  }
}

module.exports = BaseZigbeeDevice;
