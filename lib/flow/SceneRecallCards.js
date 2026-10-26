'use strict';

/**
 * P3065 D12 (t575u) — raw "scene recalled" trigger for any remote that sends a ZCL Scenes recall
 * (cluster 0x0005, command recall / recallScene, or a currentScene report).
 *
 * Until now a recall was only turned into a button press (Tuya TS004x use scene id 0/1/2 as
 * single/double/hold), so remotes that really recall scene numbers (white-label scene controllers,
 * group remotes) lost the scene number. This card keeps every existing button card and adds the
 * raw event: tokens scene and endpoint, for any driver, all local.
 *
 * Vocabulary from ZHA quirks (COMMAND_RECALL) and Zigbee2MQTT (`recall_<n>` actions); own code.
 * A device that runs two button detectors reports the same recall once (500 ms window).
 */

const { GenericDeviceCards, sameDevice } = require('./GenericDeviceCards');

const DEDUP_MS = 500;

class SceneRecallCards extends GenericDeviceCards {
  constructor(host) {
    super(host);
    this._last = new Map(); // `${deviceId}:${ep}:${scene}` -> ms
  }

  register() {
    this._reg('trigger', 'scene_recalled', async (args, state) => sameDevice(args.device, state.deviceId));
    this._argsFor('scene_recalled');
  }

  onSceneRecalled(device, { scene, endpoint } = {}, now = Date.now()) {
    try {
      const id = device?.getData?.()?.id;
      const s = Number(scene);
      const ep = Number(endpoint) || 1;
      if (!id || !Number.isInteger(s) || s < 0 || s > 255) {return false;}
      const key = `${id}:${ep}:${s}`;
      if (now - (this._last.get(key) || 0) < DEDUP_MS) {return false;}
      this._last.set(key, now);
      if (this._last.size > 512) {this._last.delete(this._last.keys().next().value);}
      if (!this._wanted('scene_recalled', id)) {return false;}
      this._fire('scene_recalled', { scene: s, endpoint: ep }, { deviceId: id });
      return true;
    } catch (_e) { return false; }
  }
}

module.exports = { SceneRecallCards, DEDUP_MS };
