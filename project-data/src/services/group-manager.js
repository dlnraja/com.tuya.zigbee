#!/usr/bin/env node
'use strict';

'use strict';

const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');

/**
 * Group Manager Service
 * Manages device groups for coordinated control
 */
class GroupManager extends EventEmitter {
  /**
   * Create a new GroupManager instance
   * @param {Object} options - Configuration options
   * @param {Object} options.deviceManager - DeviceManager instance
   * @param {Object} options.logger - Logger instance
   */
  constructor({ deviceManager, logger }) {
    super();
    this.deviceManager = deviceManager;
    this.logger = logger || console;
    
    // Group storage
    this.groups = new Map();
    
    // Bind methods
    this._handleDeviceEvent = this._handleDeviceEvent.bind(this);
  }

  /**
   * Initialize the group manager
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.logger.info('Initializing GroupManager...');
      
      // Load saved groups from storage
      await this._loadGroups();
      
      // Register event listeners
      this._registerEventListeners();
      
      this.logger.info('GroupManager initialized');
    } catch (error) {
      this.logger.error('Failed to initialize GroupManager:', error);
      throw error;
    }
  }

  /**
   * Create a new device group
   * @param {Object} options - Group options
   * @param {string} options.name - Group name
   * @param {Array<string>} options.deviceIds - Array of device IDs to include in the group
   * @param {string} [options.type] - Group type (e.g., 'light', 'switch')
   * @returns {Object} The created group
   */
  createGroup({ name, deviceIds = [], type = 'generic' }) {
    if (!name || typeof name !== 'string') {
      throw new Error('Group name is required');
    }
    
    const groupId = `group-${uuidv4()}`;
    const now = new Date();
    
    const group = {
      id: groupId,
      name,
      type,
      deviceIds: this._validateDeviceIds(deviceIds),
      createdAt: now,
      updatedAt: now,
      state: {}
    };
    
    this.groups.set(groupId, group);
    this._saveGroups();
    
    this.logger.info(`Created group: ${name} (${groupId})`);
    this.emit('group:created', group);
    
    return group;
  }

  /**
   * Get a group by ID
   * @param {string} groupId - Group ID
   * @returns {Object|null} Group object or null if not found
   */
  getGroup(groupId) {
    return this.groups.get(groupId) || null;
  }

  /**
   * Get all groups
   * @returns {Array<Object>} Array of group objects
   */
  getAllGroups() {
    return Array.from(this.groups.values());
  }

  /**
   * Update a group
   * @param {string} groupId - Group ID to update
   * @param {Object} updates - Properties to update
   * @returns {Object|null} Updated group or null if not found
   */
  updateGroup(groupId, updates) {
    const group = this.getGroup(groupId);
    if (!group) {
      this.logger.warn(`Cannot update: group not found: ${groupId}`);
      return null;
    }
    
    const updatedGroup = {
      ...group,
      ...updates,
      updatedAt: new Date()
    };
    
    // Validate device IDs if they're being updated
    if (updates.deviceIds) {
      updatedGroup.deviceIds = this._validateDeviceIds(updates.deviceIds);
    }
    
    this.groups.set(groupId, updatedGroup);
    this._saveGroups();
    
    this.logger.debug(`Updated group: ${groupId}`);
    this.emit('group:updated', updatedGroup, group);
    
    return updatedGroup;
  }

  /**
   * Delete a group
   * @param {string} groupId - Group ID to delete
   * @returns {boolean} True if group was deleted, false if not found
   */
  deleteGroup(groupId) {
    if (!this.groups.has(groupId)) {
      return false;
    }
    
    const group = this.groups.get(groupId);
    this.groups.delete(groupId);
    this._saveGroups();
    
    this.logger.info(`Deleted group: ${group.name} (${groupId})`);
    this.emit('group:deleted', group);
    
    return true;
  }

  /**
   * Get groups that contain a specific device
   * @param {string} deviceId - Device ID to search for
   * @returns {Array<Object>} Array of groups containing the device
   */
  getGroupsForDevice(deviceId) {
    return Array.from(this.groups.values()).filter(group => 
      group.deviceIds.includes(deviceId)
    );
  }

