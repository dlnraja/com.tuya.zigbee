'use strict';

const EventEmitter = require('events');

/**
 * DeviceGroupManager - v1.0.0
 * Zigbee group management for device coordination
 *
 * Features:
 * - Group creation/deletion with persistence
 * - Group member management (add/remove)
 * - Group scene support (save/recall scenes)
 * - Group capability synchronization
 * - Event-driven architecture for group state changes
 */
class DeviceGroupManager extends EventEmitter {
  constructor(homey) {
    super();
    this.homey = homey;
    this.groups = new Map(); // groupId -> { name, members: Set, scenes: Map }
    this._groupCounter = 0;
    this._initialized = false;

    // Event throttling for group commands
    this._commandThrottle = new Map();
    this.THROTTLE_MS = 100; // 100ms between commands to same group
  }

  /**
   * Initialize the group manager and load persisted groups
   */
  async initialize() {
    if (this._initialized) return;

    try {
      const savedGroups = await this.homey.settings.get('zigbee_groups') || {};
      for (const [id, groupData] of Object.entries(savedGroups)) {
        this.groups.set(id, {
          name: groupData.name,
          members: new Set(groupData.members || []),
          scenes: new Map(Object.entries(groupData.scenes || {})),
          createdAt: groupData.createdAt,
          updatedAt: groupData.updatedAt
        });
        this._groupCounter = Math.max(this._groupCounter, parseInt(id) + 1);
      }
      this._initialized = true;
      this.log(`Loaded ${this.groups.size} persisted groups`);
    } catch (err) {
      this.error('Failed to load groups:', err.message);
      this._initialized = true; // Continue anyway
    }
  }

