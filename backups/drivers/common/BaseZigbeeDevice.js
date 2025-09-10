const { ZigbeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class BaseZigbeeDevice extends ZigbeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('Device initialized');
    
    // Debug mode based on settings
    if (this.getSetting('debug_enabled')) {
      this.enableDebug();
      this.printNode();
    }
    
    try {
      await this.registerCapabilities();
      await this.initializeDevice();
    } catch (error) {
      this.error('Initialization failed:', error);
    }
  }
  
  async registerCapabilities() {
    // To be implemented by child classes
  }
  
  async initializeDevice() {
    // To be implemented by child classes
  }
  
  async safeReadAttributes(cluster, attributes) {
    try {
      return await this.zclNode.endpoints[1].clusters[cluster].readAttributes(attributes);
    } catch (error) {
      this.error(`Failed to read attributes from ${cluster}:`, error);
      return null;
    }
  }
}

module.exports = BaseZigbeeDevice;
