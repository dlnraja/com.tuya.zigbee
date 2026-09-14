'use strict';

/**
 * P2501 — IRFloodGuard (Intelligent IR anti-spam / anti-flood)
 *
 * WHY: Flow loops, virtual remotes, and double-presses flood IR LEDs,
 * Zosung chunk TX, WiFi DP201, and Homey Pronto RF — causes MCU lag / missed codes.
 * Contre quoi: identical Pronto spam, repetitions>>3, learn-spam, parallel blasts.
 *
 * Dual-app: MASTER_ONLY (Intelligent IR UX). Zosung device entry uses same guard
 * when called outside the router (thin BOTH-safe reliability).
 */

const DEFAULTS = Object.freeze({
  minIntervalMs: Object.freeze({
    zigbee: 350,
    wifi: 300,
    homey: 400,
    default: 350,
  }),
  identicalDedupMs: 900,
  maxRepetitions: 3,
  globalWindowMs: 1000,
  globalMaxPerWindow: 5,
  learnCooldownMs: 2500,
  maxKeys: 64,
});

function hashPayload(payload) {
  const str = String(payload || '');
  let h = 0;
  const n = Math.min(str.length, 4096);
  for (let i = 0; i < n; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return `${str.length}:${h}`;
}

class IRFloodGuard {
  /**
   * @param {Partial<typeof DEFAULTS> & { minIntervalMs?: object }} [opts]
   */
  constructor(opts = {}) {
    this.cfg = {
      ...DEFAULTS,
      ...opts,
      minIntervalMs: { ...DEFAULTS.minIntervalMs, ...(opts.minIntervalMs || {}) },
    };
    /** @type {Map<string, { lastTs: number, lastHash: string|null, lastLearnTs: number }>} */
    this._bySender = new Map();
    /** @type {number[]} */
    this._global = [];
  }

  clampRepetitions(n) {
    const r = Math.max(1, Number(n) || 1);
    return Math.min(r, this.cfg.maxRepetitions);
  }

  _cleanup(now) {
    if (this._bySender.size <= this.cfg.maxKeys) return;
    for (const [k, v] of this._bySender) {
      if (now - (v.lastTs || 0) > 60_000 && now - (v.lastLearnTs || 0) > 60_000) {
        this._bySender.delete(k);
      }
    }
  }

  _state(key) {
    let st = this._bySender.get(key);
    if (!st) {
      st = { lastTs: 0, lastHash: null, lastLearnTs: 0 };
      this._bySender.set(key, st);
    }
    return st;
  }

  /**
   * Pessimistic record on allow (blocks parallel double-fire).
   * @returns {{ allow: true, repetitions: number } | { allow: false, reason: string, retryAfterMs: number, skipped: true, hard?: boolean }}
   */
  checkSend({
    senderKey = 'unknown',
    transport = 'default',
    payload = '',
    repetitions = 1,
    now = Date.now(),
  } = {}) {
    const key = String(senderKey || 'unknown');
    const minIv = this.cfg.minIntervalMs[transport] || this.cfg.minIntervalMs.default;
    const hash = hashPayload(payload);
    const cappedRep = this.clampRepetitions(repetitions);

    this._global = this._global.filter((t) => now - t < this.cfg.globalWindowMs);
    if (this._global.length >= this.cfg.globalMaxPerWindow) {
      return {
        allow: false,
        reason: 'global_flood',
        retryAfterMs: this.cfg.globalWindowMs,
        skipped: true,
        hard: true,
      };
    }

    const st = this._state(key);

    if (st.lastHash === hash && st.lastTs && (now - st.lastTs) < this.cfg.identicalDedupMs) {
      return {
        allow: false,
        reason: 'identical_dedup',
        retryAfterMs: this.cfg.identicalDedupMs - (now - st.lastTs),
        skipped: true,
        hard: false,
      };
    }

    if (st.lastTs && (now - st.lastTs) < minIv) {
      return {
        allow: false,
        reason: 'sender_throttle',
        retryAfterMs: minIv - (now - st.lastTs),
        skipped: true,
        hard: false,
      };
    }

    st.lastTs = now;
    st.lastHash = hash;
    this._global.push(now);
    this._cleanup(now);

    return { allow: true, repetitions: cappedRep };
  }

  checkLearn({ senderKey = 'unknown', now = Date.now() } = {}) {
    const st = this._state(String(senderKey || 'unknown'));
    if (st.lastLearnTs && (now - st.lastLearnTs) < this.cfg.learnCooldownMs) {
      return {
        allow: false,
        reason: 'learn_cooldown',
        retryAfterMs: this.cfg.learnCooldownMs - (now - st.lastLearnTs),
        skipped: true,
        hard: false,
      };
    }
    st.lastLearnTs = now;
    return { allow: true };
  }

  reset() {
    this._bySender.clear();
    this._global = [];
  }
}

/**
 * Prefer Homey-scoped singleton so App share one guard across drivers.
 * @param {object} [homey]
 */
function getGuard(homey) {
  if (homey) {
    if (!homey.__irFloodGuard) {
      homey.__irFloodGuard = new IRFloodGuard();
    }
    return homey.__irFloodGuard;
  }
  if (!global.__irFloodGuardStandalone) {
    global.__irFloodGuardStandalone = new IRFloodGuard();
  }
  return global.__irFloodGuardStandalone;
}

module.exports = {
  IRFloodGuard,
  getGuard,
  DEFAULTS,
  hashPayload,
};