  /**
   * Execute a command on all devices in a group
   * @param {string} groupId - Group ID
   * @param {string} command - Command to execute
   * @param {*} [data] - Optional command data
   * @returns {Promise<Array>} Array of results from all devices
   */
  async executeGroupCommand(groupId, command, data) {
    const group = this.getGroup(groupId);
    if (!group) {
      throw new Error(`Group not found: ${groupId}`);
    }
    
    this.logger.debug(`Executing command '${command}' on group '${group.name}'`);
    
    // Execute command on all devices in parallel
    const results = await Promise.allSettled(
      group.deviceIds.map(deviceId => {
        const device = this.deviceManager.getDevice(deviceId);
        if (!device) {
          return Promise.reject(new Error(`Device not found: ${deviceId}`));
        }
        
        // Check if device has the command method
        if (typeof device[command] === 'function') {
          return device[command](data);
        } else if (device.sendCommand) {
          return device.sendCommand(command, data);
        }
        
        return Promise.reject(new Error(`Device does not support command: ${command}`));
      })
    );
    
    // Process results
    const successful = [];
    const failed = [];
    
    results.forEach((result, index) => {
      const deviceId = group.deviceIds[index];
      
      if (result.status === 'fulfilled') {
        successful.push({
          deviceId,
          result: result.value
        });
      } else {
        failed.push({
          deviceId,
          error: result.reason
        });
      }
    });
    
    // Log any failures
    if (failed.length > 0) {
      this.logger.warn(`Failed to execute command on ${failed.length} devices in group '${group.name}'`);
      failed.forEach(({ deviceId, error }) => {
        this.logger.error(`  - ${deviceId}:`, error.message);
      });
    }
    
    return {
      groupId,
      command,
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      results: successful,
      errors: failed
    };
  }

  // ===== PRIVATE METHODS ===== //

  /**
   * Load groups from storage
   * @private
   * @returns {Promise<void>}
   */
  async _loadGroups() {
    try {
      // TODO: Load groups from persistent storage
      // For now, we'll start with an empty list
      this.groups = new Map();
      this.logger.debug('Loaded groups from storage');
    } catch (error) {
      this.logger.error('Failed to load groups:', error);
      throw error;
    }
  }

  /**
   * Save groups to storage
   * @private
   * @returns {Promise<void>}
   */
  async _saveGroups() {
    try {
      // TODO: Save groups to persistent storage
      this.logger.debug('Saved groups to storage');
    } catch (error) {
      this.logger.error('Failed to save groups:', error);
      throw error;
    }
  }

  /**
   * Validate device IDs
   * @private
   * @param {Array<string>} deviceIds - Array of device IDs to validate
   * @returns {Array<string>} Validated device IDs
   */
  _validateDeviceIds(deviceIds) {
    if (!Array.isArray(deviceIds)) {
      throw new Error('Device IDs must be an array');
    }
    
    // Filter out invalid device IDs
    return deviceIds.filter(deviceId => {
      const isValid = this.deviceManager.getDevice(deviceId) !== null;
      if (!isValid) {
        this.logger.warn(`Skipping invalid device ID: ${deviceId}`);
      }
      return isValid;
    });
  }

  /**
   * Register event listeners
   * @private
   */
  _registerEventListeners() {
    // Listen for device removal to update groups
    this.deviceManager.on('device:removed', (device) => {
      const groups = this.getAllGroups();
      
      // Remove device from all groups
      for (const group of groups) {
        if (group.deviceIds.includes(device.id)) {
          this.updateGroup(group.id, {
            deviceIds: group.deviceIds.filter(id => id !== device.id)
          });
        }
      }
    });
    
    // Listen for group events
    this.on('group:created', (group) => {
      this.logger.info(`Group created: ${group.name} (${group.id})`);
    });
    
    this.on('group:updated', (newGroup, oldGroup) => {
      this.logger.debug(`Group updated: ${newGroup.name} (${newGroup.id})`);
    });
    
    this.on('group:deleted', (group) => {
      this.logger.info(`Group deleted: ${group.name} (${group.id})`);
    });
  }

  /**
   * Handle device events
   * @private
   * @param {Object} event - Event object
   */
  _handleDeviceEvent(event) {
    // Handle device events if needed
    this.logger.debug('Device event received by GroupManager:', event);
  }
}

module.exports = GroupManager;
