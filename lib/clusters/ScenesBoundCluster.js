'use strict';

const { BoundCluster } = require('zigbee-clusters');

/**
 * Scenes Bound Cluster
 *
 * Used to receive scene commands from button devices and scene controllers.
 * Many Tuya buttons send scene commands instead of onOff for button presses.
 *
 * Scene ID mapping (common patterns):
 * - 0: Single press / Scene 1
 * - 1: Double press / Scene 2
 * - 2: Long press / Scene 3
 * - 3-5: Additional scenes or alternative mappings
 *
 * Inspired by: IKEA Trådfri IkeaSpecificSceneBoundCluster
 *
 * @see https://github.com/athombv/com.ikea.tradfri-example
 */
class ScenesBoundCluster extends BoundCluster {

  constructor({
    onRecall,
    onStore,
    onRemove,
    onRecallWithPayload,
  } = {}) {
    super();

    this._onRecallHandler = onRecall;
    this._onStoreHandler = onStore;
    this._onRemoveHandler = onRemove;
    this._onRecallWithPayloadHandler = onRecallWithPayload;
  }

  /**
   * Handle 'recall' command (0x05)
   * Most common for button presses - triggers a specific scene
   *
   * Payload:
   * - groupId: uint16 (often 0)
   * - sceneId: uint8 (scene number, 0-255)
   */
  recall(payload) {
    // Call simple handler with just scene ID
    if (typeof this._onRecallHandler === 'function') {
      this._onRecallHandler(payload.sceneId ?? payload.scene ?? 0);
    }

    // Call detailed handler with full payload
    if (typeof this._onRecallWithPayloadHandler === 'function') {
      this._onRecallWithPayloadHandler({
        sceneId: payload.sceneId ?? payload.scene ?? 0,
        groupId: payload.groupId ?? payload.group ?? 0,
        transitionTime: payload.transitionTime ?? 0,
      });
    }
  }

  /**
   * Handle 'store' command (0x04)
   * Used to store current state as a scene
   */
  store(payload) {
    if (typeof this._onStoreHandler === 'function') {
      this._onStoreHandler({
        sceneId: payload.sceneId ?? payload.scene ?? 0,
        groupId: payload.groupId ?? payload.group ?? 0,
      });
    }
  }

  /**
   * Handle 'remove' command (0x02)
   * Used to remove a stored scene
   */
  remove(payload) {
    if (typeof this._onRemoveHandler === 'function') {
      this._onRemoveHandler({
        sceneId: payload.sceneId ?? payload.scene ?? 0,
        groupId: payload.groupId ?? payload.group ?? 0,
      });
    }
  }
}

module.exports = ScenesBoundCluster;
