'use strict';

/**
 * RobustInitializer - Defensive initialization with retry/backoff
 * Implements ChatGPT recommendations + Homey SDK3 best practices
 * 
 * Features:
 * - Retry/backoff for missing zclNode
 * - Safe cluster binding with error handling
 * - Verbose logging for diagnostics
 * - Backwards compatibility (addCapability)
 */

const Logger = require('./Logger');

class RobustInitializer {
  
  constructor(device) {
    this.device = device;
    this.logger = Logger.createLogger(device, 'RobustInitializer');
    this.retryDelays = [1000, 3000, 10000]; // ms
  }

  /**
   * Robust onNodeInit wrapper with retry logic
   * @param {Object} nodeContext - { zclNode, firstInit }
   * @param {Function} initCallback - Actual initialization function
   */
  async robustInit(nodeContext = {}, initCallback) {
    const zclNode = this.extractZclNode(nodeContext);
    
    if (!zclNode) {
      this.logger.warn('zclNode not available, starting retry sequence...');
      return this.retryInit(nodeContext, initCallback);
    }
    
    this.logger.info('zclNode available, proceeding with initialization');
    
    try {
      // Execute actual initialization
      await initCallback(zclNode, nodeContext);
      this.logger.success('Initialization complete');
      return true;
    } catch (err) {
      this.logger.error('Initialization failed:', err.message);
      this.logger.debug('Stack:', err.stack);
      throw err;
    }
  }

  /**
   * Extract zclNode from various sources
   */
  extractZclNode(nodeContext) {
    return nodeContext?.zclNode 
      || this.device.zclNode 
      || (this.device.node && this.device.node.zclNode) 
      || null;
  }

  /**
   * Retry initialization with exponential backoff
   */
  async retryInit(nodeContext, initCallback) {
    for (let i = 0; i < this.retryDelays.length; i++) {
      const delay = this.retryDelays[i];
      this.logger.info(`Retry ${i + 1}/${this.retryDelays.length} in ${delay}ms...`);
      
      await this.sleep(delay);
      
      const zclNode = this.extractZclNode(nodeContext);
      if (zclNode) {
        this.logger.success(`zclNode became available after ${this.retryDelays.slice(0, i + 1).join('/')}ms`);
        return this.robustInit(nodeContext, initCallback);
      }
    }
    
    this.logger.error('zclNode still not available after all retries');
    this.logger.warn('Continuing with limited initialization...');
    return false;
  }

  /**
   * Safe cluster binding with error handling
   */
  async safeBindCluster(endpoint, clusterName, options = {}) {
    const {
      coordinator = 'coordinator',
      required = false
    } = options;

    try {
      const cluster = endpoint?.clusters?.[clusterName];
      
      if (!cluster) {
        if (required) {
          this.logger.error(`Required cluster ${clusterName} not found on endpoint ${endpoint?.number}`);
          throw new Error(`Required cluster ${clusterName} missing`);
        }
        this.logger.debug(`Optional cluster ${clusterName} not present`);
        return false;
      }

      this.logger.debug(`Binding cluster ${clusterName} to ${coordinator}...`);
      await cluster.bind(coordinator);
      this.logger.success(`✅ Cluster ${clusterName} bound`);
      return true;
      
    } catch (err) {
      this.logger.error(`Failed to bind ${clusterName}:`, err.message);
      if (required) throw err;
      return false;
    }
  }

  /**
   * Safe configure reporting with error handling
   */
  async safeConfigureReporting(endpoint, clusterName, attributeName, minInterval, maxInterval, reportableChange, options = {}) {
    const { required = false } = options;

    try {
      const cluster = endpoint?.clusters?.[clusterName];
      
      if (!cluster) {
        if (required) {
          throw new Error(`Required cluster ${clusterName} missing for reporting`);
        }
        this.logger.debug(`Cluster ${clusterName} not present for reporting`);
        return false;
      }

      this.logger.debug(`Configuring reporting: ${clusterName}.${attributeName} [${minInterval}, ${maxInterval}, ${reportableChange}]`);
      
      await cluster.configureReporting(attributeName, minInterval, maxInterval, reportableChange);
      
      this.logger.success(`✅ Reporting configured: ${clusterName}.${attributeName}`);
      return true;
      
    } catch (err) {
      this.logger.error(`Failed to configure reporting ${clusterName}.${attributeName}:`, err.message);
      if (required) throw err;
      return false;
    }
  }

  /**
   * Safe attribute read with error handling
   */
  async safeReadAttributes(endpoint, clusterName, attributes, options = {}) {
    const {
      required = false,
      timeout = 5000
    } = options;

    try {
      const cluster = endpoint?.clusters?.[clusterName];
      
      if (!cluster) {
        if (required) {
          throw new Error(`Required cluster ${clusterName} missing for read`);
        }
        this.logger.debug(`Cluster ${clusterName} not present for reading`);
        return null;
      }

      this.logger.debug(`Reading attributes: ${clusterName}.${JSON.stringify(attributes)}`);
      
      const promise = cluster.readAttributes(attributes);
      const result = await this.withTimeout(promise, timeout);
      
      this.logger.debug('✅ Attributes read:', JSON.stringify(result));
      return result;
      
    } catch (err) {
      this.logger.error(`Failed to read ${clusterName}.${JSON.stringify(attributes)}:`, err.message);
      if (required) throw err;
      return null;
    }
  }

  /**
   * Backwards compatibility - add capabilities if missing
   */
  async ensureCapabilities(capabilities) {
    if (!Array.isArray(capabilities)) {
      capabilities = [capabilities];
    }

    for (const cap of capabilities) {
      try {
        if (!this.device.hasCapability(cap)) {
          this.logger.info(`Adding missing capability: ${cap}`);
          await this.device.addCapability(cap);
          this.logger.success(`✅ Capability added: ${cap}`);
        } else {
          this.logger.debug(`Capability already present: ${cap}`);
        }
      } catch (err) {
        this.logger.error(`Failed to add capability ${cap}:`, err.message);
      }
    }
  }

  /**
   * Promise with timeout
   */
  async withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
      )
    ]);
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

}

module.exports = RobustInitializer;
