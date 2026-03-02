'use strict';

/**
 * Adapters Index
 * Central export point for all adapter modules.
 * @version 1.0.0
 */

const ZclToHomeyMap = require('./ZclToHomeyMap');
const Z2MConverterAdapter = require('./Z2MConverterAdapter');
const ZHAQuirkAdapter = require('./ZHAQuirkAdapter');
const ExternalDeviceAdapter = require('./ExternalDeviceAdapter');
const SecurityManager = require('./SecurityManager');

module.exports = {
  ...ZclToHomeyMap,
  ...Z2MConverterAdapter,
  ...ZHAQuirkAdapter,
  ...ExternalDeviceAdapter,
  ...SecurityManager
};
