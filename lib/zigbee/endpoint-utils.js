/**
 * Zigbee endpoint utilities
 */

class EndpointUtils {
  /**
   * Get primary endpoint (usually endpoint 1)
   */
  static getPrimaryEndpoint(device) {
    try {
      const endpoints = device.zclNode?.endpoints || {};
      return endpoints[1] || endpoints[0] || null;
    } catch (error) {
      console.error('Failed to get primary endpoint:', error);
      return null;
    }
  }

  /**
   * Get cluster by name from endpoint
   */
  static getCluster(endpoint, clusterName) {
    try {
      return endpoint?.clusters?.[clusterName] || null;
    } catch (error) {
      console.error(`Failed to get cluster ${clusterName}:`, error);
      return null;
    }
  }

  /**
   * Check if endpoint has cluster
   */
  static hasCluster(endpoint, clusterName) {
    return this.getCluster(endpoint, clusterName) !== null;
  }

  /**
   * Get all clusters from endpoint
   */
  static getAllClusters(endpoint) {
    try {
      return Object.keys(endpoint?.clusters || {});
    } catch (error) {
      console.error('Failed to get all clusters:', error);
      return [];
    }
  }

  /**
   * Get cluster attributes
   */
  static getClusterAttributes(cluster) {
    try {
      return Object.keys(cluster?.attributes || {});
    } catch (error) {
      console.error('Failed to get cluster attributes:', error);
      return [];
    }
  }

  /**
   * Get cluster commands
   */
  static getClusterCommands(cluster) {
    try {
      return Object.keys(cluster?.commands || {});
    } catch (error) {
      console.error('Failed to get cluster commands:', error);
      return [];
    }
  }
}

module.exports = EndpointUtils;
