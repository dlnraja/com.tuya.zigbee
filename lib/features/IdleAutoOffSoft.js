'use strict';

/**
 * IdleAutoOffSoft (P2566) — unbranded idle auto-off (Lutron Auto-Off Timer feel).
 * Light stays ON → after idleMinutes without dim/onoff change → soft off.
 * MASTER_ONLY. UI: Idle Auto-Off Soft.
 */

class IdleAutoOffSoft {
  constructor(app, opts = {}) {
    this.app = app;
    this.homey = app?.homey;
    this._devices = new Map(); // id → { light, idleMinutes, lastChange, lastOn }
    this._pollMs = Math.max(5000, Math.min(60000, Number(opts.pollMs) || 20000));
    this._interval = null;
    this._destroyed = false;
  }

  start() {
    if (this._interval || !this.homey) return;
    this._interval = this.homey.setInterval(() => {
      if (this._destroyed) return;
      this._tick().catch(() => {});
    }, this._pollMs);
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
    this._devices.clear();
  }

  enroll(light, opts = {}) {
    if (!light) return null;
    const id = String(light.getData?.()?.id || light.getName?.() || Math.random()).slice(0, 64);
    this._devices.set(id, {
      light,
      idleMinutes: Math.max(1, Math.min(240, Number(opts.idleMinutes) || 30)),
      lastChange: Date.now(),
      lastSig: this._sig(light),
    });
    this.start();
    return { id, idleMinutes: this._devices.get(id).idleMinutes };
  }

  _sig(light) {
    try {
      return JSON.stringify({
        on: light.hasCapability?.('onoff') ? !!light.getCapabilityValue('onoff') : null,
        dim: light.hasCapability?.('dim') ? Number(light.getCapabilityValue('dim')) : null,
      });
    } catch (_e) {
      return null;
    }
  }

  async _tick() {
    const now = Date.now();
    for (const [, entry] of this._devices) {
      const sig = this._sig(entry.light);
      if (sig && sig !== entry.lastSig) {
        entry.lastSig = sig;
        entry.lastChange = now;
      }
      const on = entry.light.hasCapability?.('onoff')
        ? !!entry.light.getCapabilityValue?.('onoff')
        : true;
      if (!on) continue;
      if (now - entry.lastChange < entry.idleMinutes * 60 * 1000) continue;
      try {
        if (typeof this.app._hueSetLight === 'function') {
          await this.app._hueSetLight(entry.light, { onoff: false });
        } else if (entry.light.hasCapability?.('onoff')) {
          await (entry.light.safeSetCapabilityValue || entry.light.setCapabilityValue)?.('onoff', false);
        }
        entry.lastChange = now;
        entry.lastSig = this._sig(entry.light);
        this.app.log?.(`[IDLE-AUTO-OFF] ${entry.light.getName?.()} after ${entry.idleMinutes}m`);
      } catch (_e) { /* soft */ }
    }
  }

  snapshot() {
    return { devices: this._devices.size, pollMs: this._pollMs };
  }
}

module.exports = IdleAutoOffSoft;
