#!/usr/bin/env node
'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

// Mock Homey objects
const mockHomey = {
  __: (key) => key, // i18n
  app: {
    get: sinon.stub(),
    set: sinon.stub(),
    homey: {
      __: (key) => key,
      devices: {
        getDevice: sinon.stub(),
        getDevices: sinon.stub()
      },
      cloud: {
        getLocalAddress: sinon.stub().resolves('http://localhost:3000')
      },
      settings: {
        set: sinon.stub().resolves(),
        get: sinon.stub().resolves({})
      }
    }
  }
};

// Mock the device driver
const Device = proxyquire('../../drivers/device', {
  'homey': mockHomey
});

describe('Tuya Zigbee Device', () => {
  let device;
  let deviceData = {
    data: { id: 'test-device-123' },
    name: 'Test Device',
    settings: {}
  };

  beforeEach(() => {
    // Create a fresh device instance for each test
    device = new Device(deviceData);
    
    // Reset all stubs
    sinon.resetHistory();
    
    // Setup default stub behaviors
    device.log = {
      info: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub()
    };
    
    device.setCapabilityValue = sinon.stub().resolves();
    device.getCapabilityValue = sinon.stub().resolves();
  });

  describe('onInit', () => {
    it('should initialize the device', async () => {
      await device.onInit();
      
      expect(device.log.info.calledWith('Initializing device')).to.be.true;
      expect(device.log.info.calledWith('Device initialized')).to.be.true;
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Test error');
      device.log.error = sinon.stub().throws(error);
      
      try {
        await device.onInit();
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('onAdded', () => {
    it('should handle device addition', async () => {
      await device.onAdded();
      expect(device.log.info.calledWith('Device added')).to.be.true;
    });
  });

  describe('onSettings', () => {
    it('should update device settings', async () => {
      const oldSettings = {};
      const newSettings = { pollInterval: 60 };
      const changedKeys = ['pollInterval'];
      
      const result = await device.onSettings(oldSettings, newSettings, changedKeys);
      
      expect(device.log.info.calledWith('Updating settings')).to.be.true;
      expect(result).to.be.true;
    });
  });

  describe('onRenamed', () => {
    it('should handle device renaming', async () => {
      const name = 'New Device Name';
      await device.onRenamed(name);
      
      expect(device.log.info.calledWith(`Device renamed to: ${name}`)).to.be.true;
    });
  });

  describe('onDeleted', () => {
    it('should clean up resources when device is deleted', async () => {
      device.cleanup = sinon.stub().resolves();
      
      await device.onDeleted();
      
      expect(device.log.info.calledWith('Device deleted')).to.be.true;
      expect(device.cleanup.calledOnce).to.be.true;
    });
  });
});
