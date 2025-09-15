'use strict';

const { expect } = require('chai');
const Homey = require('homey');
const TuyaWaterLeakSensor = require('../../src/drivers/tuya/SJCGQ11LM/device');

// Mock Homey.Device
class MockDevice {
  constructor() {
    this.log = {
      info: console.log,
      error: console.error,
      debug: console.debug,
    };
    this.capabilities = [];
    this.capabilityValues = {};
    this.settings = {};
  }

  async addCapability(capability) {
    if (!this.capabilities.includes(capability)) {
      this.capabilities.push(capability);
    }
  }

  async setCapabilityValue(capability, value) {
    this.capabilityValues[capability] = value;
  }

  async getCapabilityValue(capability) {
    return this.capabilityValues[capability];
  }

  async getSetting(key) {
    return this.settings[key];
  }
}

describe('Tuya Water Leak Sensor', () => {
  let device;
  let mockDevice;

  beforeEach(() => {
    mockDevice = new MockDevice();
    device = new TuyaWaterLeakSensor({
      homey: new Homey.Homey(),
      driver: {},
      data: { id: 'test-device' },
    });
    
    // Replace the device methods with our mock
    Object.assign(device, mockDevice);
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      expect(device.state.waterLeak).to.be.false;
      expect(device.state.battery).to.be.null;
      expect(device.state.batteryLow).to.be.false;
      expect(device.state.tamper).to.be.false;
      expect(device.state.reportInterval).to.equal(3600);
    });
  });

  describe('Water Leak Detection', () => {
    it('should detect water leak', async () => {
      // Simulate water leak detected
      await device.registerWaterLeakCapability({
        endpoints: [null, { clusters: { 'ssIasZone': true } }]
      });
      
      // Mock the report parser
      const reportParser = device.registerCapability.mock.calls
        .find(call => call[0] === 'alarm_water')[2].reportParser;
      
      // Simulate leak detected
      const result = reportParser({ zoneStatus: 1 });
      
      expect(result).to.be.true;
      expect(device.state.waterLeak).to.be.true;
    });

    it('should clear water leak detection', async () => {
      // First set leak state to true
      device.state.waterLeak = true;
      
      await device.registerWaterLeakCapability({
        endpoints: [null, { clusters: { 'ssIasZone': true } }]
      });
      
      const reportParser = device.registerCapability.mock.calls
        .find(call => call[0] === 'alarm_water')[2].reportParser;
      
      // Simulate leak cleared
      const result = reportParser({ zoneStatus: 0 });
      
      expect(result).to.be.false;
      expect(device.state.waterLeak).to.be.false;
    });
  });

  describe('Tamper Detection', () => {
    it('should detect tamper', async () => {
      await device.registerTamperCapability({
        endpoints: [null, { clusters: { 'ssIasZone': true } }]
      });
      
      const reportParser = device.registerCapability.mock.calls
        .find(call => call[0] === 'alarm_tamper')[2].reportParser;
      
      // Bit 3 set indicates tamper
      const result = reportParser({ zoneStatus: 0b1000 });
      
      expect(result).to.be.true;
      expect(device.state.tamper).to.be.true;
    });
  });

  describe('Battery Monitoring', () => {
    it('should update battery level', async () => {
      await device.registerBatteryCapability({
        endpoints: [null, { clusters: { 'genPowerCfg': true } }]
      });
      
      const reportParser = device.registerCapability.mock.calls
        .find(call => call[0] === 'measure_battery')[2].reportParser;
      
      // 50% battery (100 in 0-200 scale)
      const result = reportParser(100);
      
      expect(result).to.equal(50);
      expect(device.state.battery).to.equal(50);
    });

    it('should trigger low battery alarm', async () => {
      device.state.batteryThreshold = 30;
      
      await device.registerBatteryCapability({
        endpoints: [null, { clusters: { 'genPowerCfg': true } }]
      });
      
      const reportParser = device.registerCapability.mock.calls
        .find(call => call[0] === 'measure_battery')[2].reportParser;
      
      // 25% battery (50 in 0-200 scale)
      reportParser(50);
      
      expect(device.state.batteryLow).to.be.true;
      expect(await device.getCapabilityValue('alarm_battery')).to.be.true;
    });
  });

  describe('Settings', () => {
    it('should update report interval', async () => {
      const newInterval = 1800; // 30 minutes
      
      await device.onSettings({
        oldSettings: { report_interval: 3600 },
        newSettings: { report_interval: newInterval },
        changedKeys: ['report_interval']
      });
      
      expect(device.state.reportInterval).to.equal(newInterval);
    });

    it('should update battery threshold', async () => {
      const newThreshold = 15;
      
      await device.onSettings({
        oldSettings: { battery_threshold: 20 },
        newSettings: { battery_threshold: newThreshold },
        changedKeys: ['battery_threshold']
      });
      
      expect(device.state.batteryThreshold).to.equal(newThreshold);
    });
  });
});
