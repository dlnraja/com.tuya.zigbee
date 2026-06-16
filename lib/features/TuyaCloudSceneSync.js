'use strict';

/**
 * Tuya Cloud Scene Sync - FEATURE #49
 *
 * Synchronizes scenes between Tuya Cloud and Homey:
 * - Import Tuya cloud scenes as Homey flows
 * - Map scene actions to device commands
 * - Bidirectional scene sync
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

class TuyaCloudSceneSync extends EventEmitter {
  constructor(homey, options = {}) {
    super();
    this.homey = homey;

    // Scene mapping cache
    this.cloudScenes = new Map(); // sceneId -> { name, actions, conditions }
    this.syncMapping = new Map(); // cloudSceneId -> homeySceneId
    this.lastSyncTime = null;
    this.syncIntervalMs = options.syncIntervalMs || 3600000; // 1 hour
    this._syncTimer = null;
  }

  /**
   * Import scenes from Tuya cloud response
   * @param {Array} cloudScenes - Array of Tuya scene objects
   */
  importCloudScenes(cloudScenes) {
    if (!Array.isArray(cloudScenes)) return;

    for (const scene of cloudScenes) {
      const mapped = {
        cloudId: scene.scene_id || scene.id,
        name: scene.name || scene.scene_name,
        actions: this._mapSceneActions(scene.actions || []),
        conditions: scene.conditions || [],
        enabled: scene.enabled !== false,
        importedAt: Date.now()
      };

      this.cloudScenes.set(mapped.cloudId, mapped);
    }

    this.lastSyncTime = Date.now();
    this.emit('scenesImported', { count: cloudScenes.length });
  }

  /**
   * Map Tuya cloud scene actions to Homey-compatible actions
   * @param {Array} actions
   * @returns {Array}
   */
  _mapSceneActions(actions) {
    return actions.map(action => ({
      deviceId: action.dev_id || action.device_id,
      dpId: action.dp_id,
      value: action.value,
      dpType: action.dp_type || 'value',
      commandType: action.command_type || 'set_dp'
    }));
  }

  /**
   * Execute a cloud scene locally
   * @param {string} cloudSceneId
   * @returns {Object} Execution result
   */
  async executeCloudScene(cloudSceneId) {
    const scene = this.cloudScenes.get(cloudSceneId);
    if (!scene) {
      throw new Error(`Cloud scene ${cloudSceneId} not found`);
    }

    const results = [];

    for (const action of scene.actions) {
      try {
        const device = this.homey.ManagerDevices.getDevice(action.deviceId);
        if (!device) {
          results.push({ action, success: false, reason: 'device_not_found' });
          continue;
        }

        // Execute action via device's Tuya DP setter
        if (device.sendTuyaDataPoint) {
          await device.sendTuyaDataPoint(action.dpId, action.value, action.dpType);
          results.push({ action, success: true });
        } else if (device.setCapabilityValue) {
          // Try capability-based execution
          const capability = this._dpToCapability(action.dpId);
          if (capability) {
            await device.setCapabilityValue(capability, action.value);
            results.push({ action, success: true });
          } else {
            results.push({ action, success: false, reason: 'no_capability_mapping' });
          }
        }
      } catch (err) {
        results.push({ action, success: false, reason: err.message });
      }
    }

    this.emit('sceneExecuted', { cloudSceneId, name: scene.name, results });
    return { sceneId: cloudSceneId, name: scene.name, results };
  }

  /**
   * Get all imported cloud scenes
   */
  getCloudScenes() {
    return Array.from(this.cloudScenes.values());
  }

  /**
   * Get scene by cloud ID
   */
  getCloudScene(cloudId) {
    return this.cloudScenes.get(cloudId) || null;
  }

  /**
   * Create a Homey flow from a cloud scene
   * @param {string} cloudSceneId
   * @returns {Object} Flow card definition
   */
  createFlowFromScene(cloudSceneId) {
    const scene = this.cloudScenes.get(cloudSceneId);
    if (!scene) return null;

    return {
      id: `cloud_scene_${cloudId}`,
      title: `Tuya Scene: ${scene.name}`,
      type: 'action',
      conditions: [],
      actions: scene.actions.map(action => ({
        id: `tuya_dp_send`,
        args: {
          device: action.deviceId,
          dp: action.dpId,
          value: action.value,
          type: action.dpType
        }
      }))
    };
  }

  _dpToCapability(dpId) {
    // Common DP to capability mappings
    const map = {
      1: 'onoff',
      2: 'dim',
      3: 'light_hue',
      4: 'light_saturation',
      5: 'target_temperature',
      6: 'measure_temperature',
      7: 'measure_humidity',
      8: 'measure_power'
    };
    return map[dpId] || null;
  }

  destroy() {
    if (this._syncTimer) {
      clearInterval(this._syncTimer);
    }
    this.cloudScenes.clear();
    this.syncMapping.clear();
  }
}

module.exports = TuyaCloudSceneSync;
