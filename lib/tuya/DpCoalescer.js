'use strict';
// WHY(2026-10-10): Tuya light controllers (Gledopto SPI, TS0601 RGB) drop or mis-apply bursts of
// DP writes and sometimes freeze. Opt-in helper: coalesce writes per device into one frame after a
// short debounce, bounded queue, hue wrap 0-359, brightness preserved on colour changes,
// read-back check with one bounded retry, optional state re-send after a stall.

function wrapHue(h) {
  const n = Math.round(Number(h));
  if (!Number.isFinite(n)) return 0;
  return ((n % 360) + 360) % 360;
}

class DpCoalescer {
  /**
   * @param {object} opts
   * @param {(dps: Array<{dp:number,value:any}>) => Promise<void>} opts.send  writes one frame
   * @param {(dp:number) => any} [opts.readBack]  last reported value for dp (undefined = unknown)
   * @param {number} [opts.debounceMs=150]
   * @param {number} [opts.maxQueue=16]  distinct DPs kept; oldest dropped beyond
   * @param {number} [opts.verifyMs=1500] delay before read-back check (0 = off)
   * @param {number} [opts.stallMs=0]  re-send last full state after this idle stall (0 = off)
   */
  constructor(opts) {
    if (!opts || typeof opts.send !== 'function') throw new TypeError('send required');
    this._send = opts.send;
    this._homey = opts.homey || null; // pass device.homey so timers are Homey-managed
    this._readBack = opts.readBack;
    this._debounceMs = opts.debounceMs ?? 150;
    this._maxQueue = opts.maxQueue ?? 16;
    this._verifyMs = opts.verifyMs ?? 1500;
    this._stallMs = opts.stallMs ?? 0;
    this._pending = new Map();
    this._state = new Map();
    this._timer = null; this._verifyTimer = null; this._stallTimer = null;
    this._destroyed = false;
  }

  _later(fn, ms) {
    if (this._homey && typeof this._homey.setTimeout === 'function') return this._homey.setTimeout(fn, ms);
    // no homey (unit tests / script utility): native setTimeout fallback
    return setTimeout(fn, ms);
  }

  _cancel(t) {
    if (!t) return;
    if (this._homey && typeof this._homey.clearTimeout === 'function') this._homey.clearTimeout(t);
    else clearTimeout(t);
  }

  static wrapHue(h) { return wrapHue(h); }

  /** Queue a DP value; returns a promise resolved when the frame containing it is sent. */
  set(dp, value) {
    if (this._destroyed) return Promise.resolve();
    this._pending.delete(dp); // re-insert so newest is last
    this._pending.set(dp, value);
    while (this._pending.size > this._maxQueue) this._pending.delete(this._pending.keys().next().value);
    if (!this._flushPromise) {
      this._flushPromise = new Promise((resolve, reject) => { this._res = resolve; this._rej = reject; });
    }
    this._cancel(this._timer);
    this._timer = this._later(() => this.flush(), this._debounceMs);
    return this._flushPromise;
  }

  /** Colour helper: hue wrapped, brightness kept from last known state when omitted. */
  setColour(dp, { h, s, v }, encode) {
    const prev = this._state.get(dp) || {};
    const val = { h: wrapHue(h ?? prev.h ?? 0), s: s ?? prev.s ?? 1000, v: v ?? prev.v ?? 1000 };
    return this.set(dp, encode ? encode(val) : val).then(() => { this._state.set(dp, val); });
  }

  async flush() {
    this._cancel(this._timer); this._timer = null;
    const res = this._res, rej = this._rej;
    this._flushPromise = null; this._res = this._rej = null;
    if (!this._pending.size) { if (res) res(); return; }
    const frame = [...this._pending].map(([dp, value]) => ({ dp, value }));
    this._pending.clear();
    try {
      await this._send(frame);
      for (const { dp, value } of frame) if (typeof value !== 'object') this._state.set(dp, value);
      this._lastFrame = frame;
      this._scheduleVerify(frame);
      this._armStall();
      if (res) res();
    } catch (e) { if (rej) rej(e); }
  }

  _scheduleVerify(frame) {
    if (!this._verifyMs || typeof this._readBack !== 'function') return;
    this._cancel(this._verifyTimer);
    this._verifyTimer = this._later(() => {
      if (this._destroyed) return;
      const miss = frame.filter(({ dp, value }) => {
        const got = this._readBack(dp);
        return got !== undefined && typeof value !== 'object' && got !== value;
      });
      if (miss.length) this._send(miss).catch(() => {}); // single bounded retry, no re-verify
    }, this._verifyMs);
  }

  _armStall() {
    if (!this._stallMs) return;
    this._cancel(this._stallTimer);
    this._stallTimer = this._later(() => {
      if (!this._destroyed && this._lastFrame) this._send(this._lastFrame).catch(() => {});
    }, this._stallMs);
  }

  /** Call from device onDeleted/onUninit. */
  destroy() {
    this._destroyed = true;
    this._cancel(this._timer); this._cancel(this._verifyTimer); this._cancel(this._stallTimer);
    this._pending.clear();
    if (this._res) this._res();
    this._flushPromise = null;
  }
}

module.exports = DpCoalescer;
