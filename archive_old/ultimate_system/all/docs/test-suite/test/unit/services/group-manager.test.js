#!/usr/bin/env node
'use strict';

'use strict';

const GroupManager = require('../../../../src/services/group-manager');
const EventEmitter = require('events');

class MockDeviceManager extends EventEmitter {
  constructor() {
    super();
    this.devices = new Map();
  }

  getDevice(deviceId) {
    return this.devices.get(deviceId) || null;
  }

  addDevice(device) {
    this.devices.set(device.id, device);
    return device;
  }
}

describe('GroupManager', () => {
  let groupManager;
  let deviceManager;
  let mockLogger;
  
  // Mock devices
  const mockDevices = [
    { id: 'device-1', name: 'Device 1', type: 'light' },
    { id: 'device-2', name: 'Device 2', type: 'light' },
    { id: 'device-3', name: 'Device 3', type: 'switch' },
  ];

  beforeEach(() => {
    // Create a mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    // Initialize device manager with mock devices
    deviceManager = new MockDeviceManager();
    mockDevices.forEach(device => deviceManager.addDevice(device));

    // Initialize GroupManager
    groupManager = new GroupManager({
      deviceManager,
      logger: mockLogger
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createGroup', () => {
    it('should create a new group with valid parameters', () => {
      const group = groupManager.createGroup({
        name: 'Test Group',
        deviceIds: ['device-1', 'device-2'],
        type: 'light'
      });

      expect(group).toBeDefined();
      expect(group.id).toMatch(/^group-[a-f0-9-]+$/);
      expect(group.name).toBe('Test Group');
      expect(group.deviceIds).toEqual(['device-1', 'device-2']);
      expect(group.type).toBe('light');
      expect(group.createdAt).toBeInstanceOf(Date);
      expect(group.updatedAt).toBeInstanceOf(Date);
      
      // Verify the group was added to the manager
      const savedGroup = groupManager.getGroup(group.id);
      expect(savedGroup).toEqual(group);
    });

    it('should validate device IDs when creating a group', () => {
      // Non-existent device IDs should be filtered out
      const group = groupManager.createGroup({
        name: 'Test Group',
        deviceIds: ['device-1', 'nonexistent-device', 'device-3'],
        type: 'mixed'
      });

      expect(group.deviceIds).toEqual(['device-1', 'device-3']);
      expect(mockLogger.warn).toHaveBeenCalledWith('Skipping invalid device ID: nonexistent-device');
    });

    it('should throw an error if name is missing', () => {
      expect(() => {
        groupManager.createGroup({
          deviceIds: ['device-1']
        });
      }).toThrow('Group name is required');
    });
  });

  describe('getGroup', () => {
    it('should return null for non-existent group', () => {
      const group = groupManager.getGroup('nonexistent-group');
      expect(group).toBeNull();
    });

    it('should return the correct group', () => {
      const newGroup = groupManager.createGroup({
        name: 'Test Group',
        deviceIds: ['device-1'],
        type: 'light'
      });

      const group = groupManager.getGroup(newGroup.id);
      expect(group).toEqual(newGroup);
    });
  });

  describe('getAllGroups', () => {
    it('should return all groups', () => {
      const group1 = groupManager.createGroup({
        name: 'Group 1',
        deviceIds: ['device-1'],
        type: 'light'
      });
      
      const group2 = groupManager.createGroup({
        name: 'Group 2',
        deviceIds: ['device-2', 'device-3'],
        type: 'mixed'
      });

      const groups = groupManager.getAllGroups();
      expect(groups).toHaveLength(2);
      expect(groups).toContainEqual(group1);
      expect(groups).toContainEqual(group2);
    });

    it('should return an empty array if no groups exist', () => {
      const groups = groupManager.getAllGroups();
      expect(groups).toEqual([]);
    });
  });

  describe('updateGroup', () => {
    let group;

    beforeEach(() => {
      group = groupManager.createGroup({
        name: 'Original Group',
        deviceIds: ['device-1'],
        type: 'light'
      });
    });

    it('should update group properties', () => {
      const updates = {
        name: 'Updated Group',
        type: 'mixed',
        deviceIds: ['device-1', 'device-2']
      };

      const updatedGroup = groupManager.updateGroup(group.id, updates);
      
      expect(updatedGroup.name).toBe('Updated Group');
      expect(updatedGroup.type).toBe('mixed');
      expect(updatedGroup.deviceIds).toEqual(['device-1', 'device-2']);
      expect(updatedGroup.updatedAt.getTime()).toBeGreaterThan(group.updatedAt.getTime());
      
      // Verify the group was updated in the manager
      const savedGroup = groupManager.getGroup(group.id);
      expect(savedGroup).toEqual(updatedGroup);
    });

    it('should filter out invalid device IDs when updating', () => {
      const updates = {
        deviceIds: ['device-1', 'nonexistent-device', 'device-3']
      };

      const updatedGroup = groupManager.updateGroup(group.id, updates);
      expect(updatedGroup.deviceIds).toEqual(['device-1', 'device-3']);
      expect(mockLogger.warn).toHaveBeenCalledWith('Skipping invalid device ID: nonexistent-device');
    });

    it('should return null for non-existent group', () => {
      const updatedGroup = groupManager.updateGroup('nonexistent-group', {
        name: 'New Name'
      });
      
      expect(updatedGroup).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith('Cannot update: group not found: nonexistent-group');
    });
  });

  describe('deleteGroup', () => {
    let group;

    beforeEach(() => {
      group = groupManager.createGroup({
        name: 'Test Group',
        deviceIds: ['device-1'],
        type: 'light'
      });
    });

    it('should delete an existing group', () => {
      const result = groupManager.deleteGroup(group.id);
      
      expect(result).toBe(true);
      expect(groupManager.getGroup(group.id)).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith(`Deleted group: ${group.name} (${group.id})`);
    });

    it('should return false for non-existent group', () => {
      const result = groupManager.deleteGroup('nonexistent-group');
      
      expect(result).toBe(false);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('getGroupsForDevice', () => {
    it('should return groups containing the device', () => {
      const group1 = groupManager.createGroup({
        name: 'Group 1',
        deviceIds: ['device-1', 'device-2'],
        type: 'light'
      });
      
      const group2 = groupManager.createGroup({
        name: 'Group 2',
        deviceIds: ['device-2', 'device-3'],
        type: 'mixed'
      });

      // Device 2 is in both groups
      const groups = groupManager.getGroupsForDevice('device-2');
      expect(groups).toHaveLength(2);
      expect(groups).toContainEqual(group1);
      expect(groups).toContainEqual(group2);

      // Device 1 is only in group 1
      const groupsForDevice1 = groupManager.getGroupsForDevice('device-1');
      expect(groupsForDevice1).toEqual([group1]);

      // Device 3 is only in group 2
      const groupsForDevice3 = groupManager.getGroupsForDevice('device-3');
      expect(groupsForDevice3).toEqual([group2]);
    });

    it('should return an empty array if device is not in any group', () => {
      // Create groups that don't include device-1
      groupManager.createGroup({
        name: 'Group 1',
        deviceIds: ['device-2', 'device-3'],
        type: 'mixed'
      });

      const groups = groupManager.getGroupsForDevice('device-1');
      expect(groups).toEqual([]);
    });
  });

  describe('executeGroupCommand', () => {
    let group;
    let mockDevice1;
    let mockDevice2;

    beforeEach(() => {
      // Create mock devices with command methods
      mockDevice1 = {
        id: 'device-1',
        name: 'Device 1',
        type: 'light',
        turnOn: jest.fn().mockResolvedValue('device-1-on'),
        turnOff: jest.fn().mockResolvedValue('device-1-off'),
        sendCommand: jest.fn().mockImplementation((cmd, data) => {
          return Promise.resolve(`device-1-${cmd}-${JSON.stringify(data)}`);
        })
      };

      mockDevice2 = {
        id: 'device-2',
        name: 'Device 2',
        type: 'light',
        turnOn: jest.fn().mockResolvedValue('device-2-on'),
        turnOff: jest.fn().mockResolvedValue('device-2-off'),
        sendCommand: jest.fn().mockImplementation((cmd, data) => {
          return Promise.resolve(`device-2-${cmd}-${JSON.stringify(data)}`);
        })
      };

      // Add mock devices to device manager
      deviceManager.addDevice(mockDevice1);
      deviceManager.addDevice(mockDevice2);

      // Create a group with the mock devices
      group = groupManager.createGroup({
        name: 'Test Group',
        deviceIds: [mockDevice1.id, mockDevice2.id],
        type: 'light'
      });
    });

    it('should execute a command on all devices in the group', async () => {
      const result = await groupManager.executeGroupCommand(group.id, 'turnOn');
      
      expect(result).toEqual({
        groupId: group.id,
        command: 'turnOn',
        total: 2,
        successful: 2,
        failed: 0,
        results: [
          { deviceId: 'device-1', result: 'device-1-on' },
          { deviceId: 'device-2', result: 'device-2-on' }
        ],
        errors: []
      });

      // Verify the command was called on both devices
      expect(mockDevice1.turnOn).toHaveBeenCalled();
      expect(mockDevice2.turnOn).toHaveBeenCalled();
    });

    it('should handle command failures', async () => {
      // Make device-2 fail
      const error = new Error('Failed to execute command');
      mockDevice2.turnOn.mockRejectedValueOnce(error);

      const result = await groupManager.executeGroupCommand(group.id, 'turnOn');
      
      expect(result).toEqual({
        groupId: group.id,
        command: 'turnOn',
        total: 2,
        successful: 1,
        failed: 1,
        results: [
          { deviceId: 'device-1', result: 'device-1-on' }
        ],
        errors: [
          { deviceId: 'device-2', error }
        ]
      });

      // Verify the command was called on both devices
      expect(mockDevice1.turnOn).toHaveBeenCalled();
      expect(mockDevice2.turnOn).toHaveBeenCalled();
    });

    it('should use sendCommand if direct method is not available', async () => {
      const result = await groupManager.executeGroupCommand(
        group.id, 
        'setBrightness', 
        { level: 75 }
      );
      
      expect(result).toEqual({
        groupId: group.id,
        command: 'setBrightness',
        total: 2,
        successful: 2,
        failed: 0,
        results: [
          { deviceId: 'device-1', result: 'device-1-setBrightness-{\"level\":75}' },
          { deviceId: 'device-2', result: 'device-2-setBrightness-{\"level\":75}' }
        ],
        errors: []
      });

      // Verify sendCommand was called with the correct parameters
      expect(mockDevice1.sendCommand).toHaveBeenCalledWith('setBrightness', { level: 75 });
      expect(mockDevice2.sendCommand).toHaveBeenCalledWith('setBrightness', { level: 75 });
    });

    it('should throw an error if group is not found', async () => {
      await expect(
        groupManager.executeGroupCommand('nonexistent-group', 'turnOn')
      ).rejects.toThrow('Group not found: nonexistent-group');
    });
  });

  describe('event handling', () => {
    it('should remove device from groups when device is removed', () => {
      const group1 = groupManager.createGroup({
        name: 'Group 1',
        deviceIds: ['device-1', 'device-2'],
        type: 'light'
      });
      
      const group2 = groupManager.createGroup({
        name: 'Group 2',
        deviceIds: ['device-2', 'device-3'],
        type: 'mixed'
      });

      // Simulate device-2 being removed
      deviceManager.emit('device:removed', { id: 'device-2' });

      // Verify device-2 was removed from both groups
      const updatedGroup1 = groupManager.getGroup(group1.id);
      const updatedGroup2 = groupManager.getGroup(group2.id);
      
      expect(updatedGroup1.deviceIds).toEqual(['device-1']);
      expect(updatedGroup2.deviceIds).toEqual(['device-3']);
    });
  });
});
