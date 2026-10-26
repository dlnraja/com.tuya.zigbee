'use strict';
const { nativeSetTimeout, nativeClearTimeout } = require('../utils/nativeTimer'); // P3068

/**
 * CoverMotionTracker: per-cover "is moving" state and one "movement finished"
 * event per move, with a success flag. Optional and additive.
 *
 * WHY(P3030): Homey's windowcoverings_state is a command button (up / idle /
 * down), not a status, so flows cannot tell "the cover is moving" or "the
 * move ended, and how". Adrian Rockall's Somfy TaHoma & Connexoon app answered
 * this with an "Is moving" condition and a per-device "command complete"
 * trigger that carries a success flag (community topic 35206, posts #511,
 * #761, #824, #2157). He also waits a little after "complete" before trusting
 * the last position, because the final position report can arrive after the
 * end signal (#1079-#1087, 16 s). Credited in CREDITS.md. This is a fresh
 * implementation for Zigbee / Tuya DP reports, no code copied.
 *
 * How a move ends (first match wins):
 * - "reached": a position report lands within `eps` of the commanded target;
 * - "stopped": a stop command, or the device itself reports idle;
 * - "settled": position reports stop changing for `settleMs`;
 * - "failed": the command was rejected (not a radio timeout);
 * - "budget": nothing ended the move within `budgetMs` (state-only covers).
 * success = not failed. `reached` tells whether the target was hit.
 *
 * It never writes windowcoverings_state (P2393/P2399: an optimistic idle can
 * re-trigger a stop on some motors). Bounded: two timers per cover at most,
 * nothing kept after destroy().
 */

const DEFAULTS = Object.freeze({ settleMs: 5000, budgetMs: 90000, eps: 0.03, finalReadMs: 16000 });

