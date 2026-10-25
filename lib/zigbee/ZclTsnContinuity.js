'use strict';

/**
 * P3029: ZclTsnContinuity: one outgoing ZCL transaction sequence number (TSN) per physical
 * device, continued across app restarts.
 *
 * Why: zigbee-clusters numbers outgoing frames per Cluster instance and restarts at 1 on every
 * app start. Some firmwares keep a short list (~10) of recently seen TSNs and silently drop a
 * "duplicate" while still answering SUCCESS. After Homey's nightly reboot the first commands
 * of the day reuse those numbers and are lost although Homey shows them as applied.
 * Credit: root cause found by makleso6 (Maxim) and Jan_Z, confirmed with captures by
 * TedTolboom, Homey Community "[APP] Aqara & Xiaomi", topic 156, posts 791200 / 791317 / 791557
 * (https://community.homey.app/t/156), and athombv/node-homey-zigbeedriver issue #194.
 * Our own implementation (no code copied).
 *
 * How (additive, bounded):
 *  - Cluster.prototype.nextSeqNr is wrapped; the counter lives per ZCLNode (WeakMap, a few
 *    bytes each), shared by all endpoints and clusters of that node.
 *  - Seed: stored checkpoint + CHECKPOINT_EVERY (the last used TSN is always below that), or
 *    a random value when nothing is stored yet (never 0 or 1, the library's restart values).
 *  - Checkpoint: device store 'zcl_tsn_next' every CHECKPOINT_EVERY frames (fire-and-forget),
 *    so at most one store write per 32 outgoing frames.
 *  - Incoming frames and our responses keep the device's own TSN (BoundCluster path untouched).
 *  - Kill switch: app setting 'zcl_tsn_continuity' = false → original library behaviour.
 * Never throws: any internal error falls back to the original nextSeqNr.
 */

const STORE_KEY = 'zcl_tsn_next';
const CHECKPOINT_EVERY = 32;
const WRAPPED = Symbol.for('tuya.p3029.tsn');

const state = { enabled: true, installed: false, Cluster: null, stats: { frames: 0, seeded: 0, restored: 0, checkpoints: 0 } };
const nodeState = new WeakMap(); // ZCLNode → { next, since }

function _rand(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }

function _deviceFor(node) {
  try { return require('./ZclUnsupportedGuard').deviceFor(node); } catch (_e) { return null; }
}

/** Seed for a node, from the linked device store when there is one. */
function seedFor(device) {
  try {
    const v = device && typeof device.getStoreValue === 'function' ? device.getStoreValue(STORE_KEY) : null;
    const n = Number(v);
    if (v !== null && v !== undefined && Number.isInteger(n) && n >= 0 && n <= 255) {
      state.stats.restored++;
      return (n + CHECKPOINT_EVERY) % 256;
    }
  } catch (_e) { /* fall through */ }
  state.stats.seeded++;
  return _rand(2, 255);
}

function _checkpoint(node, value) {
  const device = _deviceFor(node);
  if (!device || device._destroyed || typeof device.setStoreValue !== 'function') { return; }
  try {
    state.stats.checkpoints++;
    Promise.resolve(device.setStoreValue(STORE_KEY, value)).catch(() => {});
  } catch (_e) { /* soft */ }
}

/** Next TSN for a node (exported for tests). */
function nextFor(node) {
  let st = nodeState.get(node);
  if (!st) {
    st = { next: seedFor(_deviceFor(node)), since: 0 };
    nodeState.set(node, st);
    _checkpoint(node, st.next); // first frame after a restart moves the checkpoint forward
  }
  st.next = (st.next + 1) % 256;
  st.since++;
  state.stats.frames++;
  if (st.since >= CHECKPOINT_EVERY) { st.since = 0; _checkpoint(node, st.next); }
  return st.next;
}

function _wrap(orig) {
  const w = function nextSeqNrContinuous(...args) {
    if (state.enabled) {
      try {
        const node = this && this._endpoint && this._endpoint._node;
        if (node && typeof node === 'object') {
          const v = nextFor(node);
          this._nextTrxSeqNr = v; // keep the library's own field coherent
          return v;
        }
      } catch (_e) { /* fall back */ }
    }
    return orig.apply(this, args);
  };
  w[WRAPPED] = true;
  return w;
}

/**
 * @param {Object} [zc] zigbee-clusters module (tests inject one)
 * @returns {boolean}
 */
function install(zc) {
  try {
    const lib = zc || require('zigbee-clusters');
    const Cluster = lib && lib.Cluster;
    if (!Cluster || !Cluster.prototype || typeof Cluster.prototype.nextSeqNr !== 'function') { return false; }
    const P = Cluster.prototype;
    if (!P.nextSeqNr[WRAPPED]) {
      Object.defineProperty(P, 'nextSeqNr', { value: _wrap(P.nextSeqNr), writable: true, configurable: true, enumerable: false });
    }
    state.Cluster = Cluster;
    state.installed = true;
    return true;
  } catch (_e) {
    return false;
  }
}

function setEnabled(on) { state.enabled = on !== false; return state.enabled; }

/** Forget a node (re-pair): the next frame re-seeds from the store. */
function forget(node) { if (node) { nodeState.delete(node); } }

function snapshot(node) {
  const st = node ? nodeState.get(node) : null;
  return { enabled: state.enabled, installed: state.installed, stats: Object.assign({}, state.stats), next: st ? st.next : null };
}

module.exports = { install, setEnabled, forget, snapshot, nextFor, seedFor, STORE_KEY, CHECKPOINT_EVERY, _state: state };
