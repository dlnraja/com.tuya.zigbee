'use strict';

const MAX_KEY_BYTES = 48;
const MAX_VALUE_CHARS = 256;
const MAX_SHALLOW_KEYS = 24;

function fnv1a(buf) {
  let h = 0x811c9dc5;
  for (let i = 0; i < buf.length; i += 1) {
    h ^= buf[i];
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}

class RawFrameDeduplicator {
  constructor(options = {}) {
    this.defaultWindowMs = options.defaultWindowMs ?? 500;
    this.tuyaWindowMs = options.tuyaWindowMs ?? 750;
    this.maxCacheSize = options.maxCacheSize ?? 500;
    this.cache = new Map();
    this.count = 0;
  }

  shouldSuppress(endpointId, clusterId, frame, meta = {}) {
    const now = Date.now();
    const numericCluster = Number(clusterId);
    const windowMs = this._windowForCluster(numericCluster);
    const key = this.makeKey(endpointId, numericCluster, frame, meta);
    const lastSeen = this.cache.get(key);

    this.cache.set(key, now);
    this._cleanup(now, windowMs);

    return {
      suppress: lastSeen !== undefined && now - lastSeen < windowMs,
      key,
      windowMs,
      age: lastSeen === undefined ? null : now - lastSeen,
    };
  }

  makeKey(endpointId, clusterId, frame, meta = {}) {
    const commandId = RawFrameDeduplicator.commandId(frame, meta);
    const payload = RawFrameDeduplicator.extractPayload(frame);
    // P2830: bounded key. Was payload.toString('hex') (unbounded) / JSON.stringify of the whole frame
    // object for every raw frame on every device (heap churn on a ~64 MB Homey process).
    // Exact-payload semantics are kept: first MAX_KEY_BYTES as hex + total length + FNV-1a of ALL bytes.
    const payloadKey = payload
      ? RawFrameDeduplicator.payloadKey(payload)
      : RawFrameDeduplicator.stableValue(frame).slice(0, MAX_VALUE_CHARS);
    return `${endpointId || 1}:${clusterId}:${commandId ?? 'na'}:${payloadKey}`;
  }

  _windowForCluster(clusterId) {
    if (clusterId === 0xEF00 || clusterId === 0xE000) {
      return this.tuyaWindowMs;
    }
    return this.defaultWindowMs;
  }

  _cleanup(now, windowMs) {
    this.count += 1;
    if (this.count % 100 !== 0 && this.cache.size <= this.maxCacheSize) {
      return;
    }

    const cutoff = now - Math.max(windowMs * 10, 5000);
    for (const [key, seenAt] of this.cache) {
      if (seenAt < cutoff) {
        this.cache.delete(key);
      }
    }

    if (this.cache.size > this.maxCacheSize) {
      const keys = [...this.cache.keys()];
      for (let i = 0; i < Math.ceil(keys.length / 2); i += 1) {
        this.cache.delete(keys[i]);
      }
    }
  }

  static commandId(frame, meta = {}) {
    const value = frame?.cmdId ?? frame?.commandId ?? frame?.CommandID ??
      frame?.command?.id ?? meta?.cmdId ?? meta?.commandId ?? meta?.CommandID;
    if (value === undefined || value === null) {
      return null;
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : String(value);
  }

  static extractPayload(frame) {
    if (Buffer.isBuffer(frame)) {
      return frame;
    }

    const candidates = [
      frame?.data,
      frame?.payload,
      frame?.Payload,
      frame?.Data,
      frame?.raw,
      frame?.command?.data,
      frame?.command?.payload,
    ];

    for (const candidate of candidates) {
      if (Buffer.isBuffer(candidate)) {
        return candidate;
      }
      if (Array.isArray(candidate)) {
        return Buffer.from(candidate);
      }
      if (typeof candidate === 'string' && /^(0x)?[0-9a-fA-F]+$/.test(candidate)) {
        return Buffer.from(candidate.replace(/^0x/i, ''), 'hex');
      }
    }

    return null;
  }

  /** Bounded exact-payload key: head bytes (hex) + length + hash over every byte. */
  static payloadKey(payload) {
    if (payload.length <= MAX_KEY_BYTES) { return payload.toString('hex'); }
    return `${payload.subarray(0, MAX_KEY_BYTES).toString('hex')}~${payload.length}~${fnv1a(payload)}`;
  }

  /**
   * Shallow, bounded fingerprint of a frame without a binary payload. Primitive fields and Buffers
   * only (nested objects are reduced to a type marker): never JSON.stringify an arbitrary object graph.
   */
  static stableValue(value) {
    if (Buffer.isBuffer(value)) {
      return `buffer:${RawFrameDeduplicator.payloadKey(value)}`;
    }
    if (Array.isArray(value)) {
      return `array:${value.length}:${value.slice(0, MAX_KEY_BYTES).join(',')}`;
    }
    if (value && typeof value === 'object') {
      const parts = [];
      let n = 0;
      for (const key of Object.keys(value).sort()) {
        if (n >= MAX_SHALLOW_KEYS) { break; }
        n += 1;
        const item = value[key];
        let repr;
        if (Buffer.isBuffer(item)) { repr = `buffer:${RawFrameDeduplicator.payloadKey(item)}`; }
        else if (item === null || ['string', 'number', 'boolean'].includes(typeof item)) { repr = String(item).slice(0, 64); }
        else if (Array.isArray(item)) { repr = `array:${item.length}`; }
        else { repr = typeof item; }
        parts.push(`${key}=${repr}`);
      }
      return parts.join('|').slice(0, MAX_VALUE_CHARS);
    }
    return String(value).slice(0, MAX_VALUE_CHARS);
  }
}

module.exports = RawFrameDeduplicator;
