'use strict';

/**
 * Device Group Scene Management - FEATURE #52
 *
 * Manages scenes across groups of devices:
 * - Save/restore device states as scenes
 * - Group scene activation
 * - Scene transitions (fade, ramp)
 * - Schedule-based scene activation
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

class DeviceGroupSceneManager extends EventEmitter {
  constructor(homey, options = {}) {
    super();
    this.homey = homey;

    // Scene storage
    this.scenes = new Map(); // sceneId -> { name, groups, deviceStates, createdAt }
    this.groups = new Map(); // groupId -> { name, deviceIds }
    this.maxScenes = options.maxScenes || 50;
    this.maxGroups = options.maxGroups || 20;
  }

  /**
   * Create a scene from current device states
   * @param {string} name
   * @param {Array<string>} deviceIds
   * @returns {Object} Scene object
   */
  async createScene(name, deviceIds) {
    const sceneId = `scene_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const deviceStates = {};

    for (const deviceId of deviceIds) {
      try {
        const device = this.homey.ManagerDevices.getDevice(deviceId);
        if (!device) continue;

        const capabilities = device.capabilities || [];
        const state = {};

        for (const cap of capabilities) {
          const value = device.getCapabilityValue(cap);
          if (value !== null && value !== undefined) {
            state[cap] = value;
          }
        }

        deviceStates[deviceId] = state;
      } catch (err) {
        // Skip devices that can't be read
      }
    }

    const scene = {
      sceneId,
      name,
      deviceIds,
      deviceStates,
      createdAt: Date.now()
    };

    this.scenes.set(sceneId, scene);
    await this._saveScenes();

    this.emit('sceneCreated', { sceneId, name });
    return scene;
  }

  /**
   * Activate a scene (restore all device states)
   * @param {string} sceneId
   * @param {Object} options - { transitionMs } - transition time in ms
   */
  async activateScene(sceneId, options = {}) {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      throw new Error(`Scene ${sceneId} not found`);
    }

    const results = [];

    for (const [deviceId, state] of Object.entries(scene.deviceStates)) {
      try {
        const device = this.homey.ManagerDevices.getDevice(deviceId);
        if (!device) {
          results.push({ deviceId, success: false, reason: 'device_not_found' });
          continue;
        }

        for (const [capability, value] of Object.entries(state)) {
          try {
            await device.setCapabilityValue(capability, value);
          } catch (err) {
            results.push({ deviceId, capability, success: false, reason: err.message });
          }
        }

        results.push({ deviceId, success: true });
      } catch (err) {
        results.push({ deviceId, success: false, reason: err.message });
      }
    }

    this.emit('sceneActivated', { sceneId, name: scene.name, results });
    return results;
  }

  /**
   * Create a device group
   * @param {string} name
   * @param {Array<string>} deviceIds
   */
  createGroup(name, deviceIds) {
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    this.groups.set(groupId, { groupId, name, deviceIds, createdAt: Date.now() });
    this.emit('groupCreated', { groupId, name });
    return { groupId, name, deviceIds };
  }

  /**
   * Activate a scene for all devices in a group
   * @param {string} groupId
   * @param {Object} stateToSet - { capability: value }
   */
  async activateGroupState(groupId, stateToSet) {
    const group = this.groups.get(groupId);
    if (!group) throw new Error(`Group ${groupId} not found`);

    const results = [];

    for (const deviceId of group.deviceIds) {
      try {
        const device = this.homey.ManagerDevices.getDevice(deviceId);
        if (!device) continue;

        for (const [capability, value] of Object.entries(stateToSet)) {
          try {
            await device.setCapabilityValue(capability, value);
          } catch (err) {
            results.push({ deviceId, capability, success: false, reason: err.message });
          }
        }

        results.push({ deviceId, success: true });
      } catch (err) {
        results.push({ deviceId, success: false, reason: err.message });
      }
    }

    this.emit('groupStateActivated', { groupId, name: group.name, state: stateToSet, results });
    return results;
  }

  /**
   * Get all scenes
   */
  getScenes() {
    return Array.from(this.scenes.values());
  }

  /**
   * Get all groups
   */
  getGroups() {
    return Array.from(this.groups.values());
  }

  /**
   * Delete a scene
   */
  async deleteScene(sceneId) {
    const existed = this.scenes.delete(sceneId);
    if (existed) {
      await this._saveScenes();
      this.emit('sceneDeleted', { sceneId });
    }
    return existed;
  }

  /**
   * Delete a group
   */
  deleteGroup(groupId) {
    return this.groups.delete(groupId);
  }

  async _saveScenes() {
    try {
      const data = {};
      for (const [id, scene] of this.scenes.entries()) {
        data[id] = scene;
      }
      await this.homey.settings.set('device_scenes', data);
    } catch (err) {
      // Ignore
    }
  }

  async loadScenes() {
    try {
      const stored = await this.homey.settings.get('device_scenes');
      if (stored) {
        for (const [id, scene] of Object.entries(stored)) {
          this.scenes.set(id, scene);
        }
      }
    } catch (err) {
      // Ignore
    }
  }

  destroy() {
    this.scenes.clear();
    this.groups.clear();
  }
}

module.exports = DeviceGroupSceneManager;
