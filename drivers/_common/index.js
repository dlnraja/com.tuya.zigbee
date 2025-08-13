/**
 * 🔧 Common Utilities Index - Universal Tuya Zigbee
 * Main entry point for all shared utilities
 */

const helpers = require('./lib/helpers');
const clusterHelpers = require('./clusters/cluster-helpers');
const capabilityMapper = require('./capabilities/capability-map');

// Export all utilities
module.exports = {
  helpers,
  clusterHelpers,
  capabilityMapper,
  
  // Convenience methods
  log: helpers.log.bind(helpers),
  handleError: helpers.handleError.bind(helpers),
  validateRequired: helpers.validateRequired.bind(helpers),
  debounce: helpers.debounce.bind(helpers),
  retryWithBackoff: helpers.retryWithBackoff.bind(helpers),
  healthCheck: helpers.healthCheck.bind(helpers),
  createRateLimiter: helpers.createRateLimiter.bind(helpers),
  
  // Cluster helpers
  getClusterName: clusterHelpers.getClusterName.bind(clusterHelpers),
  getAttributeName: clusterHelpers.getAttributeName.bind(clusterHelpers),
  createClusterBinding: clusterHelpers.createClusterBinding.bind(clusterHelpers),
  createAttributeBinding: clusterHelpers.createAttributeBinding.bind(clusterHelpers),
  validateClusterBinding: clusterHelpers.validateClusterBinding.bind(clusterHelpers),
  getStandardClusters: clusterHelpers.getStandardClusters.bind(clusterHelpers),
  createTuyaDPBinding: clusterHelpers.createTuyaDPBinding.bind(clusterHelpers),
  
  // Capability mapping
  getCapability: capabilityMapper.getCapability.bind(capabilityMapper),
  getCapabilitiesForDeviceType: capabilityMapper.getCapabilitiesForDeviceType.bind(capabilityMapper),
  getClustersForCapabilities: capabilityMapper.getClustersForCapabilities.bind(capabilityMapper),
  validateCapabilityValue: capabilityMapper.validateCapabilityValue.bind(capabilityMapper),
  getTuyaDPMapping: capabilityMapper.getTuyaDPMapping.bind(capabilityMapper)
};

// Version info
module.exports.VERSION = '3.3.0';
module.exports.BUILD_DATE = new Date().toISOString();
