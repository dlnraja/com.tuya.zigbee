'use strict';

/**
 * MirrorLightSync (P2565) — unbranded master→follower light sync (SmartThings/HA mirror feel).
 * Rate-limited; BootBudget-safe. MASTER_ONLY. UI: Mirror Light Sync.
 */

function clamp01(x) {
  return Math.max(0, Math.min(1, Number(x) || 0));
}

class MirrorLightSync {
  constructor(app, opts = {}) {
    this.app = app;
    this.homey = app?.homey;
    this._pairs = new Map(); // id → { master, followers, lastSig }
    this._pollMs = Math.max(1000, Math.min(15000, Number(opts.pollMs) || 2500));
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
    this._pairs.clear();
  }

  enroll(master, followers = []) {
    if (!master) return null;
    const list = (followers || []).filter((f) => f && f !== master).slice(0, 6);
    if (!list.length) return null;
    const id = String(master.getData?.()?.id || master.getName?.() || 'm').slice(0, 64);
    this._pairs.set(id, { master, followers: list, lastSig: null });
    this.start();
    return { id, followers: list.length };
  }

  _sig(dev) {
    try {
      return JSON.stringify({
        on: dev.hasCapability?.('onoff') ? !!dev.getCapabilityValue('onoff') : null,
        dim: dev.hasCapability?.('dim') ? Number(dev.getCapabilityValue('dim')) : null,
        temp: Number(dev.getCapabilityValue?.('light_temperature')
          ?? dev.getCapabilityValue?.('light_color_temp') ?? null),
        hue: Number(dev.getCapabilityValue?.('light_hue') ?? null),
        sat: Number(dev.getCapabilityValue?.('light_saturation') ?? null),
      });
    } catch (_e) {
      return null;
    }
  }

  async _tick() {
    for (const [, pair] of this._pairs) {
      const sig = this._sig(pair.master);
      if (!sig || sig === pair.lastSig) continue;
      pair.lastSig = sig;
      const state = JSON.parse(sig);
      for (const f of pair.followers) {
        try {
          if (typeof this.app._hueSetLight === 'function') {
            await this.app._hueSetLight(f, {
              onoff: state.on,
              dim: state.dim != null && Number.isFinite(state.dim) ? clamp01(state.dim) : undefined,
              temperature: state.temp != null && Number.isFinite(state.temp) ? clamp01(state.temp) : undefined,
            });
          }
          const set = f.safeSetCapabilityValue?.bind(f) || f.setCapabilityValue?.bind(f);
          if (state.hue != null && Number.isFinite(state.hue) && f.hasCapability?.('light_hue')) {
            await set?.('light_hue', clamp01(state.hue));
          }
          if (state.sat != null && Number.isFinite(state.sat) && f.hasCapability?.('light_saturation')) {
            await set?.('light_saturation', clamp01(state.sat));
          }
        } catch (_e) { /* soft */ }
      }
    }
  }

  snapshot() {
    return { pairs: this._pairs.size, pollMs: this._pollMs };
  }
}

module.exports = MirrorLightSync;
