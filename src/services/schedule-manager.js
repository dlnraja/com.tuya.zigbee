#!/usr/bin/env node
'use strict';

'use strict';

const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');
const { CronJob } = require('cron');

/**
 * Schedule Manager Service
 * Manages scheduled tasks for devices and groups
 */
class ScheduleManager extends EventEmitter {
  /**
   * Create a new ScheduleManager instance
   * @param {Object} options - Configuration options
   * @param {Object} options.deviceManager - DeviceManager instance
   * @param {Object} options.groupManager - GroupManager instance
   * @param {Object} options.logger - Logger instance
   */
  constructor({ deviceManager, groupManager, logger }) {
    super();
    this.deviceManager = deviceManager;
    this.groupManager = groupManager;
    this.logger = logger || console;
    
    // Schedules storage
    this.schedules = new Map();
    this.activeJobs = new Map();
    
    // Bind methods
    this._executeSchedule = this._executeSchedule.bind(this);
  }

  /**
   * Initialize the schedule manager
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.logger.info('Initializing ScheduleManager...');
      
      // Load saved schedules from storage
      await this._loadSchedules();
      
      // Start all active schedules
      this._startAllSchedules();
      
      this.logger.info('ScheduleManager initialized');
    } catch (error) {
      this.logger.error('Failed to initialize ScheduleManager:', error);
      throw error;
    }
  }

  /**
   * Create a new schedule
   * @param {Object} options - Schedule options
   * @param {string} options.name - Schedule name
   * @param {string} options.cronExpression - Cron expression for scheduling
   * @param {string} options.targetType - 'device' or 'group'
   * @param {string} options.targetId - Device or group ID
   * @param {string} options.command - Command to execute
   * @param {*} [options.data] - Optional command data
   * @param {boolean} [options.enabled=true] - Whether the schedule is enabled
   * @returns {Object} The created schedule
   */
  createSchedule({ 
    name, 
    cronExpression, 
    targetType, 
    targetId, 
    command, 
    data, 
    enabled = true 
  }) {
    if (!name || typeof name !== 'string') {
      throw new Error('Schedule name is required');
    }
    
    if (!this._isValidCronExpression(cronExpression)) {
      throw new Error('Invalid cron expression');
    }
    
    if (!['device', 'group'].includes(targetType)) {
      throw new Error('Target type must be either "device" or "group"');
    }
    
    if (!targetId || typeof targetId !== 'string') {
      throw new Error('Target ID is required');
    }
    
    if (!command || typeof command !== 'string') {
      throw new Error('Command is required');
    }
    
    const scheduleId = `schedule-${uuidv4()}`;
    const now = new Date();
    
    const schedule = {
      id: scheduleId,
      name,
      cronExpression,
      targetType,
      targetId,
      command,
      data,
      enabled,
      lastRun: null,
      nextRun: null,
      createdAt: now,
      updatedAt: now
    };
    
    this.schedules.set(scheduleId, schedule);
    
    // If enabled, start the schedule
    if (enabled) {
      this._startSchedule(scheduleId);
    }
    
    this._saveSchedules();
    
    this.logger.info(`Created schedule: ${name} (${scheduleId})`);
    this.emit('schedule:created', schedule);
    
    return schedule;
  }

  /**
   * Get a schedule by ID
   * @param {string} scheduleId - Schedule ID
   * @returns {Object|null} Schedule object or null if not found
   */
  getSchedule(scheduleId) {
    return this.schedules.get(scheduleId) || null;
  }

  /**
   * Get all schedules
   * @param {Object} [filter] - Optional filter criteria
   * @returns {Array<Object>} Array of schedule objects
   */
  getAllSchedules(filter = {}) {
    let schedules = Array.from(this.schedules.values());
    
    // Apply filters if provided
    if (Object.keys(filter).length > 0) {
      schedules = schedules.filter(schedule => {
        return Object.entries(filter).every(([key, value]) => {
          return schedule[key] === value;
        });
      });
    }
    
    return schedules;
  }

