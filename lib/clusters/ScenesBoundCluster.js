'use strict';

const { BoundCluster } = require('zigbee-clusters');

/**
 * Scenes Bound Cluster - v5.8.96 FRAME DROP FIX
 * 
 * Used to receive scene commands from button devices and scene controllers.
 * v5.8.96: Added try/catch to ALL handlers to prevent silent frame drops.
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

  recall(payload) {
    try {
      if (typeof this._onRecallHandler === 'function') {
        this._onRecallHandler(payload?.sceneId ?? payload?.scene ?? 0);
      }
      if (typeof this._onRecallWithPayloadHandler === 'function') {
        this._onRecallWithPayloadHandler({
          sceneId: payload?.sceneId ?? payload?.scene ?? 0,
          groupId: payload?.groupId ?? payload?.group ?? 0,
          transitionTime: payload?.transitionTime ?? 0,
        });
      }
    } catch (err) {
      console.error('[ScenesBound] FRAME SAVED - error in recall:', err.message);
    }
  }

  store(payload) {
    try {
      if (typeof this._onStoreHandler === 'function') {
        this._onStoreHandler({
          sceneId: payload?.sceneId ?? payload?.scene ?? 0,
          groupId: payload?.groupId ?? payload?.group ?? 0,
        });
      }
    } catch (err) {
      console.error('[ScenesBound] FRAME SAVED - error in store:', err.message);
    }
  }

  remove(payload) {
    try {
      if (typeof this._onRemoveHandler === 'function') {
        this._onRemoveHandler({
          sceneId: payload?.sceneId ?? payload?.scene ?? 0,
          groupId: payload?.groupId ?? payload?.group ?? 0,
        });
      }
    } catch (err) {
      console.error('[ScenesBound] FRAME SAVED - error in remove:', err.message);
    }
  }
}

module.exports = ScenesBoundCluster;
