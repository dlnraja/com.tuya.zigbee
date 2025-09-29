#!/usr/bin/env node
'use strict';

'use strict';

const EventEmitter = require('events');
const ZigbeeService = require('../../../../src/services/zigbee-service');

describe('ZigbeeService', () => {
  let zigbeeService;
  let mockLogger;
  
  // Mock device data
  const mockDevice = {
    ieeeAddr: '00:11:22:33:44:55:66:77',
    modelID: 'TS0121',
    manufacturerName: '_TZ3000_abc12345',
    type: 'Router',
    manufacturerID: 4098,
    powerSource: 'Mains (single phase)',
    hardwareVersion: 1,
    softwareBuildID: '1.0.0',
    dateCode: '20230301',
    lastSeen: Date.now()
  };

  beforeEach(() => {
    // Create a mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    // Initialize the service with test configuration
    zigbeeService = new ZigbeeService({
      logger: mockLogger,
      port: 'COM3',
      baudRate: 115200
    });
    
    // Mock the _initializeAdapter method to avoid actual hardware access
    zigbeeService._initializeAdapter = jest.fn().mockResolvedValue(true);
    zigbeeService._closeConnection = jest.fn().mockResolvedValue(true);
    
    // Mock the _handleIncomingMessage method
    zigbeeService._handleIncomingMessage = jest.fn();
    
    // Mock the _startMessageHandler method
    zigbeeService._startMessageHandler = jest.fn();
  });

  afterEach(async () => {
    // Clean up after each test
    if (zigbeeService.isConnected) {
      await zigbeeService.close();
    }
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await zigbeeService.initialize();
      
      expect(zigbeeService.isConnected).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Initializing Zigbee service...');
      expect(zigbeeService._initializeAdapter).toHaveBeenCalled();
      expect(zigbeeService._startMessageHandler).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Zigbee service initialized');
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Failed to initialize');
      zigbeeService._initializeAdapter.mockRejectedValueOnce(error);
      
      await expect(zigbeeService.initialize()).rejects.toThrow(error);
      expect(zigbeeService.isConnected).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize Zigbee service:', error);
    });
  });

  describe('device discovery', () => {
    beforeEach(async () => {
      await zigbeeService.initialize();
    });

    it('should start discovery', async () => {
      const result = await zigbeeService.startDiscovery(30);
      
      expect(result).toBe(true);
      expect(zigbeeService.isScanning).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Starting device discovery for 30 seconds...');
      
      // Verify permit join was enabled
      expect(zigbeeService.permitJoin).toBe(true);
      
      // Verify events were emitted
      expect(zigbeeService.emit).toHaveBeenCalledWith('discovery:started');
    });

    it('should stop discovery', async () => {
      await zigbeeService.startDiscovery(30);
      jest.clearAllMocks();
      
      const result = await zigbeeService.stopDiscovery();
      
      expect(result).toBe(true);
      expect(zigbeeService.isScanning).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith('Stopping device discovery');
      
      // Verify permit join was disabled
      expect(zigbeeService.permitJoin).toBe(false);
      
      // Verify events were emitted
      expect(zigbeeService.emit).toHaveBeenCalledWith('discovery:stopped');
    });

    it('should handle device announcements', () => {
      // Simulate a device announcement
      zigbeeService._handleDeviceAnnounce(mockDevice);
      
      // Verify the device was added
      const devices = Array.from(zigbeeService.devices.values());
      expect(devices.length).toBe(1);
      expect(devices[0].ieeeAddr).toBe(mockDevice.ieeeAddr);
      
      // Verify events were emitted
      expect(zigbeeService.emit).toHaveBeenCalledWith('device:discovered', expect.any(Object));
    });
  });

  describe('device management', () => {
    beforeEach(async () => {
      await zigbeeService.initialize();
      
      // Add a test device
      zigbeeService._handleDeviceAnnounce(mockDevice);
    });

    it('should get a device by ID', async () => {
      const device = await zigbeeService.getDevice(mockDevice.ieeeAddr);
      
      expect(device).toBeDefined();
      expect(device.ieeeAddr).toBe(mockDevice.ieeeAddr);
      expect(device.modelID).toBe(mockDevice.modelID);
    });

    it('should throw when getting a non-existent device', async () => {
      await expect(zigbeeService.getDevice('nonexistent')).rejects.toThrow('Device not found: nonexistent');
    });

    it('should get all devices', async () => {
      const devices = await zigbeeService.getDevices();
      
      expect(Array.isArray(devices)).toBe(true);
      expect(devices.length).toBe(1);
      expect(devices[0].ieeeAddr).toBe(mockDevice.ieeeAddr);
    });
  });

  describe('command handling', () => {
    const deviceId = '00:11:22:33:44:55:66:77';
    const command = 'toggle';
    const params = { state: 'on' };
    
    beforeEach(async () => {
      await zigbeeService.initialize();
    });

    it('should send a command to a device', async () => {
      const result = await zigbeeService.sendCommand(deviceId, command, params);
      
      expect(result).toEqual({
        success: true,
        deviceId,
        command,
        params,
        result: 'OK',
        timestamp: expect.any(String)
      });
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Sending command to ${deviceId}: ${command}`,
        params
      );
    });

    it('should throw when sending a command while not connected', async () => {
      await zigbeeService.close();
      
      await expect(
        zigbeeService.sendCommand(deviceId, command, params)
      ).rejects.toThrow('Zigbee service not connected');
    });
  });

  describe('permit join', () => {
    beforeEach(async () => {
      await zigbeeService.initialize();
    });

    it('should enable permit join', async () => {
      const result = await zigbeeService.setPermitJoin(true);
      
      expect(result).toBe(true);
      expect(zigbeeService.permitJoin).toBe(true);
      expect(zigbeeService.emit).toHaveBeenCalledWith('permitJoinChanged', { enabled: true });
    });

    it('should disable permit join', async () => {
      // First enable
      await zigbeeService.setPermitJoin(true);
      jest.clearAllMocks();
      
      // Then disable
      const result = await zigbeeService.setPermitJoin(false);
      
      expect(result).toBe(false);
      expect(zigbeeService.permitJoin).toBe(false);
      expect(zigbeeService.emit).toHaveBeenCalledWith('permitJoinChanged', { enabled: false });
    });

    it('should get the current permit join state', async () => {
      // Default state
      expect(await zigbeeService.getPermitJoin()).toBe(false);
      
      // After enabling
      await zigbeeService.setPermitJoin(true);
      expect(await zigbeeService.getPermitJoin()).toBe(true);
    });
  });

  describe('reset', () => {
    beforeEach(async () => {
      await zigbeeService.initialize();
      
      // Mock the re-initialization
      zigbeeService.initialize = jest.fn().mockResolvedValue(true);
    });

    it('should reset the Zigbee adapter', async () => {
      const result = await zigbeeService.reset();
      
      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Resetting Zigbee adapter...');
      expect(zigbeeService.initialize).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should close the connection', async () => {
      await zigbeeService.initialize();
      
      const result = await zigbeeService.close();
      
      expect(result).toBeUndefined();
      expect(zigbeeService.isConnected).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith('Closing Zigbee service...');
      expect(zigbeeService._closeConnection).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Zigbee service closed');
    });

    it('should stop discovery before closing', async () => {
      await zigbeeService.initialize();
      await zigbeeService.startDiscovery(30);
      
      // Mock stopDiscovery
      zigbeeService.stopDiscovery = jest.fn().mockResolvedValue(true);
      
      await zigbeeService.close();
      
      expect(zigbeeService.stopDiscovery).toHaveBeenCalled();
    });
  });

  describe('device type detection', () => {
    it('should detect plug type', () => {
      const device = { modelID: 'TS0121', manufacturerName: '_TZ3000_abc12345' };
      const type = zigbeeService._determineDeviceType(device);
      expect(type).toBe('plug');
    });

    it('should detect switch type', () => {
      const device = { modelID: 'TS0011', manufacturerName: '_TZ3000_xyz98765' };
      const type = zigbeeService._determineDeviceType(device);
      expect(type).toBe('switch');
    });

    it('should detect sensor type', () => {
      const device = { modelID: 'TS0201', manufacturerName: '_TZ3000_sensor123' };
      const type = zigbeeService._determineDeviceType(device);
      expect(type).toBe('sensor');
    });

    it('should detect dimmer type', () => {
      const device = { modelID: 'TS110E', manufacturerName: '_TZ3000_dimmer456' };
      const type = zigbeeService._determineDeviceType(device);
      expect(type).toBe('dimmer');
    });

    it('should detect thermostat type', () => {
      const device = { modelID: 'TS0601', manufacturerName: '_TZ3000_thermostat' };
      const type = zigbeeService._determineDeviceType(device);
      expect(type).toBe('thermostat');
    });

    it('should detect Xiaomi/Aqara devices as sensors', () => {
      const device = { modelID: 'lumi.sensor_motion', manufacturerName: 'LUMI' };
      const type = zigbeeService._determineDeviceType(device);
      expect(type).toBe('sensor');
    });

    it('should detect IKEA devices as lights', () => {
      const device = { modelID: 'LED1536G5', manufacturerName: 'IKEA of Sweden' };
      const type = zigbeeService._determineDeviceType(device);
      expect(type).toBe('light');
    });

    it('should detect Philips Hue devices as lights', () => {
      const device = { modelID: 'LCT012', manufacturerName: 'Philips' };
      const type = zigbeeService._determineDeviceType(device);
      expect(type).toBe('light');
    });

    it('should return generic type for unknown devices', () => {
      const device = { modelID: 'UNKNOWN', manufacturerName: 'UNKNOWN' };
      const type = zigbeeService._determineDeviceType(device);
      expect(type).toBe('generic');
    });
  });
});