  /**
   * Update a schedule
   * @param {string} scheduleId - Schedule ID to update
   * @param {Object} updates - Properties to update
   * @returns {Object|null} Updated schedule or null if not found
   */
  updateSchedule(scheduleId, updates) {
    const schedule = this.getSchedule(scheduleId);
    if (!schedule) {
      this.logger.warn(`Cannot update: schedule not found: ${scheduleId}`);
      return null;
    }
    
    // Stop the current job if it's running
    if (this.activeJobs.has(scheduleId)) {
      this._stopSchedule(scheduleId);
    }
    
    // Update schedule properties
    const updatedSchedule = {
      ...schedule,
      ...updates,
      updatedAt: new Date()
    };
    
    // Validate cron expression if it's being updated
    if (updates.cronExpression && !this._isValidCronExpression(updates.cronExpression)) {
      throw new Error('Invalid cron expression');
    }
    
    this.schedules.set(scheduleId, updatedSchedule);
    
    // Restart the schedule if it's enabled
    if (updatedSchedule.enabled !== false) {
      this._startSchedule(scheduleId);
    }
    
    this._saveSchedules();
    
    this.logger.debug(`Updated schedule: ${updatedSchedule.name} (${scheduleId})`);
    this.emit('schedule:updated', updatedSchedule, schedule);
    
    return updatedSchedule;
  }

  /**
   * Delete a schedule
   * @param {string} scheduleId - Schedule ID to delete
   * @returns {boolean} True if schedule was deleted, false if not found
   */
  deleteSchedule(scheduleId) {
    const schedule = this.getSchedule(scheduleId);
    if (!schedule) {
      return false;
    }
    
    // Stop the schedule if it's running
    if (this.activeJobs.has(scheduleId)) {
      this._stopSchedule(scheduleId);
    }
    
    this.schedules.delete(scheduleId);
    this._saveSchedules();
    
    this.logger.info(`Deleted schedule: ${schedule.name} (${scheduleId})`);
    this.emit('schedule:deleted', schedule);
    
    return true;
  }

  /**
   * Enable a schedule
   * @param {string} scheduleId - Schedule ID to enable
   * @returns {boolean} True if schedule was enabled, false if not found or already enabled
   */
  enableSchedule(scheduleId) {
    const schedule = this.getSchedule(scheduleId);
    if (!schedule || schedule.enabled) {
      return false;
    }
    
    this.updateSchedule(scheduleId, { enabled: true });
    return true;
  }

  /**
   * Disable a schedule
   * @param {string} scheduleId - Schedule ID to disable
   * @returns {boolean} True if schedule was disabled, false if not found or already disabled
   */
  disableSchedule(scheduleId) {
    const schedule = this.getSchedule(scheduleId);
    if (!schedule || !schedule.enabled) {
      return false;
    }
    
    this.updateSchedule(scheduleId, { enabled: false });
    return true;
  }

  /**
   * Execute a schedule immediately
   * @param {string} scheduleId - Schedule ID to execute
   * @returns {Promise<*>} Result of the scheduled command
   */
  async executeScheduleNow(scheduleId) {
    const schedule = this.getSchedule(scheduleId);
    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }
    
