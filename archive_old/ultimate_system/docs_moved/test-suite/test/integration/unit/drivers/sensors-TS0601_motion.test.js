const { expect } = require('chai');
const sinon = require('sinon');
const { Device } = require('homey');
const Driver = require('../../../drivers/sensors-TS0601_motion/device');

describe('TS0601 Motion Sensor Driver', () => {
  let driver;
  let device;
  let homey;

  beforeEach(() => {
    // Mock Homey environment
    homey = {
      __: (key) => key, // i18n mock
      homey: {
        __: (key) => key,
        __n: (key) => key,
      },
      log: {
        info: sinon.stub(),
        error: sinon.stub(),
        debug: sinon.stub(),
      },
    };

    // Create driver instance
    driver = new Driver();
    driver.homey = homey;
    
    // Create device instance
    device = new Device({
      id: 'test-device',
      name: 'Test Motion Sensor',
      settings: {
        motion_reset: 60,
        temperature_offset: 0,
      },
      store: {},
      storeSettings: {},
      getStoreValue: sinon.stub(),
      setStoreValue: sinon.stub(),
      unsetStoreValue: sinon.stub(),
      getSettings: () => ({
        motion_reset: 60,
        temperature_offset: 0,
      }),
      hasCapability: (capability) => {
        const capabilities = [
          'alarm_motion',
          'measure_temperature',
          'measure_battery',
          'alarm_battery',
        ];
        return capabilities.includes(capability);
      },
      getCapabilityValue: sinon.stub().returns(false),
      setCapabilityValue: sinon.stub().resolves(),
      registerCapabilityListener: sinon.stub().resolves(),
      registerSetting: sinon.stub(),
      getClusterEndpoint: (cluster) => 1,
      zclNode: {
        endpoints: {
          1: {
            clusters: {
              ssIasZone: {
                on: sinon.stub(),
              },
              msTemperatureMeasurement: {
                on: sinon.stub(),
                readAttributes: sinon.stub().resolves({ measuredValue: 2500 }),
              },
              genPowerCfg: {
                on: sinon.stub(),
                readAttributes: sinon.stub().resolves({ batteryPercentageRemaining: 200 }),
              },
            },
          },
        },
      },
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('onNodeInit', () => {
    it('should initialize the device successfully', async () => {
      await device.onNodeInit({});
      
      // Verify event listeners are set up
      expect(device.zclNode.endpoints[1].clusters.ssIasZone.on.calledWith('attr.zoneStatus')).to.be.true;
      
      // Verify capabilities are registered
      expect(device.registerCapabilityListener.calledWith('alarm_motion')).to.be.true;
      
      // Verify settings are registered
      expect(device.registerSetting.calledWith('motion_reset')).to.be.true;
      expect(device.registerSetting.calledWith('temperature_offset')).to.be.true;
    });
  });

  describe('handleIasZoneUpdate', () => {
    it('should detect motion when zone status indicates motion', async () => {
      await device.onNodeInit({});
      
      // Trigger motion detection
      const zoneStatusHandler = device.zclNode.endpoints[1].clusters.ssIasZone.on.getCall(0).args[1];
      await zoneStatusHandler('zoneStatus', 1);
      
      // Verify motion is detected
      expect(device.setCapabilityValue.calledWith('alarm_motion', true)).to.be.true;
    });

    it('should clear motion after reset time', async () => {
      // Override setTimeout for testing
      const clock = sinon.useFakeTimers();
      
      await device.onNodeInit({});
      
      // Trigger motion detection
      const zoneStatusHandler = device.zclNode.endpoints[1].clusters.ssIasZone.on.getCall(0).args[1];
      await zoneStatusHandler('zoneStatus', 1);
      
      // Fast-forward time past the reset period
      await clock.tick(61000);
      
      // Verify motion is cleared
      expect(device.setCapabilityValue.calledWith('alarm_motion', false)).to.be.true;
      
      clock.restore();
    });
  });

  describe('readTemperature', () => {
    it('should read and update temperature with offset', async () => {
      // Set temperature offset
      device.getSettings = () => ({
        temperature_offset: 1.5,
        motion_reset: 60,
      });
      
      await device.onNodeInit({});
      await device.readTemperature();
      
      // Verify temperature is read and offset is applied (25.0 + 1.5 = 26.5)
      expect(device.setCapabilityValue.calledWith('measure_temperature', 26.5)).to.be.true;
    });
  });

  describe('readBattery', () => {
    it('should read and update battery level', async () => {
      await device.onNodeInit({});
      await device.readBattery();
      
      // Verify battery level is read and converted (200 / 2 = 100%)
      expect(device.setCapabilityValue.calledWith('measure_battery', 100)).to.be.true;
      
      // Verify battery alarm is set to false (battery > 20%)
      expect(device.setCapabilityValue.calledWith('alarm_battery', false)).to.be.true;
    });

    it('should trigger battery alarm when level is low', async () => {
      // Stub low battery level (30%)
      device.zclNode.endpoints[1].clusters.genPowerCfg.readAttributes.resolves({ 
        batteryPercentageRemaining: 60 
      });
      
      await device.onNodeInit({});
      await device.readBattery();
      
      // Verify battery alarm is set to true (30% < 20% threshold)
      expect(device.setCapabilityValue.calledWith('alarm_battery', true)).to.be.true;
    });
  });

  describe('onDeleted', () => {
    it('should clean up all intervals and timeouts', async () => {
      // Set up fake timers
      const clock = sinon.useFakeTimers();
      
      await device.onNodeInit({});
      
      // Trigger motion to set up timeout
      const zoneStatusHandler = device.zclNode.endpoints[1].clusters.ssIasZone.on.getCall(0).args[1];
      await zoneStatusHandler('zoneStatus', 1);
      
      // Call onDeleted
      await device.onDeleted();
      
      // Fast-forward time to verify no callbacks fire
      await clock.tick(120000);
      
      // Verify motion clear was not called after deletion
      expect(device.setCapabilityValue.calledWith('alarm_motion', false)).to.be.false;
      
      clock.restore();
    });
  });
});
