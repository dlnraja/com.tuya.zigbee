'use strict';
// Spec 004 — common contract for NON-native channels (Tuya DP 0xEF00, 0xE000-0xE002,
// manufacturer-specific clusters, raw frames). Native ZCL clusters are not wrapped.
// Each wrapped layer: read/write/command/onReport; a circuit breaker disables the layer after
// `maxFailures` consecutive failures for `cooldownMs` (logged once per transition); calls are
// time-boxed and never throw to the caller. `background()` runs work without blocking
// pairing/onNodeInit. (Lightweight per-layer breaker; lib/utils/CircuitBreaker.js is the
// async exec-style breaker used by scrapers/caches.)

class CircuitBreaker {
  constructor({ maxFailures = 3, cooldownMs = 10 * 60 * 1000, now = () => Date.now(), log = () => {} } = {}) {
    Object.assign(this, { maxFailures, cooldownMs, _now: now, _log: log });
    this.failures = 0; this.openUntil = 0;
  }
  get open() { return this._now() < this.openUntil; }
  success() { if (this.failures || this.openUntil) this._log('layer recovered'); this.failures = 0; this.openUntil = 0; }
  failure(err) {
    this.failures++;
    if (this.failures >= this.maxFailures && !this.open) {
      this.openUntil = this._now() + this.cooldownMs;
      this._log(`layer disabled for ${Math.round(this.cooldownMs / 1000)}s after ${this.failures} failures: ${err && err.message}`);
    }
  }
}

const OPS = ['read', 'write', 'command'];

function withTimeout(p, ms) {
  let t;
  return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`timeout ${ms}ms`)), ms); })])
    .finally(() => clearTimeout(t));
}

/**
 * @param {string} name   e.g. 'tuya-dp', 'e001', 'raw-frame'
 * @param {object} impl   { read?, write?, command?, onReport? } (async functions)
 */
function wrapLayer(name, impl, { timeoutMs = 5000, breaker, log = () => {} } = {}) {
  const br = breaker || new CircuitBreaker({ log: (m) => log(`[LAYER:${name}] ${m}`) });
  const layer = { name, breaker: br, native: false };
  for (const op of OPS) {
    layer[op] = async (...args) => {
      if (typeof impl[op] !== 'function') return { ok: false, skipped: 'unsupported' };
      if (br.open) return { ok: false, skipped: 'disabled' };
      try {
        const value = await withTimeout(Promise.resolve().then(() => impl[op](...args)), timeoutMs);
        br.success();
        return { ok: true, value };
      } catch (err) {
        br.failure(err);
        return { ok: false, error: err && err.message };
      }
    };
  }
  layer.onReport = (cb) => {
    if (typeof impl.onReport !== 'function') return () => {};
    try { return impl.onReport((...a) => { try { cb(...a); } catch (_) { /* consumer error isolated */ } }) || (() => {}); } catch (err) { br.failure(err); return () => {}; }
  };
  return layer;
}

/** Try layers in order (fallback) or all at once (parallel); first ok wins. Never throws. */
async function runLayers(layers, op, args = [], { parallel = false } = {}) {
  const live = layers.filter((l) => l && !l.breaker?.open);
  if (parallel) {
    const res = await Promise.all(live.map((l) => l[op](...args).then((r) => ({ ...r, layer: l.name }))));
    return res.find((r) => r.ok) || { ok: false, results: res };
  }
  for (const l of live) {
    const r = await l[op](...args);
    if (r.ok) return { ...r, layer: l.name };
  }
  return { ok: false };
}

/** Fire-and-forget for init/pairing paths: never awaited by the caller, never rejects. */
function background(fn, log = () => {}) {
  Promise.resolve().then(fn).catch((err) => log(`[LAYER] background task failed: ${err && err.message}`));
}

module.exports = { CircuitBreaker, wrapLayer, runLayers, background, withTimeout };
