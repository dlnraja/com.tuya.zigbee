#!/usr/bin/env node
'use strict';

'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const { Device } = require('homey');

// Mock the Homey objects
const homey = {
  __: (key) => key, // Mock i18n
  app: {
    homey: {
      __: (key) => key,
    },
  },
};

describe('Tuya TS011F Smart Plug', () => {
  let driver;
  let device;
  let mockNode;

  before(() => {
    // Load the driver
    const Driver = require('../../../drivers/tuya-ts011f/driver');
    driver = new Driver(homey);
    
    // Create a mock device
    device = new Device({
      name: 'Tuya Smart Plug TS011F',
      data: {
        id: 'test-device-1',
      },
    });
    
    // Mock Zigbee node
    mockNode = {
      handleFrame: sinon.stub(),
      handleCommand: sinon.stub(),
      registerCapability: sinon.stub(),
    };
  });

  describe('Device Initialization', () => {
    it('should initialize the device', async () => {
      await device.onNodeInit({ zclNode: mockNode });
      expect(device).to.be.an('object');
    });

    it('should register on/off capability', () => {
      expect(mockNode.registerCapability.calledWith('onoff', 6)).to.be.true;
    });

    it('should register power measurement capability', () => {
      expect(mockNode.registerCapability.calledWith('measure_power', 2820)).to.be.true;
    });
  });

  describe('Settings', () => {
    it('should handle settings changes', async () => {
      const newSettings = { powerOnState: '1' };
      const oldSettings = {};
      await device.onSettings({ newSettings, oldSettings, changedKeys: ['powerOnState'] });
      // Add assertions for settings handling
    });
  });

  after(() => {
    // Clean up
    device = null;
    driver = null;
  });
});