  /**
   * Create a new device group
   * @param {string} name - Human-readable group name
   * @param {string[]} deviceIds - Initial device IDs to add
   * @returns {Object} Created group info
   */
  async createGroup(name, deviceIds = []) {
    if (!name || typeof name !== 'string') {
      throw new Error('Group name is required');
    }

    const groupId = String(this._groupCounter++);

    const group = {
      name: name.trim(),
      members: new Set(deviceIds.filter(id => typeof id === 'string')),
      scenes: new Map(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.groups.set(groupId, group);
    await this._persistGroups();

    this.emit('groupCreated', { groupId, name: group.name, members: [...group.members] });
    this.log(`Created group "${name}" with ${group.members.size} members`);

    return {
      id: groupId,
      name: group.name,
      members: [...group.members],
      memberCount: group.members.size
    };
  }

  /**
   * Delete a device group
   * @param {string} groupId - Group ID to delete
   */
  async deleteGroup(groupId) {
    if (!this.groups.has(groupId)) {
      throw new Error(`Group ${groupId} not found`);
    }

    const group = this.groups.get(groupId);
    this.groups.delete(groupId);
    await this._persistGroups();

    this.emit('groupDeleted', { groupId, name: group.name });
    this.log(`Deleted group "${group.name}" (${groupId})`);
  }

  /**
   * Add a device to a group
   * @param {string} groupId - Target group ID
   * @param {string} deviceId - Device ID to add
   */
  async addMember(groupId, deviceId) {
    const group = this._getGroupOrThrow(groupId);

    if (group.members.has(deviceId)) {
      return; // Already a member
    }

    group.members.add(deviceId);
    group.updatedAt = Date.now();
    await this._persistGroups();

    this.emit('memberAdded', { groupId, deviceId, memberCount: group.members.size });
    this.log(`Added device ${deviceId} to group "${group.name}"`);
  }

  /**
   * Remove a device from a group
   * @param {string} groupId - Target group ID
   * @param {string} deviceId - Device ID to remove
   */
  async removeMember(groupId, deviceId) {
    const group = this._getGroupOrThrow(groupId);

    if (!group.members.has(deviceId)) {
      return; // Not a member
    }

    group.members.delete(deviceId);
    group.updatedAt = Date.now();
    await this._persistGroups();

    this.emit('memberRemoved', { groupId, deviceId, memberCount: group.members.size });
    this.log(`Removed device ${deviceId} from group "${group.name}"`);
  }

  /**
   * Get all members of a group
   * @param {string} groupId - Target group ID
   * @returns {string[]} Array of device IDs
   */
  getMembers(groupId) {
    const group = this._getGroupOrThrow(groupId);
    return [...group.members];
  }

  /**
   * Get all groups a device belongs to
   * @param {string} deviceId - Device ID to query
   * @returns {string[]} Array of group IDs
   */
  getDeviceGroups(deviceId) {
    const result = [];
    for (const [groupId, group] of this.groups.entries()) {
      if (group.members.has(deviceId)) {
        result.push(groupId);
      }
    }
    return result;
  }

  /**
   * List all groups with summary info
   * @returns {Object[]} Array of group summaries
   */
  listGroups() {
    const result = [];
    for (const [groupId, group] of this.groups.entries()) {
      result.push({
        id: groupId,
        name: group.name,
        memberCount: group.members.size,
        members: [...group.members],
        sceneCount: group.scenes.size,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt
      });
    }
    return result;
  }

  /**
   * Save a scene for a group (captures current device states)
   * @param {string} groupId - Target group ID
   * @param {string} sceneName - Name for the scene
   * @param {Object} states - Device states { deviceId: { capability: value } }
   */
  async saveScene(groupId, sceneName, states = {}) {
    const group = this._getGroupOrThrow(groupId);

    if (!sceneName || typeof sceneName !== 'string') {
      throw new Error('Scene name is required');
    }

    group.scenes.set(sceneName.trim(), {
      states,
      savedAt: Date.now()
    });
    group.updatedAt = Date.now();
    await this._persistGroups();

    this.emit('sceneSaved', { groupId, sceneName: sceneName.trim() });
    this.log(`Saved scene "${sceneName}" for group "${group.name}"`);
  }

  /**
   * Recall a scene for a group (apply saved states)
   * @param {string} groupId - Target group ID
   * @param {string} sceneName - Name of the scene to recall
   * @returns {Object} Applied states { deviceId: { capability: value } }
   */
  async recallScene(groupId, sceneName) {
    const group = this._getGroupOrThrow(groupId);
    const scene = group.scenes.get(sceneName);

    if (!scene) {
      throw new Error(`Scene "${sceneName}" not found in group "${group.name}"`);
    }

    this.emit('sceneRecalled', { groupId, sceneName, states: scene.states });
    this.log(`Recalled scene "${sceneName}" for group "${group.name}"`);

    return scene.states;
  }

  /**
   * Delete a scene from a group
   * @param {string} groupId - Target group ID
   * @param {string} sceneName - Name of the scene to delete
   */
  async deleteScene(groupId, sceneName) {
    const group = this._getGroupOrThrow(groupId);

    if (!group.scenes.has(sceneName)) {
      throw new Error(`Scene "${sceneName}" not found`);
    }

    group.scenes.delete(sceneName);
    group.updatedAt = Date.now();
    await this._persistGroups();

    this.emit('sceneDeleted', { groupId, sceneName });
    this.log(`Deleted scene "${sceneName}" from group "${group.name}"`);
  }

  /**
   * List all scenes for a group
   * @param {string} groupId - Target group ID
   * @returns {Object[]} Array of scene summaries
   */
  listScenes(groupId) {
    const group = this._getGroupOrThrow(groupId);
    const result = [];
    for (const [name, scene] of group.scenes.entries()) {
      result.push({
        name,
        savedAt: scene.savedAt,
        deviceCount: Object.keys(scene.states).length
      });
    }
    return result;
  }

  /**
   * Send a command to all devices in a group
   * @param {string} groupId - Target group ID
   * @param {string} capability - Capability name (e.g., 'onoff')
   * @param {any} value - Capability value
   */
  async sendGroupCommand(groupId, capability, value) {
    const group = this._getGroupOrThrow(groupId);

    // Throttle check
    const throttleKey = `${groupId}_${capability}`;
    const now = Date.now();
    const lastCommand = this._commandThrottle.get(throttleKey);
    if (lastCommand && (now - lastCommand) < this.THROTTLE_MS) {
      return; // Throttled
    }
    this._commandThrottle.set(throttleKey, now);

    const results = [];
    const drivers = Object.values(this.homey.drivers.getDrivers());

    for (const deviceId of group.members) {
      for (const driver of drivers) {
        const device = driver.getDevices().find(d => d.getData().id === deviceId);
        if (device) {
          try {
            await device.setCapabilityValue(capability, value);
            results.push({ deviceId, success: true });
          } catch (err) {
            results.push({ deviceId, success: false, error: err.message });
          }
          break;
        }
      }
    }

    this.emit('groupCommand', { groupId, capability, value, results });
    return results;
  }

  /**
   * Rename a group
   * @param {string} groupId - Target group ID
   * @param {string} newName - New group name
   */
  async renameGroup(groupId, newName) {
    const group = this._getGroupOrThrow(groupId);

    if (!newName || typeof newName !== 'string') {
      throw new Error('New name is required');
    }

    const oldName = group.name;
    group.name = newName.trim();
    group.updatedAt = Date.now();
    await this._persistGroups();

    this.emit('groupRenamed', { groupId, oldName, newName: group.name });
    this.log(`Renamed group "${oldName}" to "${group.name}"`);
  }

  /**
   * Get group by ID
   * @private
   */
  _getGroupOrThrow(groupId) {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }
    return group;
  }

  /**
   * Persist all groups to Homey settings
   * @private
   */
  async _persistGroups() {
    const data = {};
    for (const [id, group] of this.groups.entries()) {
      data[id] = {
        name: group.name,
        members: [...group.members],
        scenes: Object.fromEntries(group.scenes),
        createdAt: group.createdAt,
        updatedAt: group.updatedAt
      };
    }
    await this.homey.settings.set('zigbee_groups', data);
  }

  log(...args) {
    if (this.homey?.log) {
      this.homey.log('[GROUP-MGR]', ...args);
    }
  }

  error(...args) {
    if (this.homey?.error) {
      this.homey.error('[GROUP-MGR]', ...args);
    }
  }

  destroy() {
    this.groups.clear();
    this._commandThrottle.clear();
    this.removeAllListeners();
  }
}

module.exports = DeviceGroupManager;
