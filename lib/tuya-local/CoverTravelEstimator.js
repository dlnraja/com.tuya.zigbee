'use strict';

/**
 * CoverTravelEstimator — opt-in time-based position for Wi-Fi covers that only
 * expose open/close/stop (no position DP). Pure state machine: no timers, no I/O,
 * so the device owns (and releases) its own timer. Position is Homey-style 0..1
 * (1 = fully open). travelMs = full close→open travel time.
 *
 * Concept: same idea as the "time based" cover option of tuya-local / HA
 * template covers — integrate elapsed motion time against a calibrated travel time.
 */
class CoverTravelEstimator {
  constructor({ travelMs, position = null } = {}) {
    this.travelMs = Number.isFinite(travelMs) && travelMs > 0 ? travelMs : 0;
    this.position = typeof position === 'number' ? Math.max(0, Math.min(1, position)) : null;
    this._dir = 0; // +1 opening, -1 closing
    this._since = 0;
  }

  get enabled() { return this.travelMs > 0; }

  /** Current estimate at `now` (does not change state). */
  peek(now = Date.now()) {
    if (this.position === null) {return null;}
    if (!this._dir) {return this.position;}
    const delta = (now - this._since) / this.travelMs;
    return Math.max(0, Math.min(1, this.position + this._dir * delta));
  }

  /** state: 'up' | 'down' | 'idle'. Returns the settled estimate (or null if unknown). */
  onState(state, now = Date.now()) {
    if (!this.enabled) {return null;}
    const settled = this.peek(now);
    if (settled !== null) {this.position = settled;}
    const dir = state === 'up' ? 1 : state === 'down' ? -1 : 0;
    // A full run from an unknown start calibrates the end stop once travel time has elapsed.
    if (this.position === null && dir) {this.position = dir > 0 ? 0 : 1;}
    this._dir = dir;
    this._since = now;
    return this.position;
  }

  /** Plan a move to `target` (0..1): { state, ms } or null when already there / unknown. */
  plan(target) {
    if (!this.enabled) {return null;}
    const t = Math.max(0, Math.min(1, Number(target)));
    if (!Number.isFinite(t)) {return null;}
    if (t >= 0.995) {return { state: 'up', ms: 0 };} // end stops: let the motor run to its limit
    if (t <= 0.005) {return { state: 'down', ms: 0 };}
    if (this.position === null) {return null;}
    const diff = t - this.position;
    if (Math.abs(diff) < 0.01) {return null;}
    return { state: diff > 0 ? 'up' : 'down', ms: Math.round(Math.abs(diff) * this.travelMs) };
  }
}

module.exports = CoverTravelEstimator;
