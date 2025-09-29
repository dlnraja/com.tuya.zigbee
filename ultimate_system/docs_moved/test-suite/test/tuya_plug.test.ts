import { expect } from 'chai';
import 'mocha';
import { TuyaPlugDevice } from '../drivers/tuya_plug/device';

describe('TuyaPlugDevice', () => {
  let device: TuyaPlugDevice;
  
  // Mock Homey.Device
  const mockDevice = {
    log: console.log,
    error: console.error,
    getData: () => ({
      id: 'test-device-id',
      key: 'test-key',
      ip: '192.168.1.100'
    }),
    getSettings: () => ({
      polling_interval: 30,
      power_threshold: 5
    }),
    setAvailable: () => Promise.resolve(),
    setUnavailable: () => Promise.resolve(),
    setCapabilityValue: () => Promise.resolve(),
    getStoreValue: () => 0,
    setStoreValue: () => Promise.resolve(),
    getCapabilityValue: () => false,
    registerCapabilityListener: () => Promise.resolve(),
    on: () => {}
  };

  beforeEach(() => {
    // @ts-ignore - Mocking Homey.Device
    device = new TuyaPlugDevice(mockDevice);
  });

  describe('onInit', () => {
    it('should initialize the device', async () => {
      await device.onInit();
      expect(device).to.be.instanceOf(TuyaPlugDevice);
    });
  });

  describe('setPowerState', () => {
    it('should set the power state', async () => {
      // Mock Tuya device
      const mockTuyaDevice = {
        set: async () => true,
        on: () => {}
      };
      // @ts-ignore - Mocking TuyaDevice
      device.tuyaDevice = mockTuyaDevice;
      
      const result = await device['setPowerState'](true);
      expect(result).to.be.true;
    });
  });

  describe('handleDeviceUpdate', () => {
    it('should handle device update', () => {
      const testData = {
        dps: {
          '1': true,
          '18': 45.6,
          '19': 0.2,
          '20': 230.5
        }
      };
      
      device['handleDeviceUpdate'](testData);
      // Verify the status was updated
      expect(device['status'].onoff).to.be.true;
      expect(device['status'].power).to.equal(45.6);
    });
  });
});
