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
      warn: sinon.stub(),
      debug: sinon.stub()
    };
    
    // Mock the API client
    device.api = {
      getDeviceInfo: sinon.stub().resolves({}),
      sendCommand: sinon.stub().resolves({})
    };
  });

  describe('onInit', () => {
    it('should initialize the device successfully', async () => {
      // Call the initialization
      await device.onInit();
      
      // Verify initialization
      expect(device.log.info.calledWith('Initializing device')).to.be.true;
      expect(device.log.info.calledWith('Device initialized')).to.be.true;
    });

    it('should handle initialization errors', async () => {
      // Mock an error during initialization
      const testError = new Error('Test error');
      device.api.getDeviceInfo.rejects(testError);
      
      // Call the initialization and expect it to throw
      try {
        await device.onInit();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.equal(testError);
        expect(device.log.error.calledWith('Failed to initialize device:', testError)).to.be.true;
      }
    });
  });

  describe('onAdded', () => {
    it('should handle device addition', async () => {
      await device.onAdded();
      
      expect(device.log.info.calledWith('Device added:', deviceData.data.id)).to.be.true;
    });
  });

  describe('onSettings', () => {
    it('should update device settings', async () => {
      const newSettings = { setting1: 'value1' };
      const result = await device.onSettings({ newSettings });
      
      expect(result).to.be.true;
      expect(device.log.info.calledWith('Device settings updated')).to.be.true;
    });
  });

  describe('onRenamed', () => {
    it('should handle device renaming', async () => {
      const newName = 'New Device Name';
      await device.onRenamed(newName);
      
      expect(device.log.info.calledWith('Device renamed to:', newName)).to.be.true;
    });
  });

  describe('onDeleted', () => {
    it('should clean up resources when device is deleted', async () => {
      await device.onDeleted();
      
      expect(device.log.info.calledWith('Device deleted:', deviceData.data.id)).to.be.true;
    });
  });

  describe('Command Handling', () => {
    it('should execute device commands', async () => {
      const command = 'turn_on';
      const params = { brightness: 100 };
      
      // Mock the command handler
      device[`handle_${command}`] = sinon.stub().resolves({ success: true });
      
      const result = await device.executeCommand(command, params);
      
      expect(device[`handle_${command}`].calledOnceWith(params)).to.be.true;
      expect(result).to.deep.equal({ success: true });
    });
    
    it('should handle unknown commands', async () => {
      const command = 'unknown_command';
      
      try {
        await device.executeCommand(command, {});
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal(`Command '${command}' not implemented`);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const testError = new Error('API Error');
      device.api.sendCommand.rejects(testError);
      
      // Mock the command handler to use the API
      device.handle_test_command = async () => {
        return await device.api.sendCommand('test');
      };
      
      try {
        await device.executeCommand('test_command', {});
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.equal(testError);
        expect(device.log.error.calledWith('Command failed:')).to.be.true;
      }
    });
  });
});
