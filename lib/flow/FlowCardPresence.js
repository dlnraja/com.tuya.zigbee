'use strict';

/**
 * FlowCardPresence (P2830) — cheap, cached "is this flow card declared in the manifest?" check and a
 * bounded fan-out limiter for event-driven flow triggers.
 *
 * WHY (Bastien 17/10-18/10 diags): the house app publishes a pruned fleet, so app-level cards such as
 * `home_mode_changed`, `capability_value_changed_generic` and `device_interaction` do not exist in the
 * manifest. Every capability change still called getTriggerCard() for them, which threw
 * "Invalid Flow Card ID" and logged it (FLOW-GUARD) for each relay/button event. With ~11 devices
 * reporting this is pure overhead on a process that has a ~64 MB budget. We now look the id up once.
 *
 * Additive: when the manifest cannot be read, the card is assumed present (previous behaviour).
 */

const KIND_KEYS = { trigger: 'triggers', condition: 'conditions', action: 'actions' };
const _cache = new WeakMap(); // manifest object -> { triggers:Set, conditions:Set, actions:Set }

function _index(manifest) {
  let idx = _cache.get(manifest);
  if (idx) { return idx; }
  idx = { triggers: new Set(), conditions: new Set(), actions: new Set() };
  const flow = manifest && manifest.flow;
  for (const key of Object.values(KIND_KEYS)) {
    const list = flow && flow[key];
    if (Array.isArray(list)) {
      for (const c of list) { if (c && c.id) { idx[key].add(String(c.id)); } }
    }
  }
  _cache.set(manifest, idx);
  return idx;
}

/**
 * @param {object} homey
 * @param {'trigger'|'condition'|'action'} kind
 * @param {string} id
 * @returns {boolean} false only when the manifest is readable and does not declare the card
 */
function isCardDeclared(homey, kind, id) {
  try {
    const manifest = homey && homey.manifest;
    if (!manifest || !manifest.flow || typeof manifest.flow !== 'object') { return true; }
    const key = KIND_KEYS[kind];
    if (!key || !Array.isArray(manifest.flow[key])) { return true; }
    return _index(manifest)[key].has(String(id));
  } catch (_e) {
    return true;
  }
}

/**
 * Sliding one-second window limiter. `allow()` is false once `max` events were admitted in the
 * current window; dropped events are counted so callers can log a single summary line.
 */
class FanoutLimiter {
  constructor({ max = 40, windowMs = 1000, now = () => Date.now() } = {}) {
    this.max = max; this.windowMs = windowMs; this._now = now;
    this._start = 0; this._count = 0; this.dropped = 0;
  }

  allow() {
    const t = this._now();
    if (t - this._start >= this.windowMs) { this._start = t; this._count = 0; }
    if (this._count >= this.max) { this.dropped += 1; return false; }
    this._count += 1;
    return true;
  }
}

/** Re-entrancy guard: runs fn unless the same key is already running (sync section only). */
function runOnce(active, key, fn) {
  if (active.has(key)) { return undefined; }
  active.add(key);
  try { return fn(); } finally { active.delete(key); }
}

module.exports = { isCardDeclared, FanoutLimiter, runOnce, _index };
