/**
 * Main library index - exports all modules
 */

// Common utilities
const diagnostics = require('./common/diagnostics');
const deviceHelpers = require('./common/device-helpers');
const naming = require('./common/naming');

// Zigbee utilities
const endpointUtils = require('./zigbee/endpoint-utils');
const interview = require('./zigbee/interview');
const reporting = require('./zigbee/reporting');

// Tuya-specific modules
const tuyaConvert = require('./tuya/convert');
const tuyaFingerprints = require('./tuya/fingerprints');
const tuyaCluster = require('./tuya/tuya-cluster');

// Validation utilities
const schemaValidator = require('./validation/schema-validator');

// Error handling
const errorHandler = require('./errors/error-handler');

// Capability management
const capabilityManager = require('./capabilities/capability-manager');

// Image management
const imageManager = require('./images/image-manager');

// Testing utilities
const testRunner = require('./testing/test-runner');

// Overlay management
const overlayManager = require('./tuya/overlay-manager');

module.exports = {
  // Common
  diagnostics,
  deviceHelpers,
  naming,
  
  // Zigbee
  endpointUtils,
  interview,
  reporting,
  
  // Tuya
  tuyaConvert,
  tuyaFingerprints,
  tuyaCluster,
  overlayManager,
  
  // Utilities
  schemaValidator,
  errorHandler,
  capabilityManager,
  imageManager,
  testRunner
};
