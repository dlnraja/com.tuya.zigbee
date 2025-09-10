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

// Mock the app module
const App = proxyquire('../../app', {
  'homey': mockHomey
});

describe('Tuya Zigbee App', () => {
  let app;
  let deviceManager;
  
  beforeEach(() => {
    // Create a fresh app instance for each test
    app = new App();
    
    // Reset all stubs
    sinon.resetHistory();
    
    // Setup default stub behaviors
    app.log = {
      info: sinon.stub(),
      error: sinon.stub(),
      warn: sinon.stub(),
      debug: sinon.stub()
    };
    
    // Mock the device manager
    deviceManager = {
      addDevice: sinon.stub().resolves(),
      removeDevice: sinon.stub().resolves(),
      updateDevice: sinon.stub().resolves(),
      getDevice: sinon.stub().returns({
        onSettings: sinon.stub().resolves(),
        setUnavailable: sinon.stub().resolves(),
        setAvailable: sinon.stub().resolves()
      })
    };
    
    // Assign the mocked device manager
    app.deviceManager = deviceManager;
  });
  
  describe('onInit', () => {
    it('should initialize the app successfully', async () => {
      // Mock the Python service start
      app.startPythonService = sinon.stub().resolves();
      
      // Call the initialization
      await app.onInit();
      
      // Verify initialization steps
      expect(app.log.info.calledWith('🚀 Universal Tuya Zigbee App initializing...')).to.be.true;
      expect(app.startPythonService.calledOnce).to.be.true;
      expect(app.log.info.calledWith('✅ App initialized successfully')).to.be.true;
    });
    
    it('should handle initialization errors', async () => {
      // Mock a failure in the Python service
      const testError = new Error('Test error');
      app.startPythonService = sinon.stub().rejects(testError);
      
      // Call the initialization and expect it to throw
      try {
        await app.onInit();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.equal(testError);
        expect(app.log.error.calledWith('❌ App initialization failed:', testError)).to.be.true;
      }
    });
  });
  
  describe('Device Management', () => {
    it('should add a new device', async () => {
      const deviceData = {
        id: 'test-device-1',
        name: 'Test Device',
        settings: {}
      };
      
      await app.onPairListDevices(deviceData);
      
      expect(deviceManager.addDevice.calledOnceWith(deviceData)).to.be.true;
      expect(app.log.info.calledWith('Added new device:', deviceData.id)).to.be.true;
    });
    
    it('should handle device addition errors', async () => {
      const deviceData = { id: 'test-device-1' };
      const testError = new Error('Test error');
      deviceManager.addDevice.rejects(testError);
      
      try {
        await app.onPairListDevices(deviceData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.equal(testError);
        expect(app.log.error.calledWith('Failed to add device:', testError)).to.be.true;
      }
    });
  });
  
  describe('Python Service', () => {
    it('should start the Python service', async () => {
      // Mock the Python service process
      const mockProcess = {
        stdout: { on: sinon.stub() },
        stderr: { on: sinon.stub() },
        on: sinon.stub()
      };
      
      // Mock the spawn function
      const { spawn } = require('child_process');
      const spawnStub = sinon.stub().returns(mockProcess);
      
      // Replace the spawn function with our stub
      const originalSpawn = spawn;
      try {
        spawn.spawn = spawnStub;
        
        // Call the method
        await app.startPythonService();
        
        // Verify the service was started
        expect(spawnStub.called).to.be.true;
        expect(mockProcess.stdout.on.calledWith('data')).to.be.true;
        expect(mockProcess.stderr.on.calledWith('data')).to.be.true;
        expect(mockProcess.on.calledWith('close')).to.be.true;
        
      } finally {
        // Restore the original spawn function
        spawn.spawn = originalSpawn;
      }
    });
  });
});
