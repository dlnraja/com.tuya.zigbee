const { expect } = require('chai');
const sinon = require('sinon');
const { createMockDriver, createMockDevice, withTimeout } = require('../test-utils');

// Import the driver to test
const TuyaDriver = require('../../drivers/tuya/driver');

describe('TuyaDriver Integration', () => {
  let driver;
  let homey;
  let device;

  beforeEach(() => {
    // Create a mock Homey instance
    homey = {
      __: (key) => key,
      logger: {
        info: sinon.stub(),
        error: sinon.stub(),
        debug: sinon.stub(),
      },
    };

    // Create a mock driver instance
    driver = createMockDriver({
      homey,
      overrides: {
        // Add any driver-specific methods that need to be stubbed
      },
    });

    // Initialize the driver
    driver = new TuyaDriver(homey);

    // Create a mock device
    device = createMockDevice({
      capabilities: ['onoff', 'measure_power', 'meter_power'],
      settings: {
        powerOnState: 'last',
      },
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('onInit', () => {
    it('should initialize the driver successfully', async () => {
      // Call onInit
      await withTimeout(driver.onInit());
      
      // Verify that the driver was initialized
      expect(driver.log.calledWith('TuyaDriver has been initialized')).to.be.true;
    });
  });

  describe('onPairListDevices', () => {
    it('should return a list of devices', async () => {
      // Stub the _discoverDevices method
      driver._discoverDevices = sinon.stub().resolves([
        { id: 'device1', name: 'Tuya Device 1' },
        { id: 'device2', name: 'Tuya Device 2' },
      ]);
      
      // Call onPairListDevices
      const devices = await withTimeout(driver.onPairListDevices());
      
      // Verify that the correct devices were returned
      expect(devices).to.be.an('array').with.lengthOf(2);
      expect(devices[0]).to.have.property('id', 'device1');
      expect(devices[0]).to.have.property('name', 'Tuya Device 1');
    });
  });

  describe('onPair', () => {
    it('should handle the pairing process', async () => {
      // Create a mock socket
      const socket = {
        on: sinon.stub(),
        emit: sinon.stub(),
        showView: sinon.stub().resolves(),
        nextView: sinon.stub().resolves(),
        done: sinon.stub().resolves(),
        showView: sinon.stub().resolves(),
      };
      
      // Call onPair
      await withTimeout(driver.onPair(socket));
      
      // Verify that the socket event handlers were set up
      expect(socket.on.calledWith('list_devices')).to.be.true;
      expect(socket.on.calledWith('add_device')).to.be.true;
    });
  });

  describe('_actionTurnOn', () => {
    it('should turn on a device', async () => {
      // Stub the setCapabilityValue method
      device.setCapabilityValue = sinon.stub().resolves();
      
      // Call _actionTurnOn
      await withTimeout(driver._actionTurnOn({ device }));
      
      // Verify that the device was turned on
      expect(device.setCapabilityValue.calledWith('onoff', true)).to.be.true;
    });
  });

  describe('_actionTurnOff', () => {
    it('should turn off a device', async () => {
      // Stub the setCapabilityValue method
      device.setCapabilityValue = sinon.stub().resolves();
      
      // Call _actionTurnOff
      await withTimeout(driver._actionTurnOff({ device }));
      
      // Verify that the device was turned off
      expect(device.setCapabilityValue.calledWith('onoff', false)).to.be.true;
    });
  });

  describe('_conditionIsOn', () => {
    it('should return true if the device is on', async () => {
      // Stub the getCapabilityValue method
      device.getCapabilityValue = sinon.stub().returns(true);
      
      // Call _conditionIsOn
      const result = await withTimeout(driver._conditionIsOn({ device }));
      
      // Verify that the condition was checked
      expect(result).to.be.true;
    });

    it('should return false if the device is off', async () => {
      // Stub the getCapabilityValue method
      device.getCapabilityValue = sinon.stub().returns(false);
      
      // Call _conditionIsOn
      const result = await withTimeout(driver._conditionIsOn({ device }));
      
      // Verify that the condition was checked
      expect(result).to.be.false;
    });
  });

  describe('_onDeviceAdded', () => {
    it('should handle a new device being added', async () => {
      // Stub the _initDevice method
      driver._initDevice = sinon.stub().resolves();
      
      // Call _onDeviceAdded
      await withTimeout(driver._onDeviceAdded(device));
      
      // Verify that the device was initialized
      expect(driver._initDevice.calledWith(device)).to.be.true;
    });
  });

  describe('_onDeviceDeleted', () => {
    it('should handle a device being deleted', async () => {
      // Stub the _cleanupDevice method
      driver._cleanupDevice = sinon.stub().resolves();
      
      // Call _onDeviceDeleted
      await withTimeout(driver._onDeviceDeleted(device));
      
      // Verify that the device was cleaned up
      expect(driver._cleanupDevice.calledWith(device)).to.be.true;
    });
  });
});
