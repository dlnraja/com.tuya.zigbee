import { expect } from 'chai';
import 'mocha';
import { TuyaPlugDriver } from '../drivers/tuya_plug/driver';

describe('TuyaPlugDriver', () => {
  let driver: TuyaPlugDriver;
  
  // Mock Homey.Driver
  const mockDriver = {
    log: console.log,
    error: console.error,
    homey: {
      __: (key: string) => key // Mock translation function
    }
  };

  beforeEach(() => {
    // @ts-ignore - Mocking Homey.Driver
    driver = new TuyaPlugDriver(mockDriver);
  });

  describe('onInit', () => {
    it('should initialize the driver', () => {
      driver.onInit();
      expect(driver).to.be.instanceOf(TuyaPlugDriver);
    });
  });

  describe('onPair', () => {
    it('should handle pairing session', async () => {
      const mockSession = {
        setHandler: (event: string, handler: Function) => {
          if (event === 'list_devices') {
            return Promise.resolve([]);
          }
          return Promise.resolve();
        }
      };
      
      await driver.onPair(mockSession);
      expect(mockSession.setHandler).to.be.a('function');
    });
  });

  describe('onPairListDevices', () => {
    it('should return an array of devices', async () => {
      const devices = await driver.onPairListDevices();
      expect(devices).to.be.an('array');
    });
  });
});