    this.logger.info(`Executing schedule now: ${schedule.name} (${scheduleId})`);
    return this._executeSchedule(schedule);
  }

  // ===== PRIVATE METHODS ===== //

  /**
   * Load schedules from storage
   * @private
   * @returns {Promise<void>}
   */
  async _loadSchedules() {
    try {
      // TODO: Load schedules from persistent storage
      // For now, we'll start with an empty list
      this.schedules = new Map();
      this.logger.debug('Loaded schedules from storage');
    } catch (error) {
      this.logger.error('Failed to load schedules:', error);
      throw error;
    }
  }

  /**
   * Save schedules to storage
   * @private
   * @returns {Promise<void>}
   */
  async _saveSchedules() {
    try {
      // TODO: Save schedules to persistent storage
      this.logger.debug('Saved schedules to storage');
    } catch (error) {
      this.logger.error('Failed to save schedules:', error);
      throw error;
    }
  }

  /**
   * Start all enabled schedules
   * @private
   */
  _startAllSchedules() {
    this.logger.debug('Starting all enabled schedules...');
    
    for (const [scheduleId, schedule] of this.schedules.entries()) {
      if (schedule.enabled) {
        this._startSchedule(scheduleId);
      }
    }
  }

  /**
   * Start a schedule
   * @private
   * @param {string} scheduleId - Schedule ID to start
   */
  _startSchedule(scheduleId) {
    if (this.activeJobs.has(scheduleId)) {
      this.logger.warn(`Schedule ${scheduleId} is already running`);
      return;
    }
    
    const schedule = this.getSchedule(scheduleId);
    if (!schedule) {
      this.logger.warn(`Cannot start: schedule not found: ${scheduleId}`);
      return;
    }
    
    try {
      // Create a new cron job
      const job = new CronJob({
        cronTime: schedule.cronExpression,
        onTick: () => this._executeSchedule(schedule),
        start: true,
        timeZone: 'UTC'
      });
      
      // Store the job
      this.activeJobs.set(scheduleId, job);
      
      // Calculate next run time
      const nextRun = job.nextDate().toDate();
      this.schedules.set(scheduleId, {
        ...schedule,
        nextRun
      });
      
      this.logger.info(`Started schedule: ${schedule.name} (${scheduleId})`);
      this.logger.debug(`Next run: ${nextRun.toISOString()}`);
      
    } catch (error) {
      this.logger.error(`Failed to start schedule ${scheduleId}:`, error);
      
      // Disable the schedule if it's invalid
      this.updateSchedule(scheduleId, { 
        enabled: false,
        lastError: error.message
      });
    }
  }

  /**
   * Stop a schedule
   * @private
   * @param {string} scheduleId - Schedule ID to stop
   */
  _stopSchedule(scheduleId) {
    if (!this.activeJobs.has(scheduleId)) {
      return;
    }
    
    const job = this.activeJobs.get(scheduleId);
    job.stop();
    this.activeJobs.delete(scheduleId);
    
    const schedule = this.getSchedule(scheduleId);
    if (schedule) {
      this.logger.info(`Stopped schedule: ${schedule.name} (${scheduleId})`);
    }
  }

  /**
   * Execute a schedule
   * @private
   * @param {Object} schedule - Schedule to execute
   * @returns {Promise<*>} Result of the scheduled command
   */
  async _executeSchedule(schedule) {
    const { id, name, targetType, targetId, command, data } = schedule;
    const now = new Date();
    
    try {
      this.logger.info(`Executing schedule: ${name} (${id})`);
      
      let result;
      
      // Execute the command on the target
      if (targetType === 'device') {
        const device = this.deviceManager.getDevice(targetId);
        if (!device) {
          throw new Error(`Device not found: ${targetId}`);
        }
        
        if (typeof device[command] === 'function') {
          result = await device[command](data);
        } else if (device.sendCommand) {
          result = await device.sendCommand(command, data);
        } else {
          throw new Error(`Device does not support command: ${command}`);
        }
        
      } else if (targetType === 'group') {
        const group = this.groupManager.getGroup(targetId);
        if (!group) {
          throw new Error(`Group not found: ${targetId}`);
        }
        
        result = await this.groupManager.executeGroupCommand(targetId, command, data);
      }
      
      // Update schedule with last run time
      const nextRun = this.activeJobs.get(id)?.nextDate()?.toDate() || null;
      
      const updatedSchedule = {
        ...schedule,
        lastRun: now,
        nextRun,
        lastError: null
      };
      
      this.schedules.set(id, updatedSchedule);
      this._saveSchedules();
      
      this.logger.info(`Successfully executed schedule: ${name} (${id})`);
      this.emit('schedule:executed', updatedSchedule, result);
      
      return result;
      
    } catch (error) {
      this.logger.error(`Error executing schedule ${name} (${id}):`, error);
      
      // Update schedule with error
      const updatedSchedule = {
        ...schedule,
        lastRun: now,
        lastError: error.message
      };
      
      this.schedules.set(id, updatedSchedule);
      this._saveSchedules();
      
      this.emit('schedule:error', updatedSchedule, error);
      throw error;
    }
  }

  /**
   * Validate a cron expression
   * @private
   * @param {string} expression - Cron expression to validate
   * @returns {boolean} True if valid, false otherwise
   */
  _isValidCronExpression(expression) {
    try {
      // This will throw if the expression is invalid
      new CronJob(expression, () => {}, null, false, 'UTC');
      return true;
    } catch (e) {
      return false;
    }
  }
}

module.exports = ScheduleManager;
