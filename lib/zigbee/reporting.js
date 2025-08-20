/**
 * Zigbee reporting configuration utilities
 */

class Reporting {
  static async setupDefaultReports(device, options = {}) {
    const { powerEvery = 30 } = options;
    
    try {
      // Setup basic reporting for common capabilities
      await this.setupBasicReporting(device);
      
      // Setup power reporting if device supports it
      if (device.hasCapability('measure_power')) {
        await this.setupPowerReporting(device, powerEvery);
      }
      
      device.log('✅ Default reporting configured');
      return true;
    } catch (error) {
      device.error('❌ Reporting setup failed:', error);
      return false;
    }
  }
  
  static async setupBasicReporting(device) {
    const endpoint = device.zclNode.endpoints[1];
    
    // OnOff reporting
    if (endpoint.clusters.genOnOff && device.hasCapability('onoff')) {
      await this.configureClusterReporting(device, endpoint.clusters.genOnOff, 'onOff', {
        minInterval: 0,
        maxInterval: 300,
        reportableChange: 1
      });
    }
    
    // Level reporting
    if (endpoint.clusters.genLevelCtrl && device.hasCapability('dim')) {
      await this.configureClusterReporting(device, endpoint.clusters.genLevelCtrl, 'currentLevel', {
        minInterval: 0,
        maxInterval: 300,
        reportableChange: 1
      });
    }
  }
  
  static async setupPowerReporting(device, intervalSeconds) {
    const endpoint = device.zclNode.endpoints[1];
    
    if (endpoint.clusters.haElectricalMeasurement) {
      await this.configureClusterReporting(device, endpoint.clusters.haElectricalMeasurement, 'activePower', {
        minInterval: 0,
        maxInterval: intervalSeconds,
        reportableChange: 1
      });
    }
  }
  
  static async configureClusterReporting(device, cluster, attribute, options) {
    try {
      await cluster.configureReporting(attribute, options);
      device.log(`Reporting configured for ${attribute}`);
    } catch (error) {
      device.log(`Reporting setup failed for ${attribute}:`, error.message);
    }
  }
  
  static async setupCustomReporting(device, clusterName, attribute, options) {
    const endpoint = device.zclNode.endpoints[1];
    const cluster = endpoint.clusters[clusterName];
    
    if (cluster) {
      await this.configureClusterReporting(device, cluster, attribute, options);
    } else {
      device.log(`Cluster ${clusterName} not found for custom reporting`);
    }
  }
}

module.exports = Reporting;