function _num(v) {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

class CoverMotionTracker {
  /**
   * @param {object} [opts]
   * @param {Function} [opts.onFinished] ({success, reached, reason, position, target, durationMs}) => void
   * @param {Function} [opts.onFinalRead] () => void, called once `finalReadMs` after a move ends
   * @param {{setTimeout: Function, clearTimeout: Function}} [opts.timers]
   */
  constructor(opts = {}) {
    const o = { ...DEFAULTS, ...opts };
    this.settleMs = Math.max(500, o.settleMs | 0);
    this.budgetMs = Math.max(this.settleMs, o.budgetMs | 0);
    this.eps = Math.max(0, Math.min(0.2, Number(o.eps) || DEFAULTS.eps));
    this.finalReadMs = Math.max(0, o.finalReadMs | 0);
    this.onFinished = typeof o.onFinished === 'function' ? o.onFinished : null;
    this.onFinalRead = typeof o.onFinalRead === 'function' ? o.onFinalRead : null;
    this._timers = o.timers || { setTimeout: (fn, ms) => nativeSetTimeout(fn, ms), clearTimeout: (t) => nativeClearTimeout(t) };
    this._now = o.now || (() => Date.now());
    this.moving = false;
    this.position = null; // last known 0..1
    this.target = null;
    this._startedAt = 0;
    this._settleT = null;
    this._budgetT = null;
    this._finalT = null;
    this._destroyed = false;
  }

  _clear(name) {
    if (this[name]) { this._timers.clearTimeout(this[name]); this[name] = null; }
  }

  _armSettle() {
    this._clear('_settleT');
    this._settleT = this._timers.setTimeout(() => { this._settleT = null; this._finish('settled'); }, this.settleMs);
  }

  _begin(target) {
    this._clear('_finalT');
    if (!this.moving) { this.moving = true; this._startedAt = this._now(); }
    this.target = target;
    this._clear('_budgetT');
    this._budgetT = this._timers.setTimeout(() => { this._budgetT = null; this._finish('budget'); }, this.budgetMs);
  }

  _reached() {
    return this.target !== null && this.position !== null && Math.abs(this.position - this.target) <= this.eps;
  }

  _finish(reason, error) {
    if (!this.moving || this._destroyed) {return;}
    this._clear('_settleT');
    this._clear('_budgetT');
    this.moving = false;
    const info = {
      success: reason !== 'failed',
      reached: this._reached(),
      reason,
      position: this.position,
      target: this.target,
      durationMs: Math.max(0, this._now() - this._startedAt),
    };
    if (error) {info.error = String((error && error.message) || error);}
    this.target = null;
    if (this.onFinished) { try { this.onFinished(info); } catch (_) { /* listener errors stay local */ } }
    if (this.onFinalRead && this.finalReadMs > 0 && reason !== 'failed') {
      this._finalT = this._timers.setTimeout(() => {
        this._finalT = null;
        if (!this.moving && !this._destroyed) { try { this.onFinalRead(); } catch (_) { /* soft */ } }
      }, this.finalReadMs);
    }
  }

  /** A command was sent: target 0..1, or 'up' / 'down' / 'idle'. */
  noteCommand(target) {
    if (this._destroyed) {return;}
    if (target === 'idle' || target === 'stop') { this._finish('stopped'); return; }
    const t = target === 'up' ? 1 : target === 'down' ? 0 : _num(target);
    if (t === null) {return;}
    this._begin(Math.max(0, Math.min(1, t)));
    if (this._reached()) { this._finish('reached'); }
  }

  /** The command was rejected by the device or the stack (not a soft timeout). */
  noteFailed(error) {
    if (!this.moving) { this._begin(this.target); }
    this._finish('failed', error);
  }

  /** The device reported its motion state (Homey values: up / idle / down). */
  noteState(state) {
    if (this._destroyed) {return;}
    if (state === 'idle') { this._finish('stopped'); return; }
    if (state === 'up' || state === 'down') {
      if (!this.moving) { this._begin(null); }
      this._armSettle();
    }
  }

  /** The device reported a position (0..1). Starts tracking an external move too. */
  notePosition(value) {
    if (this._destroyed) {return;}
    const p = _num(value);
    if (p === null) {return;}
    const prev = this.position;
    this.position = Math.max(0, Math.min(1, p));
    if (!this.moving) {
      if (prev === null || Math.abs(this.position - prev) <= this.eps) {return;}
      this._begin(null); // moved from a remote, a wall switch or by hand
    }
    if (this._reached()) { this._finish('reached'); return; }
    this._armSettle();
  }

  destroy() {
    this._destroyed = true;
    this._clear('_settleT');
    this._clear('_budgetT');
    this._clear('_finalT');
    this.moving = false;
  }
}

/* ---------- Homey glue (app-level flow cards) ---------- */

const TRIGGER_ID = 'cover_movement_finished';
const CONDITION_ID = 'cover_is_moving';

function _deviceId(device) {
  try {
    const d = device && typeof device.getData === 'function' ? device.getData() : null;
    return (d && d.id) || (device && device.id) || null;
  } catch (_) { return null; }
}

/** Tokens for the trigger card. Homey tokens cannot be null: unknown position = -1. */
function finishedTokens(info) {
  const pos = info && typeof info.position === 'number' ? Math.round(info.position * 100) : -1;
  return {
    success: !!(info && info.success),
    reached: !!(info && info.reached),
    position: pos,
    reason: String((info && info.reason) || 'settled'),
  };
}

/**
 * Tracker bound to a Homey device: fires the app trigger with the device id as
 * state. Uses the app timers so everything is cleared when the app stops.
 */
function trackerForDevice(device, opts = {}) {
  const homey = device && device.homey;
  const timers = homey && typeof homey.setTimeout === 'function'
    ? { setTimeout: (fn, ms) => homey.setTimeout(fn, ms), clearTimeout: (t) => homey.clearTimeout(t) }
    : undefined;
  return new CoverMotionTracker({
    timers,
    ...opts,
    onFinished: (info) => {
      if (typeof opts.onFinished === 'function') { try { opts.onFinished(info); } catch (_) { /* soft */ } }
      try {
        const card = homey && homey.flow && typeof homey.flow.getTriggerCard === 'function'
          ? homey.flow.getTriggerCard(TRIGGER_ID) : null;
        if (card && typeof card.trigger === 'function') {
          Promise.resolve(card.trigger(finishedTokens(info), { deviceId: _deviceId(device) })).catch(() => {});
        }
      } catch (_) { /* card not in this build */ }
    },
  });
}

/** Register the app-level trigger filter and the "is moving" condition. */
function registerCoverMotionCards(homey, { log } = {}) {
  const wired = [];
  const flow = homey && homey.flow;
  if (!flow) {return wired;}
  try {
    const trig = typeof flow.getTriggerCard === 'function' ? flow.getTriggerCard(TRIGGER_ID) : null;
    if (trig && typeof trig.registerRunListener === 'function') {
      trig.registerRunListener(async (args, state) => {
        if (!args || !args.device || !state) {return false;}
        return _deviceId(args.device) === state.deviceId;
      });
      wired.push(TRIGGER_ID);
    }
  } catch (_) { /* not in this build */ }
  try {
    const cond = typeof flow.getConditionCard === 'function' ? flow.getConditionCard(CONDITION_ID) : null;
    if (cond && typeof cond.registerRunListener === 'function') {
      cond.registerRunListener(async (args) => isDeviceMoving(args && args.device));
      wired.push(CONDITION_ID);
    }
  } catch (_) { /* not in this build */ }
  if (log && wired.length) {log(`P3030 cover motion cards: ${wired.join(', ')}`);}
  return wired;
}

/** True while the device's tracker sees a move in progress (false when untracked). */
function isDeviceMoving(device) {
  const t = device && device._coverMotion;
  return !!(t && t.moving);
}

module.exports = {
  CoverMotionTracker, DEFAULTS, trackerForDevice, registerCoverMotionCards,
  isDeviceMoving, finishedTokens, TRIGGER_ID, CONDITION_ID,
};
