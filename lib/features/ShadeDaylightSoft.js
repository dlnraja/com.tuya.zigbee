'use strict';

/**
 * ShadeDaylightSoft (P2566) — unbranded solar→cover (Lutron Sunset Tracker / shade feel).
 * At dusk close enrolled covers; at dawn open. BootBudget-safe poll. MASTER_ONLY.
 * UI: Shade Daylight Soft.
 */

class ShadeDaylightSoft {
  constructor(app, opts = {}) {
    this.app = app;
    this.homey = app?.homey;
    this._covers = new Set();
    this._duskElev = Number(opts.duskElev) || -3;
    this._dawnElev = Number(opts.dawnElev) || 3;
    this._intervalMs = Math.max(60000, Math.min(600000, Number(opts.intervalMs) || 180000));
    this._interval = null;
    this._lastPhase = null; // 'day' | 'night'
    this._destroyed = false;
  }

  start() {
    if (this._interval || !this.homey) return;
    this._interval = this.homey.setInterval(() => {
      if (this._destroyed) return;
      this._tick().catch(() => {});
    }, this._intervalMs);
    this._tick().catch(() => {});
  }

  stop() {
    if (this._interval) {
      try { this.homey?.clearInterval?.(this._interval); } catch (_e) { /* */ }
      this._interval = null;
    }
  }

  destroy() {
    this._destroyed = true;
    this.stop();
    this._covers.clear();
  }

  enroll(cover) {
    if (!cover) return false;
    this._covers.add(cover);
    this.start();
    return true;
  }

  unenroll(cover) {
    return this._covers.delete(cover);
  }

  _elevation() {
    try {
      const solar = this.app?.solarElevation;
      if (solar && typeof solar.getElevation === 'function') {
        return Number(solar.getElevation(new Date()));
      }
    } catch (_e) { /* */ }
    return null;
  }

  async _setCover(cover, position01) {
    const set = cover.safeSetCapabilityValue?.bind(cover) || cover.setCapabilityValue?.bind(cover);
    if (cover.hasCapability?.('windowcoverings_set') && set) {
      await set('windowcoverings_set', position01).catch(() => {});
      return;
    }
    if (cover.hasCapability?.('windowcoverings_state') && set) {
      await set('windowcoverings_state', position01 < 0.5 ? 'down' : 'up').catch(() => {});
    }
  }

  async _tick() {
    if (!this._covers.size) return;
    const elev = this._elevation();
    if (!Number.isFinite(elev)) return;

    let phase = this._lastPhase;
    if (elev <= this._duskElev) phase = 'night';
    else if (elev >= this._dawnElev) phase = 'day';
    else return; // twilight hold

    if (phase === this._lastPhase) return;
    this._lastPhase = phase;
    const target = phase === 'night' ? 0 : 1; // 0 closed, 1 open (Homey convention)
    for (const cover of this._covers) {
      try { await this._setCover(cover, target); } catch (_e) { /* soft */ }
    }
    this.app.log?.(`[SHADE-DAYLIGHT] phase=${phase} elev=${elev.toFixed?.(1) ?? elev}`);
  }

  snapshot() {
    return {
      covers: this._covers.size,
      lastPhase: this._lastPhase,
      duskElev: this._duskElev,
      dawnElev: this._dawnElev,
    };
  }
}

module.exports = ShadeDaylightSoft;
