#!/usr/bin/env node
'use strict';

'use strict';

const EventEmitter = require('events');
const DiscoveryManager = require('../../../../src/services/discovery-manager');

// Mock device and group managers
class MockDeviceManager extends EventEmitter {
  constructor() {
    super();
    this.devices = new Map();
    this.pairedDevices = new Set();
  }

  async addDevice(deviceData) {
    const device = {
      id: deviceData.id || `device-${Date.now()}`,
      name: deviceData.name || 'Test Device',
      type: deviceData.type || 'switch',
      data: deviceData.data || {},
      capabilities: deviceData.capabilities || ['onoff'],
      get: jest.fn().mockImplementation((key) => deviceData[key]),
      set: jest.fn().mockImplementation((key, value) => {
        deviceData[key] = value;
        return Promise.resolve();
      })
    };
    this.devices.set(device.id, device);
    return device;
  }

  getDevice(deviceId) {
    return this.devices.get(deviceId) || null;
  }

  async pairDevice(deviceId) {
    if (!this.devices.has(deviceId)) {
      throw new Error(`Device not found: ${deviceId}`);
    }
    this.pairedDevices.add(deviceId);
    this.emit('device:paired', { id: deviceId });
    return { success: true, deviceId };
  }
}

// Mock Zigbee service
class MockZigbeeService extends EventEmitter {
  constructor() {
    super();
    this.isScanning = false;
    this.scanResults = [];
  }

  async startScan() {
    this.isScanning = true;
    this.emit('scan:start');
    return { success: true };
  }

  async stopScan() {
    this.isScanning = false;
    this.emit('scan:stop');
    return { success: true };
  }

  async getPermitJoin() {
    return this.isScanning;
  }

  async setPermitJoin(enabled) {
    this.isScanning = enabled;
    if (enabled) {
      this.emit('permitJoinChanged', { enabled: true });
    }
    return { success: true };
  }

  // Simulate device discovery
  simulateDeviceDiscovery(device) {
    this.emit('device:discovered', device);
  }
}

