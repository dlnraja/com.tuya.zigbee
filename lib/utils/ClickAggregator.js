'use strict';

/**
 * ClickAggregator (P2798) — app-level multi-click counting for remotes whose firmware only sends
 * one command per press (e.g. toggle firmware alternating On/Off). Presses arriving within
 * `windowMs` of each other form one gesture; when the window closes the gesture is emitted once:
 * 1 → 'single', 2 → 'double', 3+ → 'multi' (triple). Uses the safe Homey timers.
 */
const { safeSetTimeout, safeClearTimeout } = require('./safe-timers');

const MIN_WINDOW = 150;
const MAX_WINDOW = 2000;

function clampWindow(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) {return 0;}
  return Math.max(MIN_WINDOW, Math.min(MAX_WINDOW, Math.round(n)));
}

function typeForCount(count) {
  if (count >= 3) {return 'multi';}
  return count === 2 ? 'double' : 'single';
}

class ClickAggregator {
  /**
   * @param {object} host  Homey device (for safe timers)
   * @param {(key: string|number, type: string, count: number) => void} emit
   */
  constructor(host, emit) {
    this.host = host;
    this.emit = emit;
    this.state = new Map();
  }

  /** Register one press for `key`; returns the running count. */
  press(key, windowMs) {
    const w = clampWindow(windowMs);
    if (!w) { this.emit(key, 'single', 1); return 1; }
    const st = this.state.get(key) || { count: 0, timer: null };
    st.count += 1;
    if (st.timer) {safeClearTimeout(this.host, st.timer);}
    st.timer = safeSetTimeout(this.host, () => {
      const n = st.count;
      this.state.delete(key);
      try { this.emit(key, typeForCount(n), Math.min(n, 3)); } catch (_e) { /* soft */ }
    }, w);
    this.state.set(key, st);
    return st.count;
  }

  destroy() {
    for (const st of this.state.values()) {if (st.timer) {safeClearTimeout(this.host, st.timer);}}
    this.state.clear();
  }
}

module.exports = { ClickAggregator, clampWindow, typeForCount, MIN_WINDOW, MAX_WINDOW };
