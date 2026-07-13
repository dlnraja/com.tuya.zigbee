// lib/multichannel/ReceptionManager.js — v1.0 (P37.5)
'use strict';
// ═══════════════════════════════════════════════════════════════════════════════
// RECEPTION MANAGER — Reliable RX with dedup, ordering, replay
// ═══════════════════════════════════════════════════════════════════════════════
//
// Ensures every device update is correctly received and processed:
//   - Dedup: same value from multiple channels → process once
//   - Ordering: out-of-order packets → reorder by timestamp
//   - Replay: missed packets → re-request
//   - Buffer: temporary storage during transient disconnects

const { MultiChannelManager } = require('./MultiChannelManager');

const DEDUP_WINDOW_MS = 2000; // 2 seconds — same value within window = duplicate
const BUFFER_MAX_SIZE = 100;
const REPLAY_INTERVAL_MS = 60000; // 1 minute

class ReceptionManager {
  constructor(device, options = {}) {
    this.device = device;
    this.options = options;
    this._mcm = options.multiChannelManager || new MultiChannelManager(device);
    this._buffer = []; // ordered queue of { capability, value, timestamp, source }
    this._lastSeen = new Map(); // capability → { value, timestamp }
    this._received = []; // history
    this._maxReceived = options.maxReceived || 200;
    this._lastReplay = 0;
    this._listeners = new Map(); // capability → Set<callback>
  }

  /**
   * Receive a value from a channel. Dedups, reorders, and dispatches.
   */
  receive(capability, value, source) {
    const now = Date.now();
    const last = this._lastSeen.get(capability);

    // Dedup
    if (last && last.value === value && (now - last.timestamp) < DEDUP_WINDOW_MS) {
      return { deduped: true, capability, value, source };
    }

    this._lastSeen.set(capability, { value, timestamp: now });
    this._buffer.push({ capability, value, timestamp: now, source });
    this._buffer.sort((a, b) => a.timestamp - b.timestamp);

    if (this._buffer.length > BUFFER_MAX_SIZE) {
      this._buffer.shift(); // drop oldest
    }

    this._received.push({ capability, value, timestamp: now, source });
    if (this._received.length > this._maxReceived) {
      this._received.shift();
    }

    // Dispatch to listeners
    const cbs = this._listeners.get(capability);
    if (cbs) {
      for (const cb of cbs) {
        try {
          cb(value, source);
        } catch (e) {
          // Listener error, don't break the chain
        }
      }
    }
    return { deduped: false, capability, value, source };
  }

  /**
   * Read the latest value for a capability from the buffer.
   */
  getLatest(capability) {
    for (let i = this._buffer.length - 1; i >= 0; i -= 1) {
      if (this._buffer[i].capability === capability) {
        return this._buffer[i];
      }
    }
    return null;
  }

  /**
   * Get the entire buffer (ordered).
   */
  getBuffer() {
    return this._buffer.slice();
  }

  /**
   * Subscribe to capability changes.
   */
  subscribe(capability, callback) {
    if (!this._listeners.has(capability)) {
      this._listeners.set(capability, new Set());
    }
    this._listeners.get(capability).add(callback);
    return () => this._listeners.get(capability).delete(callback);
  }

  /**
   * Replay buffer to a specific listener.
   * Useful for late-attached listeners.
   */
  replay(capability, callback) {
    for (const item of this._buffer) {
      if (item.capability === capability) {
        try {
          callback(item.value, item.source);
        } catch (e) {
          // skip
        }
      }
    }
  }

  /**
   * Trigger a re-read of a capability (in case of missed packets).
   */
  async requestReplay(capability) {
    return this._mcm.read(capability);
  }

  /**
   * Get health/reliability metrics.
   */
  getHealth() {
    const total = this._received.length;
    const deduped = this._buffer.length - this._received.length;
    return {
      totalReceived: total,
      bufferSize: this._buffer.length,
      maxBufferSize: BUFFER_MAX_SIZE,
      dedupRatio: total > 0 ? deduped / total : 0,
      capabilitiesTracked: this._lastSeen.size,
      subscribers: Array.from(this._listeners.entries()).map(([k, v]) => ({ capability: k, count: v.size })),
    };
  }
}

module.exports = { ReceptionManager, DEDUP_WINDOW_MS, BUFFER_MAX_SIZE };
