'use strict';

const MAX_KEY_BYTES = 48;
const MAX_VALUE_CHARS = 256;
const MAX_SHALLOW_KEYS = 24;
// P3023 memory caps
const DEFAULT_MAX_KEYS = 128;
const MIN_RETENTION_MS = 2000;
const ADAPTIVE_MAX_CLUSTERS = 16;
const ADAPTIVE_SAMPLES = 16;
const ADAPTIVE_MIN_SAMPLES = 8;
const ADAPTIVE_MAX_FACTOR = 1.5;

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
    // P3023: hard cap 128 (was 500 + clean-up every 100 calls → up to ~500 live keys per device,
    // ≈60 KB/device of 48-byte-hex keys measured on the 150-device × 10k-frame harness).
    // Callers that still pass 500 (TuyaZigbeeDevice) are clamped: the cap is a hard ceiling.
    this.maxCacheSize = Math.max(8, Math.min(Number(options.maxCacheSize) || DEFAULT_MAX_KEYS, DEFAULT_MAX_KEYS));
    this.cache = new Map(); // key -> seenAt, insertion order == recency order (delete + set)
    this.count = 0;
    this.evictions = 0;
    // P3023 (master soak): adaptive window per cluster, learned from real inter-frame gaps.
    this.adaptive = options.adaptive ?? RawFrameDeduplicator.ADAPTIVE_DEFAULT;
    this._gaps = this.adaptive ? new Map() : null; // cluster -> { g: number[], w: number }
  }

  shouldSuppress(endpointId, clusterId, frame, meta = {}) {
    const now = Date.now();
    const numericCluster = Number(clusterId);
    const windowMs = this._windowForCluster(numericCluster);
    const key = this.makeKey(endpointId, numericCluster, frame, meta);
    const lastSeen = this.cache.get(key);

    if (lastSeen !== undefined) { this.cache.delete(key); }
    this.cache.set(key, now);
    this._cleanup(now, windowMs);
    if (this._gaps && lastSeen !== undefined) { this._observeGap(numericCluster, now - lastSeen); }

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

  _baseWindow(clusterId) {
    if (clusterId === 0xEF00 || clusterId === 0xE000) {
      return this.tuyaWindowMs;
    }
    return this.defaultWindowMs;
  }

  _windowForCluster(clusterId) {
    const base = this._baseWindow(clusterId);
    if (!this._gaps) { return base; }
    const st = this._gaps.get(clusterId);
    return st && st.w ? st.w : base;
  }

  /**
   * P3023 (master soak): learn the duplicate window from the repeat gaps really observed.
   * Only WIDENS, bounded to ADAPTIVE_MAX_FACTOR × base, and only when most repeats of an identical
   * payload land just after the base window (classic Tuya double-path echo at 0.8-1.1 s). A single
   * stray gap never moves it; with no evidence it decays back to the base window.
   */
  _observeGap(clusterId, gap) {
    const base = this._baseWindow(clusterId);
    if (!(gap >= 0) || gap > base * 2) { return; }
    let st = this._gaps.get(clusterId);
    if (!st) {
      if (this._gaps.size >= ADAPTIVE_MAX_CLUSTERS) { this._gaps.delete(this._gaps.keys().next().value); }
      st = { g: [], w: 0 };
      this._gaps.set(clusterId, st);
    }
    st.g.push(gap);
    if (st.g.length > ADAPTIVE_SAMPLES) { st.g.shift(); }
    if (st.g.length < ADAPTIVE_MIN_SAMPLES) { return; }
    const near = st.g.filter((x) => x >= base && x <= base * ADAPTIVE_MAX_FACTOR);
    if (near.length / st.g.length >= 0.6) {
      const sorted = near.slice().sort((a, b) => a - b);
      const p90 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))];
      st.w = Math.min(Math.round(base * ADAPTIVE_MAX_FACTOR), Math.max(base, Math.round(p90 + 50)));
    } else if (near.length === 0) {
      st.w = 0; // back to base
    }
  }

  /** Diag: learned windows (cluster hex → ms). */
  adaptiveWindows() {
    const out = {};
    if (!this._gaps) { return out; }
    for (const [c, st] of this._gaps) { if (st.w) { out[`0x${(c >>> 0).toString(16)}`] = st.w; } }
    return out;
  }

  _cleanup(now, windowMs) {
    this.count += 1;
    // P3023: entries are recency-ordered, so expired ones sit at the head; drop them on every
    // call (amortised O(1)) instead of a full scan every 100 calls, then enforce the hard cap.
    const cutoff = now - Math.max(windowMs * 2, MIN_RETENTION_MS);
    for (const [key, seenAt] of this.cache) {
      if (seenAt >= cutoff) { break; }
      this.cache.delete(key);
    }
    while (this.cache.size > this.maxCacheSize) {
      this.cache.delete(this.cache.keys().next().value);
      this.evictions += 1;
    }
  }

  /** P3023: memory-budget hook — forget everything (only costs one possible duplicate). */
  clear() {
    this.cache.clear();
    if (this._gaps) { this._gaps.clear(); }
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

/** P3023: adaptive windows are soaking on master; stable/bastien keep fixed windows. */
// P3023: adaptive windows soak on master (SoakFlags.adaptiveDedup); fixed windows elsewhere.
RawFrameDeduplicator.ADAPTIVE_DEFAULT = (() => { try { return !!require('../smart/SoakFlags').adaptiveDedup; } catch (_e) { return false; } })();
RawFrameDeduplicator.DEFAULT_MAX_KEYS = DEFAULT_MAX_KEYS;

module.exports = RawFrameDeduplicator;
