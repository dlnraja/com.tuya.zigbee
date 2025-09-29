#!/usr/bin/env node
'use strict';

'use strict';

const { CronJob } = require('cron');
const ScheduleManager = require('../../../../src/services/schedule-manager');

// Mock CronJob to prevent actual scheduling during tests
jest.mock('cron', () => ({
  CronJob: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    nextDate: jest.fn().mockReturnValue(new Date(Date.now() + 60000)) // 1 minute in the future
  }))
}));

class MockDeviceManager {
  constructor() {
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

class MockGroupManager {
  constructor() {
    this.groups = new Map();
  }

  getGroup(groupId) {
    return this.groups.get(groupId) || null;
  }

  addGroup(group) {
    this.groups.set(group.id, group);
    return group;
  }

  async executeGroupCommand(groupId, command, data) {
    const group = this.groups.get(groupId);
    if (!group) throw new Error(`Group not found: ${groupId}`);
    
    const result = {
      groupId,
      command,
      data,
      success: true
    };
    
    return Promise.resolve(result);
  }
}

describe('ScheduleManager', () => {
  let scheduleManager;
  let deviceManager;
  let groupManager;
  let mockLogger;
  
  // Mock device and group data
  const mockDevice = {
    id: 'device-1',
    name: 'Test Device',
    type: 'switch',
    turnOn: jest.fn().mockResolvedValue('device-on'),
    turnOff: jest.fn().mockResolvedValue('device-off'),
    sendCommand: jest.fn().mockImplementation((cmd, data) => {
      return Promise.resolve(`device-${cmd}-${JSON.stringify(data)}`);
    })
  };

  const mockGroup = {
    id: 'group-1',
    name: 'Test Group',
    deviceIds: ['device-1', 'device-2'],
    type: 'light'
  };

  beforeEach(() => {
    // Create a mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    // Initialize managers
    deviceManager = new MockDeviceManager();
    groupManager = new MockGroupManager();

    // Add mock data
    deviceManager.addDevice(mockDevice);
    groupManager.addGroup(mockGroup);

    // Initialize ScheduleManager
    scheduleManager = new ScheduleManager({
      deviceManager,
      groupManager,
      logger: mockLogger
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any schedules
    scheduleManager.getAllSchedules().forEach(schedule => {
      scheduleManager.deleteSchedule(schedule.id);
    });
  });

  describe('createSchedule', () => {
    it('should create a new device schedule', async () => {
      const schedule = await scheduleManager.createSchedule({
        name: 'Morning Lights On',
        cronExpression: '0 7 * * *',
        targetType: 'device',
        targetId: mockDevice.id,
        command: 'turnOn',
        data: { brightness: 75 },
        enabled: true
      });

      expect(schedule).toBeDefined();
      expect(schedule.id).toMatch(/^schedule-[a-f0-9-]+$/);
      expect(schedule.name).toBe('Morning Lights On');
      expect(schedule.cronExpression).toBe('0 7 * * *');
      expect(schedule.targetType).toBe('device');
      expect(schedule.targetId).toBe(mockDevice.id);
      expect(schedule.command).toBe('turnOn');
      expect(schedule.data).toEqual({ brightness: 75 });
      expect(schedule.enabled).toBe(true);
      expect(schedule.nextRun).toBeInstanceOf(Date);
      
      // Verify the schedule was added to the manager
      const savedSchedule = scheduleManager.getSchedule(schedule.id);
      expect(savedSchedule).toEqual(schedule);
      
      // Verify the job was started
      expect(CronJob).toHaveBeenCalledWith({
        cronTime: '0 7 * * *',
        onTick: expect.any(Function),
        start: true,
        timeZone: 'UTC'
      });
    });

    it('should create a new group schedule', async () => {
      const schedule = await scheduleManager.createSchedule({
        name: 'Evening Lights Off',
        cronExpression: '0 22 * * *',
        targetType: 'group',
        targetId: mockGroup.id,
        command: 'turnOff',
        enabled: true
      });

      expect(schedule).toBeDefined();
      expect(schedule.targetType).toBe('group');
      expect(schedule.targetId).toBe(mockGroup.id);
      expect(schedule.command).toBe('turnOff');
      
      // Verify the schedule was added to the manager
      const savedSchedule = scheduleManager.getSchedule(schedule.id);
      expect(savedSchedule).toEqual(schedule);
    });

    it('should validate cron expression', async () => {
      await expect(
        scheduleManager.createSchedule({
          name: 'Invalid Schedule',
          cronExpression: 'invalid-cron',
          targetType: 'device',
          targetId: mockDevice.id,
          command: 'turnOn',
          enabled: true
        })
      ).rejects.toThrow('Invalid cron expression');
    });

    it('should validate target type', async () => {
      await expect(
        scheduleManager.createSchedule({
          name: 'Invalid Target',
          cronExpression: '* * * * *',
          targetType: 'invalid',
          targetId: '123',
          command: 'turnOn',
          enabled: true
        })
      ).rejects.toThrow('Target type must be either "device" or "group"');
    });
  });

  describe('getSchedule', () => {
    it('should return null for non-existent schedule', () => {
      const schedule = scheduleManager.getSchedule('nonexistent');
      expect(schedule).toBeNull();
    });

    it('should return the correct schedule', async () => {
      const newSchedule = await scheduleManager.createSchedule({
        name: 'Test Schedule',
        cronExpression: '* * * * *',
        targetType: 'device',
        targetId: mockDevice.id,
        command: 'turnOn',
        enabled: true
      });

      const schedule = scheduleManager.getSchedule(newSchedule.id);
      expect(schedule).toEqual(newSchedule);
    });
  });

  describe('getAllSchedules', () => {
    it('should return all schedules', async () => {
      const schedule1 = await scheduleManager.createSchedule({
        name: 'Schedule 1',
        cronExpression: '0 7 * * *',
        targetType: 'device',
        targetId: mockDevice.id,
        command: 'turnOn',
        enabled: true
      });

      const schedule2 = await scheduleManager.createSchedule({
        name: 'Schedule 2',
        cronExpression: '0 22 * * *',
        targetType: 'group',
        targetId: mockGroup.id,
        command: 'turnOff',
        enabled: true
      });

      const schedules = scheduleManager.getAllSchedules();
      expect(schedules).toHaveLength(2);
      expect(schedules).toContainEqual(schedule1);
      expect(schedules).toContainEqual(schedule2);
    });

    it('should filter schedules by criteria', async () => {
      await scheduleManager.createSchedule({
        name: 'Morning Schedule',
        cronExpression: '0 7 * * *',
        targetType: 'device',
        targetId: mockDevice.id,
        command: 'turnOn',
        enabled: true
      });

      await scheduleManager.createSchedule({
        name: 'Evening Schedule',
        cronExpression: '0 22 * * *',
        targetType: 'group',
        targetId: mockGroup.id,
        command: 'turnOff',
        enabled: false
      });

      // Filter by enabled status
      const enabledSchedules = scheduleManager.getAllSchedules({ enabled: true });
      expect(enabledSchedules).toHaveLength(1);
      expect(enabledSchedules[0].name).toBe('Morning Schedule');

      // Filter by target type
      const groupSchedules = scheduleManager.getAllSchedules({ targetType: 'group' });
      expect(groupSchedules).toHaveLength(1);
      expect(groupSchedules[0].name).toBe('Evening Schedule');
    });
  });

  describe('updateSchedule', () => {
    let schedule;

    beforeEach(async () => {
      schedule = await scheduleManager.createSchedule({
        name: 'Original Schedule',
        cronExpression: '0 7 * * *',
        targetType: 'device',
        targetId: mockDevice.id,
        command: 'turnOn',
        enabled: true
      });
    });

    it('should update schedule properties', async () => {
      const updates = {
        name: 'Updated Schedule',
        cronExpression: '30 7 * * *',
        command: 'turnOff',
        data: { brightness: 50 },
        enabled: false
      };

      const updatedSchedule = scheduleManager.updateSchedule(schedule.id, updates);
      
      expect(updatedSchedule).toBeDefined();
      expect(updatedSchedule.name).toBe('Updated Schedule');
      expect(updatedSchedule.cronExpression).toBe('30 7 * * *');
      expect(updatedSchedule.command).toBe('turnOff');
      expect(updatedSchedule.data).toEqual({ brightness: 50 });
      expect(updatedSchedule.enabled).toBe(false);
      expect(updatedSchedule.updatedAt.getTime()).toBeGreaterThan(schedule.updatedAt.getTime());
      
      // Verify the schedule was updated in the manager
      const savedSchedule = scheduleManager.getSchedule(schedule.id);
      expect(savedSchedule).toEqual(updatedSchedule);
    });

    it('should restart the job if cron expression changes', async () => {
      // Clear previous CronJob mocks
      jest.clearAllMocks();
      
      const updates = {
        cronExpression: '0 8 * * *'
      };

      scheduleManager.updateSchedule(schedule.id, updates);
      
      // Verify a new CronJob was created with the updated expression
      expect(CronJob).toHaveBeenCalledWith({
        cronTime: '0 8 * * *',
        onTick: expect.any(Function),
        start: true,
        timeZone: 'UTC'
      });
    });

    it('should return null for non-existent schedule', () => {
      const updatedSchedule = scheduleManager.updateSchedule('nonexistent', {
        name: 'New Name'
      });
      
      expect(updatedSchedule).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Cannot update: schedule not found: nonexistent'
      );
    });
  });

  describe('deleteSchedule', () => {
    let schedule;

    beforeEach(async () => {
      schedule = await scheduleManager.createSchedule({
        name: 'Test Schedule',
        cronExpression: '0 7 * * *',
        targetType: 'device',
        targetId: mockDevice.id,
        command: 'turnOn',
        enabled: true
      });
    });

    it('should delete an existing schedule', () => {
      const result = scheduleManager.deleteSchedule(schedule.id);
      
      expect(result).toBe(true);
      expect(scheduleManager.getSchedule(schedule.id)).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Deleted schedule: ${schedule.name} (${schedule.id})`
      );
      
      // Verify the job was stopped
      const job = scheduleManager.activeJobs.get(schedule.id);
      expect(job).toBeUndefined();
    });

    it('should return false for non-existent schedule', () => {
      const result = scheduleManager.deleteSchedule('nonexistent');
      
      expect(result).toBe(false);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('enable/disableSchedule', () => {
    let schedule;

    beforeEach(async () => {
      schedule = await scheduleManager.createSchedule({
        name: 'Test Schedule',
        cronExpression: '0 7 * * *',
        targetType: 'device',
        targetId: mockDevice.id,
        command: 'turnOn',
        enabled: false
      });
    });

    it('should enable a disabled schedule', () => {
      const result = scheduleManager.enableSchedule(schedule.id);
      
      expect(result).toBe(true);
      
      const updatedSchedule = scheduleManager.getSchedule(schedule.id);
      expect(updatedSchedule.enabled).toBe(true);
      expect(updatedSchedule.updatedAt.getTime())
        .toBeGreaterThan(schedule.updatedAt.getTime());
      
      // Verify the job was started
      expect(CronJob).toHaveBeenCalledWith({
        cronTime: schedule.cronExpression,
        onTick: expect.any(Function),
        start: true,
        timeZone: 'UTC'
      });
    });

    it('should disable an enabled schedule', async () => {
      // First enable the schedule
      await scheduleManager.enableSchedule(schedule.id);
      jest.clearAllMocks();
      
      const result = scheduleManager.disableSchedule(schedule.id);
      
      expect(result).toBe(true);
      
      const updatedSchedule = scheduleManager.getSchedule(schedule.id);
      expect(updatedSchedule.enabled).toBe(false);
      
      // Verify the job was stopped
      const job = scheduleManager.activeJobs.get(schedule.id);
      expect(job).toBeUndefined();
    });

    it('should return false if schedule is already in the desired state', () => {
      // Try to enable an already disabled schedule (should return false)
      const result1 = scheduleManager.disableSchedule(schedule.id);
      expect(result1).toBe(false);
      
      // Enable the schedule
      scheduleManager.enableSchedule(schedule.id);
      
      // Try to enable an already enabled schedule (should return false)
      const result2 = scheduleManager.enableSchedule(schedule.id);
      expect(result2).toBe(false);
    });
  });

  describe('executeScheduleNow', () => {
    let deviceSchedule;
    let groupSchedule;

    beforeEach(async () => {
      // Create a device schedule
      deviceSchedule = await scheduleManager.createSchedule({
        name: 'Device Schedule',
        cronExpression: '0 7 * * *',
        targetType: 'device',
        targetId: mockDevice.id,
        command: 'turnOn',
        data: { brightness: 75 },
        enabled: true
      });

      // Create a group schedule
      groupSchedule = await scheduleManager.createSchedule({
        name: 'Group Schedule',
        cronExpression: '0 22 * * *',
        targetType: 'group',
        targetId: mockGroup.id,
        command: 'turnOff',
        enabled: true
      });

      // Clear mock calls from setup
      jest.clearAllMocks();
    });

    it('should execute a device schedule immediately', async () => {
      const result = await scheduleManager.executeScheduleNow(deviceSchedule.id);
      
      expect(result).toBeDefined();
      expect(result).toBe('device-on');
      
      // Verify the device method was called
      expect(mockDevice.turnOn).toHaveBeenCalled();
      
      // Verify the schedule was updated with last run time
      const updatedSchedule = scheduleManager.getSchedule(deviceSchedule.id);
      expect(updatedSchedule.lastRun).toBeInstanceOf(Date);
      expect(updatedSchedule.lastError).toBeNull();
      
      // Verify the event was emitted
      expect(scheduleManager.emit).toHaveBeenCalledWith(
        'schedule:executed',
        updatedSchedule,
        'device-on'
      );
    });

    it('should execute a group schedule immediately', async () => {
      const result = await scheduleManager.executeScheduleNow(groupSchedule.id);
      
      expect(result).toBeDefined();
      expect(result).toEqual({
        groupId: mockGroup.id,
        command: 'turnOff',
        data: undefined,
        success: true
      });
      
      // Verify the schedule was updated with last run time
      const updatedSchedule = scheduleManager.getSchedule(groupSchedule.id);
      expect(updatedSchedule.lastRun).toBeInstanceOf(Date);
      expect(updatedSchedule.lastError).toBeNull();
    });

    it('should handle command failures', async () => {
      // Make the device method throw an error
      const error = new Error('Device unreachable');
      mockDevice.turnOn.mockRejectedValueOnce(error);
      
      await expect(
        scheduleManager.executeScheduleNow(deviceSchedule.id)
      ).rejects.toThrow(error);
      
      // Verify the schedule was updated with the error
      const updatedSchedule = scheduleManager.getSchedule(deviceSchedule.id);
      expect(updatedSchedule.lastRun).toBeInstanceOf(Date);
      expect(updatedSchedule.lastError).toBe('Device unreachable');
      
      // Verify the error event was emitted
      expect(scheduleManager.emit).toHaveBeenCalledWith(
        'schedule:error',
        expect.objectContaining({
          id: deviceSchedule.id,
          lastError: 'Device unreachable'
        }),
        error
      );
    });

    it('should throw an error for non-existent schedule', async () => {
      await expect(
        scheduleManager.executeScheduleNow('nonexistent')
      ).rejects.toThrow('Schedule not found: nonexistent');
    });
  });

  describe('_executeSchedule', () => {
    let schedule;

    beforeEach(async () => {
      schedule = await scheduleManager.createSchedule({
        name: 'Test Schedule',
        cronExpression: '0 7 * * *',
        targetType: 'device',
        targetId: mockDevice.id,
        command: 'turnOn',
        enabled: true
      });

      // Mock the CronJob's nextDate method
      const job = scheduleManager.activeJobs.get(schedule.id);
      job.nextDate.mockReturnValue(new Date(Date.now() + 60000)); // 1 minute in the future
    });

    it('should execute the schedule and update lastRun and nextRun', async () => {
      // Mock the device method
      mockDevice.turnOn.mockResolvedValueOnce('device-on');
      
      // Get the schedule execution function from the CronJob
      const job = scheduleManager.activeJobs.get(schedule.id);
      const onTick = job.onTick;
      
      // Execute the schedule
      await onTick();
      
      // Verify the device method was called
      expect(mockDevice.turnOn).toHaveBeenCalled();
      
      // Verify the schedule was updated
      const updatedSchedule = scheduleManager.getSchedule(schedule.id);
      expect(updatedSchedule.lastRun).toBeInstanceOf(Date);
      expect(updatedSchedule.nextRun).toBeInstanceOf(Date);
      expect(updatedSchedule.lastError).toBeNull();
      
      // Verify the event was emitted
      expect(scheduleManager.emit).toHaveBeenCalledWith(
        'schedule:executed',
        updatedSchedule,
        'device-on'
      );
    });
  });
});
