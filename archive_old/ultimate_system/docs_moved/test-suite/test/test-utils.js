/**
 * Test utilities for Tuya Zigbee drivers
 */

const { expect } = require('chai');
const sinon = require('sinon');
const { ZigbeeDevice } = require('homey-zigbeedriver');

/**
 * Create a mock Zigbee device for testing
 * @param {Object} options - Device options
 * @returns {Object} Mock device instance
 */
function createMockDevice(options = {}) {
  const device = {
    homey: {
      __: (key) => key, // i18n mock
      logger: {
        info: sinon.stub(),
        error: sinon.stub(),
        debug: sinon.stub(),
      },
    },
    getData: sinon.stub().returns({}),
    getStore: sinon.stub().returns({}),
    getStoreValue: sinon.stub(),
    setStoreValue: sinon.stub().resolves(),
    unsetStoreValue: sinon.stub().resolves(),
    getSettings: sinon.stub().returns({}),
    setSettings: sinon.stub().resolves(),
    setUnavailable: sinon.stub().resolves(),
    setAvailable: sinon.stub().resolves(),
    setWarning: sinon.stub().resolves(),
    setCapabilityValue: sinon.stub().resolves(),
    hasCapability: (capability) => {
      return (options.capabilities || []).includes(capability);
    },
    capabilities: options.capabilities || [],
    capabilitiesOptions: options.capabilitiesOptions || {},
    settings: options.settings || {},
    logger: {
      info: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
    },
    // Add any other methods or properties needed for testing
    ...options.overrides,
  };

  // Set up getCapabilityValue to return the last value set by setCapabilityValue
  device.getCapabilityValue = (capability) => {
    const call = device.setCapabilityValue.getCalls()
      .reverse()
      .find(call => call.args[0] === capability);
    return call ? call.args[1] : undefined;
  };

  return device;
}

/**
 * Create a mock Homey app for testing
 * @returns {Object} Mock Homey instance
 */
function createMockHomey() {
  return {
    __: (key) => key, // i18n mock
    logger: {
      info: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
    },
    settings: {
      get: sinon.stub().resolves({}),
      set: sinon.stub().resolves(),
      unset: sinon.stub().resolves(),
    },
    // Add any other Homey methods needed for testing
  };
}

/**
 * Create a mock Zigbee node for testing
 * @param {Object} options - Node options
 * @returns {Object} Mock Zigbee node
 */
function createMockZigbeeNode(options = {}) {
  return {
    ieeeAddr: options.ieeeAddr || '00:11:22:33:44:55:66:77',
    endpoints: [
      {
        clusters: {
          basic: {
            attributes: {
              manufacturerName: options.manufacturer || 'Tuya',
              modelId: options.modelId || 'TS0121',
              powerSource: options.powerSource || 'Mains (single phase)',
              zclVersion: 3,
              appVersion: 1,
              stackVersion: 2,
              hwVersion: 1,
              dateCode: '20230101',
              swBuildId: '1.0.0',
            },
          },
          // Add other clusters as needed
        },
        bind: sinon.stub().resolves(),
        configureReporting: sinon.stub().resolves(),
        read: sinon.stub().resolves(),
        write: sinon.stub().resolves(),
        command: sinon.stub().resolves(),
        // Add other endpoint methods as needed
      },
    ],
    // Add other node methods as needed
  };
}

/**
 * Create a mock driver for testing
 * @param {Object} options - Driver options
 * @returns {Object} Mock driver instance
 */
function createMockDriver(options = {}) {
  return {
    homey: createMockHomey(),
    log: sinon.stub(),
    error: sinon.stub(),
    debug: sinon.stub(),
    getDevices: sinon.stub().resolves([]),
    getDevice: sinon.stub(),
    ready: sinon.stub().resolves(),
    // Add other driver methods as needed
    ...options.overrides,
  };
}

/**
 * Wait for a promise to resolve or reject with a timeout
 * @param {Promise} promise - The promise to wait for
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise} The result of the promise or a timeout error
 */
function withTimeout(promise, timeout = 1000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Test timeout'));
      }, timeout);
    }),
  ]);
}

module.exports = {
  createMockDevice,
  createMockHomey,
  createMockZigbeeNode,
  createMockDriver,
  withTimeout,
  expect,
  sinon,
};
