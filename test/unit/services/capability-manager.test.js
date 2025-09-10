#!/usr/bin/env node
'use strict';

'use strict';

const CapabilityManager = require('../../../../src/services/capability-manager');

describe('CapabilityManager', () => {
  let capabilityManager;
  let mockLogger;

  beforeEach(() => {
    // Create a mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    // Initialize a new CapabilityManager before each test
    capabilityManager = new CapabilityManager({
      logger: mockLogger
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default capabilities', () => {
      // Default capabilities should be registered
      expect(capabilityManager.hasCapability('onoff')).toBe(true);
      expect(capabilityManager.hasCapability('dim')).toBe(true);
      expect(capabilityManager.hasCapability('measure_temperature')).toBe(true);
      expect(capabilityManager.hasCapability('measure_humidity')).toBe(true);
    });
  });

  describe('registerCapabilityHandler', () => {
    it('should register a new capability handler', () => {
      const testCapability = 'test_capability';
      const mockHandler = {
        get: jest.fn().mockResolvedValue(42),
        set: jest.fn().mockResolvedValue(true)
      };

      capabilityManager.registerCapabilityHandler(testCapability, mockHandler);
      
      expect(capabilityManager.hasCapability(testCapability)).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Registered handler for capability: ${testCapability}`
      );
    });

    it('should throw an error for invalid capability ID', () => {
      expect(() => {
        capabilityManager.registerCapabilityHandler('', { get: jest.fn() });
      }).toThrow('Invalid capability ID');
    });

    it('should throw an error if get function is not provided', () => {
      expect(() => {
        capabilityManager.registerCapabilityHandler('test', {});
      }).toThrow('Capability handler must have a get function');
    });
  });

  describe('getCapabilityValue', () => {
    it('should get a capability value', async () => {
      const mockDevice = {
        id: 'test-device',
        state: { onoff: true }
      };
      
      const value = await capabilityManager.getCapabilityValue(mockDevice, 'onoff');
      
      expect(value).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Got onoff value for test-device:',
        true
      );
    });

    it('should throw an error for unregistered capability', async () => {
      const mockDevice = { id: 'test-device' };
      
      await expect(
        capabilityManager.getCapabilityValue(mockDevice, 'nonexistent')
      ).rejects.toThrow('No handler registered for capability: nonexistent');
    });

    it('should log and rethrow errors from the getter', async () => {
      const mockError = new Error('Failed to get value');
      const mockDevice = { id: 'test-device' };
      
      // Register a failing capability
      capabilityManager.registerCapabilityHandler('failing', {
        get: async () => { throw mockError; }
      });
      
      await expect(
        capabilityManager.getCapabilityValue(mockDevice, 'failing')
      ).rejects.toThrow(mockError);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error getting failing value for test-device:',
        mockError
      );
    });
  });

  describe('setCapabilityValue', () => {
    it('should set a capability value', async () => {
      const mockDevice = {
        id: 'test-device',
        sendCommand: jest.fn().mockResolvedValue(true)
      };
      
      const result = await capabilityManager.setCapabilityValue(mockDevice, 'onoff', true);
      
      expect(result).toBe(true);
      expect(mockDevice.sendCommand).toHaveBeenCalledWith('set_onoff', { value: true });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Setting onoff for test-device to:',
        true
      );
    });

    it('should throw an error for read-only capability', async () => {
      const mockDevice = { id: 'test-device' };
      
      // Register a read-only capability
      capabilityManager.registerCapabilityHandler('readonly', {
        get: jest.fn().mockResolvedValue(42)
      });
      
      await expect(
        capabilityManager.setCapabilityValue(mockDevice, 'readonly', 100)
      ).rejects.toThrow('Capability readonly is read-only');
    });

    it('should throw an error for unregistered capability', async () => {
      const mockDevice = { id: 'test-device' };
      
      await expect(
        capabilityManager.setCapabilityValue(mockDevice, 'nonexistent', true)
      ).rejects.toThrow('No handler registered for capability: nonexistent');
    });

    it('should log and rethrow errors from the setter', async () => {
      const mockError = new Error('Failed to set value');
      const mockDevice = { id: 'test-device' };
      
      // Register a failing capability
      capabilityManager.registerCapabilityHandler('failing', {
        get: jest.fn().mockResolvedValue(0),
        set: async () => { throw mockError; }
      });
      
      await expect(
        capabilityManager.setCapabilityValue(mockDevice, 'failing', 100)
      ).rejects.toThrow(mockError);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error setting failing for test-device:',
        mockError
      );
    });
  });

  describe('defaultCapabilities', () => {
    it('should get default capabilities for a device type', () => {
      const lightCapabilities = capabilityManager.getDefaultCapabilities('light');
      expect(lightCapabilities).toContain('onoff');
      expect(lightCapabilities).toContain('dim');
    });

    it('should return empty array for unknown device type', () => {
      const capabilities = capabilityManager.getDefaultCapabilities('unknown');
      expect(capabilities).toEqual([]);
    });

    it('should set default capabilities for a device type', () => {
      const newCapabilities = ['onoff', 'dim', 'color'];
      capabilityManager.setDefaultCapabilities('custom', newCapabilities);
      
      const capabilities = capabilityManager.getDefaultCapabilities('custom');
      expect(capabilities).toEqual(newCapabilities);
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Updated default capabilities for custom:',
        newCapabilities
      );
    });
  });

  describe('default capability handlers', () => {
    describe('onoff', () => {
      it('should get onoff state from device', async () => {
        const mockDevice = { state: { onoff: true } };
        const value = await capabilityManager.getCapabilityValue(mockDevice, 'onoff');
        expect(value).toBe(true);
      });

      it('should set onoff state using sendCommand', async () => {
        const mockDevice = {
          sendCommand: jest.fn().mockResolvedValue(true)
        };
        
        const result = await capabilityManager.setCapabilityValue(mockDevice, 'onoff', true);
        expect(result).toBe(true);
        expect(mockDevice.sendCommand).toHaveBeenCalledWith('set_onoff', { value: true });
      });

      it('should throw error if sendCommand is not available', async () => {
        const mockDevice = {};
        
        await expect(
          capabilityManager.setCapabilityValue(mockDevice, 'onoff', true)
        ).rejects.toThrow('Device does not support on/off commands');
      });
    });

    describe('dim', () => {
      it('should get dim level from device', async () => {
        const mockDevice = { state: { dim: 0.75 } };
        const value = await capabilityManager.getCapabilityValue(mockDevice, 'dim');
        expect(value).toBe(0.75);
      });

      it('should set dim level using sendCommand', async () => {
        const mockDevice = {
          sendCommand: jest.fn().mockResolvedValue(true)
        };
        
        const result = await capabilityManager.setCapabilityValue(mockDevice, 'dim', 0.5);
        expect(result).toBe(true);
        expect(mockDevice.sendCommand).toHaveBeenCalledWith('set_dim', { value: 0.5 });
      });
    });

    describe('measure_temperature', () => {
      it('should get temperature from device state', async () => {
        const mockDevice = { state: { temperature: 22.5 } };
        const value = await capabilityManager.getCapabilityValue(mockDevice, 'measure_temperature');
        expect(value).toBe(22.5);
      });

      it('should return null if temperature is not available', async () => {
        const mockDevice = { state: {} };
        const value = await capabilityManager.getCapabilityValue(mockDevice, 'measure_temperature');
        expect(value).toBeNull();
      });
    });
  });
});
