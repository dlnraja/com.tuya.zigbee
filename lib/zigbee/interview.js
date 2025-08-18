/**
 * Zigbee interview utilities
 */

class Interview {
  static async setupDevice(device) {
    try {
      // Basic device interview
      await this.interviewBasic(device);
      
      // Setup reporting based on device type
      await this.setupReporting(device);
      
      device.log('✅ Device interview completed successfully');
      return true;
    } catch (error) {
      device.error('❌ Device interview failed:', error);
      return false;
    }
  }
  
  static async interviewBasic(device) {
    // Basic cluster interview
    const basicCluster = device.zclNode.endpoints[1].clusters.basic;
    if (basicCluster) {
      try {
        const attributes = await basicCluster.readAttributes([
          'manufacturerName',
          'modelId',
          'productId'
        ]);
        
        device.log('Basic cluster attributes:', attributes);
      } catch (error) {
        device.log('Basic cluster read failed:', error.message);
      }
    }
  }
  
  static async setupReporting(device) {
    // Setup reporting for relevant clusters
    const endpoint = device.zclNode.endpoints[1];
    
    if (endpoint.clusters.genOnOff) {
      await this.setupOnOffReporting(device, endpoint.clusters.genOnOff);
    }
    
    if (endpoint.clusters.genLevelCtrl) {
      await this.setupLevelReporting(device, endpoint.clusters.genLevelCtrl);
    }
  }
  
  static async setupOnOffReporting(device, cluster) {
    try {
      await cluster.configureReporting('onOff', {
        minInterval: 0,
        maxInterval: 300,
        reportableChange: 1
      });
      device.log('OnOff reporting configured');
    } catch (error) {
      device.log('OnOff reporting setup failed:', error.message);
    }
  }
  
  static async setupLevelReporting(device, cluster) {
    try {
      await cluster.configureReporting('currentLevel', {
        minInterval: 0,
        maxInterval: 300,
        reportableChange: 1
      });
      device.log('Level reporting configured');
    } catch (error) {
      device.log('Level reporting setup failed:', error.message);
    }
  }
}

module.exports = Interview;
