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

  // v5.9.11: Catch unknown scene commands to prevent silent drops
  async handleFrame(f, m, r) {
    try {
      const c = f?.cmdId ?? f?.commandId;
      if (c === undefined || [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06].includes(c)) return;
      const d = f?.data || r;console.log(`[ScenesBound] FRAME CAUGHT cmd=0x${c.toString(16)} data=${d?.toString?.('hex')||'none'}`);
      if (typeof this._onRecallHandler === 'function') {
        this._onRecallHandler(d?.[0] ?? c);
      }
    } catch (e) { console.error('[ScenesBound] handleFrame error:', e.message); }
  }
}

module.exports = ScenesBoundCluster;