describe('DiscoveryManager', () => {
  let discoveryManager;
  let deviceManager;
  let zigbeeService;
  let mockLogger;
  
  // Test devices
  const mockDevices = [
    {
      ieeeAddr: '00:11:22:33:44:55:66:77',
      model: 'TS0121',
      manufacturerName: '_TZ3000_abc12345',
      type: 'Router',
      manufacturerID: 4098,
      powerSource: 'Mains (single phase)',
      modelID: 'TS0121',
      hardwareVersion: 1,
      softwareBuildID: '1.0.0',
      dateCode: '20230301',
      lastSeen: Date.now(),
      capabilities: ['onoff', 'measure_voltage', 'measure_current', 'measure_power'],
      friendlyName: 'Tuya Smart Plug'
    },
    {
      ieeeAddr: '11:22:33:44:55:66:77:88',
      model: 'TS0201',
      manufacturerName: '_TZ3000_xyz98765',
      type: 'EndDevice',
      manufacturerID: 4098,
      powerSource: 'Battery',
      modelID: 'TS0201',
      hardwareVersion: 1,
      softwareBuildID: '1.0.1',
      dateCode: '20230315',
      lastSeen: Date.now(),
      capabilities: ['measure_temperature', 'measure_humidity', 'battery'],
      friendlyName: 'Tuya Temperature Sensor'
    }
  ];

  beforeEach(() => {
    // Create a mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    // Initialize managers and services
    deviceManager = new MockDeviceManager();
    zigbeeService = new MockZigbeeService();

    // Initialize DiscoveryManager
    discoveryManager = new DiscoveryManager({
      deviceManager,
      zigbeeService,
      logger: mockLogger
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Stop any running discovery
    discoveryManager.stopDiscovery();
  });

  describe('startDiscovery', () => {
    it('should start discovery mode', async () => {
      const result = await discoveryManager.startDiscovery();
      
      expect(result).toBe(true);
      expect(discoveryManager.isDiscovering()).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Starting device discovery...');
      
      // Verify Zigbee service was called
      expect(zigbeeService.isScanning).toBe(true);
    });

    it('should emit discovery:start event', (done) => {
      discoveryManager.on('discovery:start', () => {
        expect(discoveryManager.isDiscovering()).toBe(true);
        done();
      });
      
      discoveryManager.startDiscovery();
    });

    it('should handle already running discovery', async () => {
      // Start discovery first time
      await discoveryManager.startDiscovery();
      
      // Try to start again
      const result = await discoveryManager.startDiscovery();
      
      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith('Discovery already in progress');
    });
  });

  describe('stopDiscovery', () => {
    it('should stop discovery mode', async () => {
      // Start discovery first
      await discoveryManager.startDiscovery();
      
      // Now stop it
      const result = await discoveryManager.stopDiscovery();
      
      expect(result).toBe(true);
      expect(discoveryManager.isDiscovering()).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith('Stopped device discovery');
      
      // Verify Zigbee service was called
      expect(zigbeeService.isScanning).toBe(false);
    });

    it('should emit discovery:stop event', (done) => {
      discoveryManager.on('discovery:stop', () => {
        expect(discoveryManager.isDiscovering()).toBe(false);
        done();
      });
      
      discoveryManager.startDiscovery().then(() => {
        discoveryManager.stopDiscovery();
      });
    });

    it('should handle when discovery is not running', async () => {
      const result = await discoveryManager.stopDiscovery();
      
      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith('No active discovery to stop');
    });
  });

  describe('handleDeviceDiscovered', () => {
    it('should add a newly discovered device', async () => {
      await discoveryManager.startDiscovery();
      
      // Simulate device discovery
      zigbeeService.simulateDeviceDiscovery(mockDevices[0]);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if device was added to discovered devices
      const discoveredDevices = discoveryManager.getDiscoveredDevices();
      expect(discoveredDevices.length).toBe(1);
      expect(discoveredDevices[0].ieeeAddr).toBe(mockDevices[0].ieeeAddr);
      
      // Check if device:discovered event was emitted
      expect(discoveryManager.emit).toHaveBeenCalledWith(
        'device:discovered',
        expect.objectContaining({
          ieeeAddr: mockDevices[0].ieeeAddr,
          model: mockDevices[0].model
        })
      );
    });

    it('should update existing device if rediscovered', async () => {
      await discoveryManager.startDiscovery();
      
      // First discovery
      zigbeeService.simulateDeviceDiscovery(mockDevices[0]);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Update the device
      const updatedDevice = { ...mockDevices[0], rssi: -60 };
      zigbeeService.simulateDeviceDiscovery(updatedDevice);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should still only have one device (updated)
      const discoveredDevices = discoveryManager.getDiscoveredDevices();
      expect(discoveredDevices.length).toBe(1);
      expect(discoveredDevices[0].rssi).toBe(-60);
    });

    it('should not add invalid devices', async () => {
      await discoveryManager.startDiscovery();
      
      // Simulate invalid device (missing required fields)
      zigbeeService.simulateDeviceDiscovery({
        ieeeAddr: 'invalid',
        // Missing other required fields
      });
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should not add invalid device
      const discoveredDevices = discoveryManager.getDiscoveredDevices();
      expect(discoveredDevices.length).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalledWith('Invalid device discovered, missing required fields');
    });
  });

  describe('pairDevice', () => {
    it('should pair a discovered device', async () => {
      // Start discovery and add a device
      await discoveryManager.startDiscovery();
      zigbeeService.simulateDeviceDiscovery(mockDevices[0]);
      
      // Wait for device to be discovered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get the discovered device ID
      const discoveredDevices = discoveryManager.getDiscoveredDevices();
      const deviceId = discoveredDevices[0].ieeeAddr;
      
      // Pair the device
      const result = await discoveryManager.pairDevice(deviceId);
      
      expect(result).toEqual({
        success: true,
        deviceId: expect.any(String)
      });
      
      // Verify device was added to device manager
      const device = deviceManager.getDevice(result.deviceId);
      expect(device).toBeDefined();
      
      // Verify pairing event was emitted
      expect(discoveryManager.emit).toHaveBeenCalledWith(
        'device:paired',
        expect.objectContaining({
          id: result.deviceId,
          ieeeAddr: deviceId
        })
      );
    });

    it('should handle pairing non-existent device', async () => {
      await expect(
        discoveryManager.pairDevice('nonexistent')
      ).rejects.toThrow('Device not found: nonexistent');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error pairing device: Device not found: nonexistent'
      );
    });

    it('should handle pairing errors', async () => {
      // Mock device manager to throw an error during pairing
      deviceManager.pairDevice = jest.fn().mockRejectedValue(new Error('Pairing failed'));
      
      // Start discovery and add a device
      await discoveryManager.startDiscovery();
      zigbeeService.simulateDeviceDiscovery(mockDevices[0]);
      
      // Wait for device to be discovered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get the discovered device ID
      const discoveredDevices = discoveryManager.getDiscoveredDevices();
      const deviceId = discoveredDevices[0].ieeeAddr;
      
      // Try to pair (should throw)
      await expect(
        discoveryManager.pairDevice(deviceId)
      ).rejects.toThrow('Pairing failed');
      
      // Verify error event was emitted
      expect(discoveryManager.emit).toHaveBeenCalledWith(
        'pairing:error',
        expect.objectContaining({
          deviceId,
          error: expect.any(Error)
        })
      );
    });
  });

  describe('getDiscoveredDevices', () => {
    it('should return empty array when no devices discovered', () => {
      const devices = discoveryManager.getDiscoveredDevices();
      expect(devices).toEqual([]);
    });

    it('should return all discovered devices', async () => {
      // Start discovery and add devices
      await discoveryManager.startDiscovery();
      zigbeeService.simulateDeviceDiscovery(mockDevices[0]);
      zigbeeService.simulateDeviceDiscovery(mockDevices[1]);
      
      // Wait for devices to be discovered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const devices = discoveryManager.getDiscoveredDevices();
      expect(devices.length).toBe(2);
      expect(devices[0].ieeeAddr).toBe(mockDevices[0].ieeeAddr);
      expect(devices[1].ieeeAddr).toBe(mockDevices[1].ieeeAddr);
    });

    it('should filter devices by criteria', async () => {
      // Start discovery and add devices
      await discoveryManager.startDiscovery();
      zigbeeService.simulateDeviceDiscovery(mockDevices[0]);
      zigbeeService.simulateDeviceDiscovery(mockDevices[1]);
      
      // Wait for devices to be discovered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Filter by model
      const plugDevices = discoveryManager.getDiscoveredDevices({ model: 'TS0121' });
      expect(plugDevices.length).toBe(1);
      expect(plugDevices[0].model).toBe('TS0121');
      
      // Filter by type
      const sensorDevices = discoveryManager.getDiscoveredDevices({ type: 'EndDevice' });
      expect(sensorDevices.length).toBe(1);
      expect(sensorDevices[0].type).toBe('EndDevice');
    });
  });

  describe('clearDiscoveredDevices', () => {
    it('should clear all discovered devices', async () => {
      // Start discovery and add devices
      await discoveryManager.startDiscovery();
      zigbeeService.simulateDeviceDiscovery(mockDevices[0]);
      zigbeeService.simulateDeviceDiscovery(mockDevices[1]);
      
      // Wait for devices to be discovered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify devices were added
      let devices = discoveryManager.getDiscoveredDevices();
      expect(devices.length).toBe(2);
      
      // Clear discovered devices
      discoveryManager.clearDiscoveredDevices();
      
      // Verify devices were cleared
      devices = discoveryManager.getDiscoveredDevices();
      expect(devices.length).toBe(0);
      
      // Verify event was emitted
      expect(discoveryManager.emit).toHaveBeenCalledWith('discovery:cleared');
    });
  });

  describe('device identification', () => {
    it('should identify device type based on model and manufacturer', () => {
      // Test with a known device model
      const deviceInfo = discoveryManager.identifyDevice({
        model: 'TS0121',
        manufacturerName: '_TZ3000_abc12345'
      });
      
      expect(deviceInfo).toEqual({
        type: 'switch',
        capabilities: ['onoff', 'measure_voltage', 'measure_current', 'measure_power'],
        name: 'Tuya Smart Plug',
        icon: 'icon.svg',
        driver: 'tuya/switch/TS0121'
      });
      
      // Test with an unknown device model
      const unknownDevice = discoveryManager.identifyDevice({
        model: 'UNKNOWN',
        manufacturerName: 'UNKNOWN'
      });
      
      expect(unknownDevice).toEqual({
        type: 'generic',
        capabilities: ['onoff'],
        name: 'Unknown Device',
        icon: 'generic.svg',
        driver: 'generic/unknown'
      });
    });
  });

  describe('error handling', () => {
    it('should handle errors during discovery', async () => {
      // Mock zigbeeService to throw an error
      zigbeeService.startScan = jest.fn().mockRejectedValue(new Error('Scan failed'));
      
      // Start discovery (should not throw)
      await discoveryManager.startDiscovery();
      
      // Wait for error to be handled
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify error was logged and event was emitted
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error during device discovery:',
        expect.any(Error)
      );
      
      expect(discoveryManager.emit).toHaveBeenCalledWith(
        'discovery:error',
        expect.any(Error)
      );
    });
  });
});
