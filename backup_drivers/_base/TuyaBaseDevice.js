const { ZigbeeDevice } = require('homey-zigbeedriver');
const { Cluster, CLUSTER } = require("zigbee-clusters");

/**
 * Base class for all Tuya Zigbee devices
 * Handles datapoints, sleep devices, retry logic, and common functionality
 */
class TuyaBaseDevice extends ZigbeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.log('🚀 Initializing Tuya device...');
    
    // Enable debug if needed
    if (this.getSetting('debug_enabled')) {
      this.enableDebug();
      this.printNode();
    }
    
    // Store zclNode reference
    this.zclNode = zclNode;
    
    // Initialize core features
    await this.initializeTuyaDatapoints();
    await this.setupSleepDeviceHandling();
    await this.setupRetryLogic();
    await this.registerCapabilities();
    
    // Device-specific initialization
    await this.onTuyaInit();
    
    this.log('✅ Device initialization complete');
  }
  
  /**
   * Initialize Tuya-specific datapoint handling
   */
  async initializeTuyaDatapoints() {
    const endpoint = this.zclNode.endpoints[1];
    
    // Check for Tuya manufacturer cluster (0xEF00)
    if (endpoint && endpoint.clusters['manuSpecificTuya']) {
      const tuyaCluster = endpoint.clusters['manuSpecificTuya'];
      
      // Listen for datapoint updates
      tuyaCluster.on('datapoint', this.onTuyaDatapoint.bind(this));
      
      // Get datapoint mapping for this device
      this.datapointMap = this.getDatapointMap();
      
      this.log('Tuya datapoints initialized:', Object.keys(this.datapointMap));
    }
  }
  
  /**
   * Handle incoming Tuya datapoints
   */
  onTuyaDatapoint(dp, datatype, data) {
    this.log(`Received datapoint ${dp}:`, { datatype, data });
    
    const mapping = this.datapointMap[dp];
    if (mapping) {
      const { capability, converter } = mapping;
      const value = converter ? converter(data) : this.parseTuyaData(datatype, data);
      
      this.setCapabilityValue(capability, value)
        .then(() => this.log(`Updated ${capability} to ${value}`))
        .catch(err => this.error(`Failed to update ${capability}:`, err));
    } else {
      this.log(`Unknown datapoint ${dp}, consider adding to mapping`);
    }
  }
  
  /**
   * Parse Tuya data based on datatype
   */
  parseTuyaData(datatype, data) {
    switch (datatype) {
      case 0x00: // Raw
        return data;
      case 0x01: // Boolean
        return data[0] === 0x01;
      case 0x02: // Value (4 byte)
        return data.readUInt32BE(0);
      case 0x03: // String
        return data.toString();
      case 0x04: // Enum
        return data[0];
      case 0x05: // Bitmap
        return data.readUInt32BE(0);
      default:
        this.log(`Unknown datatype ${datatype}`);
        return data;
    }
  }
  
  /**
   * Send command to Tuya device
   */
  async sendTuyaCommand(dp, datatype, data) {
    const endpoint = this.zclNode.endpoints[1];
    const tuyaCluster = endpoint.clusters['manuSpecificTuya'];
    
    if (!tuyaCluster) {
      throw new Error('Tuya cluster not available');
    }
    
    const payload = {
      seq: Date.now() & 0xFFFF,
      dpValues: [{
        dp,
        datatype,
        data: Buffer.isBuffer(data) ? data : Buffer.from([data])
      }]
    };
    
    return tuyaCluster.dataRequest(payload);
  }
  
  /**
   * Setup handling for sleeping devices
   */
  async setupSleepDeviceHandling() {
    if (!this.isSleepingDevice()) return;
    
    this.commandQueue = [];
    this.isAwake = false;
    
    // Listen for device wake-up
    this.zclNode.on('online', () => {
      this.isAwake = true;
      this.log('Device woke up, processing queued commands...');
      this.processCommandQueue();
    });
    
    // Listen for device sleep
    this.zclNode.on('offline', () => {
      this.isAwake = false;
      this.log('Device went to sleep');
    });
  }
  
  /**
   * Queue command for sleeping device
   */
  queueCommand(command) {
    if (this.isSleepingDevice() && !this.isAwake) {
      this.commandQueue.push(command);
      this.log('Command queued for next wake-up');
      return Promise.resolve();
    }
    return command();
  }
  
  /**
   * Process queued commands when device wakes up
   */
  async processCommandQueue() {
    while (this.commandQueue.length > 0) {
      const command = this.commandQueue.shift();
      try {
        await command();
      } catch (err) {
        this.error('Failed to execute queued command:', err);
      }
    }
  }
  
  /**
   * Setup retry logic for commands
   */
  async setupRetryLogic() {
    this.maxRetries = this.getSetting('max_retries') || 3;
    this.retryDelay = this.getSetting('retry_delay') || 1000;
  }
  
  /**
   * Execute command with retry logic
   */
  async executeWithRetry(fn, retries = this.maxRetries) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (err) {
        this.log(`Attempt ${i + 1}/${retries} failed:`, err.message);
        if (i < retries - 1) {
          await this.delay(this.retryDelay * (i + 1));
        } else {
          throw err;
        }
      }
    }
  }
  
  /**
   * Safely read attributes from cluster
   */
  async safeReadAttributes(clusterName, attributes) {
    return this.executeWithRetry(async () => {
      const endpoint = this.zclNode.endpoints[1];
      const cluster = endpoint.clusters[clusterName];
      
      if (!cluster) {
        throw new Error(`Cluster ${clusterName} not found`);
      }
      
      return cluster.readAttributes(attributes);
    });
  }
  
  /**
   * Safely write attributes to cluster
   */
  async safeWriteAttributes(clusterName, attributes) {
    return this.executeWithRetry(async () => {
      const endpoint = this.zclNode.endpoints[1];
      const cluster = endpoint.clusters[clusterName];
      
      if (!cluster) {
        throw new Error(`Cluster ${clusterName} not found`);
      }
      
      return cluster.writeAttributes(attributes);
    });
  }
  
  /**
   * Register capabilities - to be overridden by device classes
   */
  async registerCapabilities() {
    // Override in device implementation
  }
  
  /**
   * Get datapoint mapping - to be overridden by device classes
   */
  getDatapointMap() {
    // Override in device implementation
    return {};
  }
  
  /**
   * Check if device is battery powered
   */
  isSleepingDevice() {
    // Override in device implementation if needed
    return this.zclNode.endpoints[1].clusters['genPowerCfg'] !== undefined;
  }
  
  /**
   * Device-specific initialization - to be overridden
   */
  async onTuyaInit() {
    // Override in device implementation
  }
  
  /**
   * Utility: delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Handle device deletion
   */
  async onDeleted() {
    this.log('Device deleted');
    // Clean up any intervals, listeners, etc.
  }
}

module.exports = TuyaBaseDevice;
