'use strict';

/**
 * CONVERTERS INDEX
 *
 * Central export point for all converter modules.
 * Compatible with zigbee-herdsman-converters patterns.
 *
 * @version 5.2.64
 */

const TuyaDeviceDefinitions = require('./TuyaDeviceDefinitions');

module.exports = {
  // Main exports
  ...TuyaDeviceDefinitions,

  // Module references
  TuyaDeviceDefinitions,
};
