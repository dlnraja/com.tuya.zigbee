'use strict';

const { expect } = require('chai');
const Homey = require('homey');
const TuyaMultiSensor = require('../../src/drivers/tuya/MS01/device');

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
    this.settings = {
      motion_timeout: 60,
      motion_sensitivity: 'medium',
      temperature_offset: 0,
      temperature_unit: 'celsius',
      humidity_offset: 0,
      report_interval: 300,
      led_enabled: true,
      battery_threshold: 20
    };
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

  async onSettings({ newSettings, changedKeys }) {
    this.settings = { ...this.settings, ...newSettings };
    return this.settings;
  }
}

describe('Tuya Multi-Sensor', () => {
  let device;
  let mockDevice;

  beforeEach(() => {
    mockDevice = new MockDevice();
    device = new TuyaMultiSensor({
      homey: new Homey.Homey(),
      driver: {},
      data: { id: 'test-multi-sensor' },
    });
    
    // Replace the device methods with our mock
    Object.assign(device, mockDevice);
  });

  afterEach(() => {
    if (device.state.motionTimeout) {
      clearTimeout(device.state.motionTimeout);
    }
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      expect(device.state.motionDetected).to.be.false;
      expect(device.state.temperature).to.be.null;
      expect(device.state.humidity).to.be.null;
      expect(device.state.contactState).to.equal('unknown');
      expect(device.state.waterLeak).to.be.false;
      expect(device.state.tamper).to.be.false;
      expect(device.state.battery).to.be.null;
      expect(device.state.batteryLow).to.be.false;
      expect(device.state.reportInterval).to.equal(300);
    });
  });

  describe('Motion Detection', () => {
    it('should detect motion', async () => {
      await device.registerMotionCapability({
        endpoints: [null, { clusters: { 'msOccupancySensing': true } }]
      });
      
      const reportParser = device.registerCapability.mock.calls
        .find(call => call[0] === 'alarm_motion')[2].reportParser;
      
      // Simulate motion detected
      reportParser(1);
      
      expect(device.state.motionDetected).to.be.true;
      expect(device.state.motionTimeout).to.exist;
    });

    it('should clear motion after timeout', async (done) => {
      device.state.motionTimeoutDuration = 0.1; // 100ms for testing
      
      await device.registerMotionCapability({
        endpoints: [null, { clusters: { 'msOccupancySensing': true } }]
      });
      
      const reportParser = device.registerCapability.mock.calls
        .find(call => call[0] === 'alarm_motion')[2].reportParser;
      
      // Simulate motion detected
      reportParser(1);
      
      // Wait for timeout
      setTimeout(() => {
        expect(device.state.motionDetected).to.be.false;
        done();
      }, 200);
    });
  });

  describe('Temperature Measurement', () => {
    it('should update temperature', async () => {
      await device.registerTemperatureCapability({
        endpoints: [null, { clusters: { 'msTemperatureMeasurement': true } }]
      });
      
      const reportParser = device.registerCapability.mock.calls
        .find(call => call[0] === 'measure_temperature')[2].reportParser;
      
      // 25.5°C (2550 in 0.01°C units)
      const result = reportParser(2550);
      
      expect(result).to.equal(25.5);
      expect(device.state.temperature).to.equal(25.5);
    });

    it('should apply temperature offset', async () => {
      device.state.temperatureOffset = 1.5;
      
      await device.registerTemperatureCapability({
        endpoints: [null, { clusters: { 'msTemperatureMeasurement': true } }]
      });
      
      const reportParser = device.registerCapability.mock.calls
        .find(call => call[0] === 'measure_temperature')[2].reportParser;
      
      // 25.5°C + 1.5°C offset = 27.0°C
      const result = reportParser(2550);
      
      expect(result).to.equal(27.0);
    });
  });

  describe('Humidity Measurement', () => {
    it('should update humidity', async () => {
      await device.registerHumidityCapability({
        endpoints: [null, { clusters: { 'msRelativeHumidity': true } }]
      });
      
      const reportParser = device.registerCapability.mock.calls
        .find(call => call[0] === 'measure_humidity')[2].reportParser;
      
      // 50.5% (5050 in 0.01% units)
      const result = reportParser(5050);
      
      expect(result).to.equal(50.5);
      expect(device.state.humidity).to.equal(50.5);
    });

    it('should apply humidity offset', async () => {
      device.state.humidityOffset = 2.5;
      
      await device.registerHumidityCapability({
        endpoints: [null, { clusters: { 'msRelativeHumidity': true } }]
      });
      
      const reportParser = device.registerCapability.mock.calls
        .find(call => call[0] === 'measure_humidity')[2].reportParser;
      
      // 50.5% + 2.5% offset = 53.0%
      const result = reportParser(5050);
      
      expect(result).to.equal(53.0);
    });
  });

  describe('Contact Sensor', () => {
    it('should detect open contact', async () => {
      await device.registerContactCapability({
        endpoints: [null, { clusters: { 'ssIasZone': true } }]
      });
      
      const reportParser = device.registerCapability.mock.calls
        .find(call => call[0] === 'alarm_contact')[2].reportParser;
      
      // Bit 0 set indicates open
      const result = reportParser({ zoneStatus: 1 });
      
      expect(result).to.be.true;
      expect(device.state.contactState).to.equal('open');
    });

    it('should detect closed contact', async () => {
      device.state.contactState = 'open';
      
      await device.registerContactCapability({
        endpoints: [null, { clusters: { 'ssIasZone': true } }]
      });
      
      const reportParser = device.registerCapability.mock.calls
        .find(call => call[0] === 'alarm_contact')[2].reportParser;
      
      // Bit 0 not set indicates closed
      const result = reportParser({ zoneStatus: 0 });
      
      expect(result).to.be.false;
      expect(device.state.contactState).to.equal('closed');
    });
  });

  describe('Water Leak Detection', () => {
    it('should detect water leak', async () => {
      await device.registerWaterLeakCapability({
        endpoints: [null, { clusters: { 'ssIasZone': true } }]
      });
      
      const reportParser = device.registerCapability.mock.calls
        .find(call => call[0] === 'alarm_water')[2].reportParser;
      
      // Bit 0 set indicates leak
      const result = reportParser({ zoneStatus: 1 });
      
      expect(result).to.be.true;
      expect(device.state.waterLeak).to.be.true;
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
      
      // 75% battery (150 in 0-200 scale)
      reportParser(150);
      
      expect(device.state.battery).to.equal(75);
      expect(device.state.batteryLow).to.be.false;
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
    });
  });

  describe('Settings', () => {
    it('should update motion timeout', async () => {
      const newTimeout = 120;
      
      await device.onSettings({
        oldSettings: { motion_timeout: 60 },
        newSettings: { motion_timeout: newTimeout },
        changedKeys: ['motion_timeout']
      });
      
      expect(device.state.motionTimeoutDuration).to.equal(newTimeout);
    });

    it('should update temperature offset', async () => {
      const newOffset = 1.5;
      
      await device.onSettings({
        oldSettings: { temperature_offset: 0 },
        newSettings: { temperature_offset: newOffset },
        changedKeys: ['temperature_offset']
      });
      
      expect(device.state.temperatureOffset).to.equal(newOffset);
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

  describe('Cleanup', () => {
    it('should clean up timeouts on delete', () => {
      device.state.motionTimeout = setTimeout(() => {}, 1000);
      
      const clearTimeoutSpy = sinon.spy(global, 'clearTimeout');
      device.onDeleted();
      
      expect(clearTimeoutSpy.calledOnce).to.be.true;
      clearTimeoutSpy.restore();
    });
  });
});
