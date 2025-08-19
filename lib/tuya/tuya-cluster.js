/**
 * Tuya-specific Zigbee cluster utilities
 * Includes the writeInteger fix from upstream
 */

class TuyaCluster {
  /**
   * Write integer value to cluster attribute
   * Fix for the "missing writeInteger" issue
   */
  static async writeInteger(cluster, attribute, value, options = {}) {
    const maxAttempts = 2;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        if (cluster.write && typeof cluster.write === 'function') {
          return await cluster.write(attribute, value, options);
        }
        if (cluster.writeAttributes && typeof cluster.writeAttributes === 'function') {
          const attributes = {}; attributes[attribute] = value;
          return await cluster.writeAttributes(attributes, options);
        }
        if (cluster.attributes && cluster.attributes[attribute]) {
          cluster.attributes[attribute].value = value; return true;
        }
        throw new Error(`Cannot write to attribute ${attribute} on cluster ${cluster.id}`);
      } catch (error) {
        const isTimeout = /timeout/i.test(String(error && error.message));
        const unsupported = /not supported|unsupported/i.test(String(error && error.message));
        if (unsupported) { error.code = 'Unsupported'; throw error; }
        if (isTimeout && attempt === 0) {
          await new Promise(r => setTimeout(r, 50 + Math.floor(Math.random()*70)));
          continue;
        }
        error.code = isTimeout ? 'ZigbeeTimeout' : 'WriteFailed';
        throw error;
      }
    }
  }

  /**
   * Read integer value from cluster attribute
   */
  static async readInteger(cluster, attribute, options = {}) {
    try {
      if (cluster.read && typeof cluster.read === 'function') {
        return await cluster.read(attribute, options);
      }
      
      if (cluster.readAttributes && typeof cluster.readAttributes === 'function') {
        const result = await cluster.readAttributes([attribute], options);
        return result[attribute];
      }
      
      if (cluster.attributes && cluster.attributes[attribute]) {
        return cluster.attributes[attribute].value;
      }
      
      throw new Error(`Cannot read from attribute ${attribute} on cluster ${cluster.id}`);
    } catch (error) {
      console.error('TuyaCluster.readInteger failed:', error);
      throw error;
    }
  }

  /**
   * Configure reporting for cluster attribute
   */
  static async configureReporting(cluster, attribute, options = {}) {
    const defaultOptions = {
      minInterval: 0,
      maxInterval: 300,
      reportableChange: 1
    };
    
    const config = { ...defaultOptions, ...options };
    
    try {
      if (cluster.configureReporting && typeof cluster.configureReporting === 'function') {
        return await cluster.configureReporting(attribute, config);
      }
      
      throw new Error(`Cluster ${cluster.id} does not support configureReporting`);
    } catch (error) {
      console.error('TuyaCluster.configureReporting failed:', error);
      throw error;
    }
  }

  /**
   * Get cluster information
   */
  static getClusterInfo(cluster) {
    return {
      id: cluster.id,
      name: cluster.name,
      attributes: Object.keys(cluster.attributes || {}),
      commands: Object.keys(cluster.commands || {}),
      supportsWrite: typeof cluster.write === 'function',
      supportsRead: typeof cluster.read === 'function',
      supportsReporting: typeof cluster.configureReporting === 'function'
    };
  }
}

module.exports = TuyaCluster;
