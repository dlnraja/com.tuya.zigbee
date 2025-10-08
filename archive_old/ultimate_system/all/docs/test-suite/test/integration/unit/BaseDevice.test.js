'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const EventEmitter = require('events');
const { ZigbeeDevice } = require('homey-zigbeedriver');
const BaseDevice = require('../../drivers/common/BaseDevice');
const { POLLING_INTERVALS_MS, TUYA_CLUSTER_ID } = require('../../drivers/common/constants');

// Mock ZigbeeDevice
class MockZigbeeDevice {
  constructor() {
    this.log = sinon.stub();
    this.error = sinon.stub();
    this.enableDebug = sinon.stub();
    this.printNode = sinon.stub();
    this.getSetting = sinon.stub().returns(false);
    this.getName = sinon.stub().returns('Test Device');
    this.hasCapability = sinon.stub().returns(false);
    this.registerCapabilityListener = sinon.stub().resolves();
    this.registerMultipleCapabilityListener = sinon.stub().resolves();
    this.setCapabilityValue = sinon.stub().resolves();
    this.getCapabilityValue = sinon.stub().returns(0);
    this.zclNode = {
      endpoints: [null, { // endpoints[1] is typically used
        clusters: {}
      }],
      on: sinon.stub(),
      endPoints: [null, {
        clusters: {}
      }]
    };
  }
}

describe('BaseDevice', () => {
  let device;
  let mockZigbeeDevice;
  let clock;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    // Create a test instance of BaseDevice
    mockZigbeeDevice = new MockZigbeeDevice();
    device = new BaseDevice(mockZigbeeDevice);
    
    // Stub the parent class methods
    sinon.stub(ZigbeeDevice.prototype, 'onNodeInit').callsFake(function() {
      return Promise.resolve();
    });

    // Stub device methods
    device.registerCapabilities = sinon.stub().resolves();
    device.initializeDevice = sinon.stub().resolves();
    device.setupBatteryPolling = sinon.stub().resolves();
    device.supportsTuyaCluster = sinon.stub().returns(false);
    device.setupTuyaHandlers = sinon.stub();
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
    if (device._batteryPollInterval) {
      clearInterval(device._batteryPollInterval);
    }
  });

  describe('Initialization', () => {
    it('should initialize with default values', async () => {
      await device.onNodeInit({ zclNode: {} });
      expect(device).to.have.property('_events').that.is.an.instanceOf(EventEmitter);
      expect(device._batteryPollInterval).to.be.null;
      expect(device._lastBatteryUpdate).to.be.null;
    });

    it('should enable debug mode when configured', async () => {
      device.getSetting.withArgs('debug_enabled').returns(true);
      await device.onNodeInit({ zclNode: {} });
      expect(device.enableDebug.calledOnce).to.be.true;
      expect(device.printNode.calledOnce).to.be.true;
      expect(device.log.calledWith('[DEBUG] Debug logging enabled')).to.be.true;
    });
  });

  describe('Capability Management', () => {
    it('should register capabilities', async () => {
      const registerStub = sinon.stub(device, 'registerCapabilities').resolves();
      await device.onNodeInit({ zclNode: {} });
      expect(registerStub.calledOnce).to.be.true;
    });

    it('should initialize device-specific logic', async () => {
      const initStub = sinon.stub(device, 'initializeDevice').resolves();
      await device.onNodeInit({ zclNode: {} });
      expect(initStub.calledOnce).to.be.true;
    });
  });

  describe('Battery Management', () => {
    it('should set up battery polling if capability exists', async () => {
      device.hasCapability.withArgs('measure_battery').returns(true);
      const batteryStub = sinon.stub(device, 'setupBatteryPolling').resolves();
      
      await device.onNodeInit({ zclNode: {} });
      
      expect(batteryStub.calledOnce).to.be.true;
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors', async () => {
      const error = new Error('Test error');
      sinon.stub(device, 'registerCapabilities').rejects(error);
      
      await device.onNodeInit({ zclNode: {} }).catch(err => {
        expect(err).to.equal(error);
      });
      
      expect(device.error.calledOnce).to.be.true;
    });
  });

  describe('Battery Polling', () => {
    beforeEach(() => {
      device.hasCapability.withArgs('measure_battery').returns(true);
      device.updateBatteryLevel = sinon.stub().resolves();
    });

    it('should set up battery polling when device has battery capability', async () => {
      // Act
      await device.onNodeInit({ zclNode: mockZigbeeDevice.zclNode });

      // Assert
      expect(device.setupBatteryPolling.calledOnce).to.be.true;
    });

    it('should update battery level at specified interval', async () => {
      // Arrange
      const interval = POLLING_INTERVALS_MS.BATTERY;
      
      // Act
      await device.onNodeInit({ zclNode: mockZigbeeDevice.zclNode });
      await device.setupBatteryPolling();
      
      // Fast-forward time and check if updateBatteryLevel is called
      clock.tick(interval - 1);
      expect(device.updateBatteryLevel.called).to.be.false;
      
      clock.tick(2); // Just past the interval
      expect(device.updateBatteryLevel.calledOnce).to.be.true;
      
      // Fast-forward again
      clock.tick(interval);
      expect(device.updateBatteryLevel.calledTwice).to.be.true;
    });
  });

  describe('Tuya Cluster Support', () => {
    beforeEach(() => {
      device.supportsTuyaCluster.returns(true);
    });

    it('should set up Tuya handlers when supported', async () => {
      // Act
      await device.onNodeInit({ zclNode: mockZigbeeDevice.zclNode });

      // Assert
      expect(device.supportsTuyaCluster.calledOnce).to.be.true;
      expect(device.setupTuyaHandlers.calledOnce).to.be.true;
    });
  });

  describe('Debug Mode', () => {
    it('should enable debug mode when configured', async () => {
      // Arrange
      device.getSetting.withArgs('debug_enabled').returns(true);

      // Act
      await device.onNodeInit({ zclNode: mockZigbeeDevice.zclNode });

      // Assert
      expect(device.enableDebug.calledOnce).to.be.true;
      expect(device.printNode.calledOnce).to.be.true;
      expect(device.log.calledWith('[DEBUG] Debug logging enabled')).to.be.true;
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      // Arrange
      const testError = new Error('Test error');
      device.registerCapabilities.rejects(testError);

      // Act & Assert
      try {
        await device.onNodeInit({ zclNode: mockZigbeeDevice.zclNode });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.equal(testError);
        expect(device.error.calledWith('Initialization failed:', testError)).to.be.true;
      }
    });
  });

  describe('Event Emission', () => {
    it('should emit initialized event when initialization completes', async () => {
      // Arrange
      const eventSpy = sinon.spy();
      device._events.on('initialized', eventSpy);

      // Act
      await device.onNodeInit({ zclNode: mockZigbeeDevice.zclNode });

      // Assert
      expect(eventSpy.calledOnce).to.be.true;
    });
  });
});
