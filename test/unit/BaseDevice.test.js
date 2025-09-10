const { expect } = require('chai');
const sinon = require('sinon');
const { createMockDevice, createMockZigbeeNode, withTimeout } = require('../test-utils');

// Import the base device class
const BaseDevice = require('../../drivers/common/BaseDevice');

describe('BaseDevice', () => {
  let device;
  let node;
  let homey;

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

    // Create a mock Zigbee node
    node = createMockZigbeeNode({
      manufacturer: 'Tuya',
      modelId: 'TS0121',
    });

    // Create a mock device instance
    device = createMockDevice({
      capabilities: ['onoff', 'measure_power', 'meter_power'],
      settings: {
        powerOnState: 'last',
      },
    });

    // Initialize the base device
    device = new BaseDevice({ homey, node });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('onNodeInit', () => {
    it('should initialize the device successfully', async () => {
      // Stub the configureReporting method
      device.configureReporting = sinon.stub().resolves();
      
      // Call onNodeInit
      await withTimeout(device.onNodeInit());
      
      // Verify that configureReporting was called for each capability
      expect(device.configureReporting.calledWith('onOff', {
        minInterval: 0,
        maxInterval: 300,
        minChange: 1,
      })).to.be.true;
      
      expect(device.configureReporting.calledWith('electricalMeasurement', {
        minInterval: 0,
        maxInterval: 300,
        minChange: 5,
      }, 'activePower')).to.be.true;
    });
  });

  describe('onSettings', () => {
    it('should handle settings changes', async () => {
      const oldSettings = { powerOnState: 'last' };
      const newSettings = { powerOnState: 'on' };
      const changedKeys = ['powerOnState'];
      
      // Call onSettings
      await withTimeout(device.onSettings({ oldSettings, newSettings, changedKeys }));
      
      // Verify that the setting was updated
      expect(device.settings.powerOnState).to.equal('on');
    });
  });

  describe('onRenamed', () => {
    it('should log when the device is renamed', async () => {
      const name = 'New Device Name';
      
      // Call onRenamed
      await withTimeout(device.onRenamed(name));
      
      // Verify that the log was called
      expect(device.log.calledWith(`Device was renamed to ${name}`)).to.be.true;
    });
  });

  describe('onDeleted', () => {
    it('should clean up resources when the device is deleted', async () => {
      // Stub the unregisterCapabilityListener method
      device.unregisterCapabilityListener = sinon.stub().resolves();
      
      // Call onDeleted
      await withTimeout(device.onDeleted());
      
      // Verify that the listener was unregistered
      expect(device.unregisterCapabilityListener.called).to.be.true;
    });
  });

  describe('configureReporting', () => {
    it('should configure reporting for a cluster', async () => {
      // Stub the endpoint's configureReporting method
      const configureReportingStub = sinon.stub().resolves();
      device.zclNode.endpoints[0].clusters.onOff = {
        configureReporting: configureReportingStub,
      };
      
      // Call configureReporting
      await withTimeout(device.configureReporting('onOff', {
        minInterval: 0,
        maxInterval: 300,
        minChange: 1,
      }));
      
      // Verify that configureReporting was called with the correct parameters
      expect(configureReportingStub.calledOnce).to.be.true;
      const args = configureReportingStub.firstCall.args[0];
      expect(args.attrId).to.equal('onOff');
      expect(args.minInterval).to.equal(0);
      expect(args.maxInterval).to.equal(300);
      expect(args.minChange).to.equal(1);
    });
  });

  describe('handleReport', () => {
    it('should handle a report from the device', async () => {
      // Stub the setCapabilityValue method
      device.setCapabilityValue = sinon.stub().resolves();
      
      // Create a report
      const report = {
        cluster: 'onOff',
        data: {
          onOff: true,
        },
      };
      
      // Call handleReport
      await withTimeout(device.handleReport(report));
      
      // Verify that setCapabilityValue was called with the correct value
      expect(device.setCapabilityValue.calledWith('onoff', true)).to.be.true;
    });
  });
});
