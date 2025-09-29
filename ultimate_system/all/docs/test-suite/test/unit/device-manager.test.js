#!/usr/bin/env node
'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

// Mock Homey objects
const mockHomey = {
  __: (key) => key, // i18n
  app: {
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

// Mock the device manager module
const DeviceManager = proxyquire('../../app/device-manager', {
  'homey': mockHomey
});

describe('Device Manager', () => {
  let deviceManager;
  let mockDevice;
  
  beforeEach(() => {
    // Create a fresh device manager instance
    deviceManager = new DeviceManager(mockHomey.app);
    
    // Reset all stubs
    sinon.resetHistory();
    
    // Setup default stub behaviors
    deviceManager.log = {
      info: sinon.stub(),
      error: sinon.stub(),
      warn: sinon.stub(),
      debug: sinon.stub()
    };
    
    // Mock device
    mockDevice = {
      id: 'test-device-1',
      name: 'Test Device',
      on: sinon.stub(),
      setUnavailable: sinon.stub().resolves(),
      setAvailable: sinon.stub().resolves(),
      onSettings: sinon.stub().resolves(),
      setSettings: sinon.stub().resolves(),
      getSettings: sinon.stub().resolves({})
    };
    
    // Setup Homey device mocks
    mockHomey.app.homey.devices.getDevice.withArgs(mockDevice.id).returns(mockDevice);
    mockHomey.app.homey.devices.getDevices.returns([mockDevice]);
  });
  
  describe('addDevice', () => {
    it('should add a new device successfully', async () => {
      const deviceData = {
        id: 'new-device-1',
        name: 'New Device',
        settings: {}
      };
      
      // Mock device creation
      const createDeviceStub = sinon.stub().resolves({
        getDevice: () => ({ ...mockDevice, ...deviceData })
      });
      deviceManager.homey.drivers.getDriver = sinon.stub().returns({
        createDevice: createDeviceStub
      });
      
      const result = await deviceManager.addDevice(deviceData);
      
      expect(createDeviceStub.calledOnce).to.be.true;
      expect(deviceManager.devices.has(deviceData.id)).to.be.true;
      expect(result).to.equal(deviceData.id);
    });
    
    it('should handle errors when adding a device', async () => {
      const deviceData = { id: 'error-device', name: 'Error Device' };
      const testError = new Error('Test error');
      
      deviceManager.homey.drivers.getDriver = sinon.stub().returns({
        createDevice: sinon.stub().rejects(testError)
      });
      
      try {
        await deviceManager.addDevice(deviceData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.equal(testError);
        expect(deviceManager.log.error.calledWith('Failed to add device:', testError)).to.be.true;
      }
    });
  });
  
  describe('removeDevice', () => {
    it('should remove an existing device', async () => {
      // Add a device first
      deviceManager.devices.set(mockDevice.id, mockDevice);
      
      // Mock device deletion
      const deleteDeviceStub = sinon.stub().resolves(true);
      deviceManager.homey.drivers.getDriver = sinon.stub().returns({
        getDevice: () => ({ delete: deleteDeviceStub })
      });
      
      await deviceManager.removeDevice(mockDevice.id);
      
      expect(deleteDeviceStub.calledOnce).to.be.true;
      expect(deviceManager.devices.has(mockDevice.id)).to.be.false;
    });
    
    it('should handle non-existent device removal', async () => {
      const nonExistentId = 'non-existent-id';
      
      await deviceManager.removeDevice(nonExistentId);
      
      expect(deviceManager.log.warn.calledWith(`Device ${nonExistentId} not found`)).to.be.true;
    });
  });
  
  describe('updateDevice', () => {
    it('should update device settings', async () => {
      const updates = { name: 'Updated Name', settings: { key: 'value' } };
      
      // Add the device first
      deviceManager.devices.set(mockDevice.id, mockDevice);
      
      await deviceManager.updateDevice(mockDevice.id, updates);
      
      expect(mockDevice.setSettings.calledWith(updates.settings)).to.be.true;
      expect(deviceManager.log.info.calledWith(`Updated device ${mockDevice.id}`)).to.be.true;
    });
    
    it('should handle update errors', async () => {
      const updates = { settings: { key: 'value' } };
      const testError = new Error('Update failed');
      
      // Add the device first
      deviceManager.devices.set(mockDevice.id, mockDevice);
      
      // Make setSettings fail
      mockDevice.setSettings.rejects(testError);
      
      try {
        await deviceManager.updateDevice(mockDevice.id, updates);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.equal(testError);
        expect(deviceManager.log.error.calledWith(`Failed to update device ${mockDevice.id}:`, testError)).to.be.true;
      }
    });
  });
  
  describe('getDevice', () => {
    it('should return a device by ID', () => {
      deviceManager.devices.set(mockDevice.id, mockDevice);
      
      const result = deviceManager.getDevice(mockDevice.id);
      
      expect(result).to.equal(mockDevice);
    });
    
    it('should return undefined for non-existent device', () => {
      const result = deviceManager.getDevice('non-existent-id');
      expect(result).to.be.undefined;
    });
  });
  
  describe('getAllDevices', () => {
    it('should return all devices', () => {
      const devices = [
        { id: 'device-1', name: 'Device 1' },
        { id: 'device-2', name: 'Device 2' }
      ];
      
      // Add test devices
      devices.forEach(device => {
        deviceManager.devices.set(device.id, device);
      });
      
      const result = deviceManager.getAllDevices();
      
      expect(result).to.have.lengthOf(devices.length);
      expect(result.map(d => d.id)).to.have.members(devices.map(d => d.id));
    });
  });
  
  describe('initializeDevices', () => {
    it('should initialize all devices from Homey', async () => {
      const devices = [
        { id: 'device-1', name: 'Device 1' },
        { id: 'device-2', name: 'Device 2' }
      ];
      
      // Mock Homey's getDevices
      mockHomey.app.homey.devices.getDevices.returns(devices);
      
      await deviceManager.initializeDevices();
      
      expect(deviceManager.devices.size).to.equal(devices.length);
      devices.forEach(device => {
        expect(deviceManager.devices.has(device.id)).to.be.true;
      });
    });
  });
});
