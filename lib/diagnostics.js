/**
 * Diagnostics utilities for unknown devices
 * Dump Zigbee interview data for analysis
 */

class Diagnostics {
  /**
   * Log complete Zigbee interview data for unknown devices
   */
  static logInterview(device) {
    try {
      const ep0 = device?.zclNode?.endpoints?.[0];
      if (!ep0) {
        device.log('❌ No Zigbee endpoints found');
        return;
      }

      const mf = device.getSetting('zb_manufacturer') || device.manufacturerName || 'Unknown';
      const pid = device.getSetting('zb_productid') || device.productId || 'Unknown';
      const model = device.getSetting('zb_model') || device.modelId || 'Unknown';

      const interviewData = {
        manufacturer: mf,
        productId: pid,
        model: model,
        endpoints: Object.keys(device.zclNode.endpoints || {}),
        clusters: this.getClusterInfo(ep0),
        deviceData: device.getData(),
        capabilities: device.getCapabilities()
      };

      device.log('🔍 Zigbee interview dump:', JSON.stringify(interviewData, null, 2));
      
      // Log to file for analysis
      this.logToFile(device, interviewData);
      
    } catch (error) {
      device.error('Diagnostics failed:', error);
    }
  }

  /**
   * Get cluster information from endpoint
   */
  static getClusterInfo(endpoint) {
    const clusters = {};
    
    try {
      for (const [clusterName, cluster] of Object.entries(endpoint.clusters || {})) {
        clusters[clusterName] = {
          id: cluster.id,
          attributes: Object.keys(cluster.attributes || {}),
          commands: Object.keys(cluster.commands || {})
        };
      }
    } catch (error) {
      clusters.error = error.message;
    }
    
    return clusters;
  }

  /**
   * Log interview data to file for analysis
   */
  static logToFile(device, data) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        deviceId: device.getData().id,
        ...data
      };

      const logFile = 'UNKNOWN_DEVICES_LOG.jsonl';
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
      
      device.log(`📝 Interview logged to ${logFile}`);
    } catch (error) {
      device.log('Failed to log to file:', error.message);
    }
  }

  /**
   * Check if diagnostics should be enabled
   */
  static isEnabled() {
    return process.env.ENABLE_DIAGNOSTICS === '1' || 
           process.env.NODE_ENV === 'development';
  }

  /**
   * Generate diagnostic report for device
   */
  static generateReport(device) {
    if (!this.isEnabled()) return null;
    
    return {
      deviceId: device.getData().id,
      manufacturer: device.getData().manufacturer,
      model: device.getData().model,
      capabilities: device.getCapabilities(),
      timestamp: new Date().toISOString(),
      zigbeeInfo: {
        manufacturer: device.getSetting('zb_manufacturer'),
        productId: device.getSetting('zb_productid'),
        model: device.getSetting('zb_model')
      }
    };
  }
}

module.exports = Diagnostics;


