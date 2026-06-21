'use strict';

/**
 * CONVERTERS INDEX
 *
 * Central export point for all converter modules.
 * Compatible with zigbee-herdsman-converters patterns.
 *
 * @version 9.0.40
 */

const TuyaDeviceDefinitions = require('./TuyaDeviceDefinitions');
const ValueConverterRegistry = require('./ValueConverterRegistry');

module.exports = {
  // Main exports
  ...TuyaDeviceDefinitions,

  // Module references
  TuyaDeviceDefinitions,
  ValueConverterRegistry,

  // Convenience re-exports from ValueConverterRegistry
  converters: ValueConverterRegistry.converters,
  common: ValueConverterRegistry.common,
  presetConverters: ValueConverterRegistry.presetConverters,
};
