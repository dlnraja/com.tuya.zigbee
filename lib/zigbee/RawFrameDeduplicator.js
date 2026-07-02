'use strict';

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
    const payloadKey = payload
      ? payload.toString('hex')
      : RawFrameDeduplicator.stableValue(frame).slice(0, 1024);
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

  static stableValue(value) {
    if (Buffer.isBuffer(value)) {
      return `buffer:${value.toString('hex')}`;
    }
    if (Array.isArray(value)) {
      return `array:${Buffer.from(value).toString('hex')}`;
    }
    if (value && typeof value === 'object') {
      const sorted = {};
      for (const key of Object.keys(value).sort()) {
        const item = value[key];
        sorted[key] = Buffer.isBuffer(item) ? `buffer:${item.toString('hex')}` : item;
      }
      try {
        return JSON.stringify(sorted);
      } catch (err) {
        return String(value);
      }
    }
    return String(value);
  }
}

module.exports = RawFrameDeduplicator;
