'use strict';

/**
 * SoftAmbientSync (P2564) — branding-free Soft Ambient Sync.
 *
 * Commercial "Entertainment / Screen Sync RGB flood" is BootBudget-forbidden as a
 * continuous high-rate stream. This module is the FULL soft alternative:
 *   - max N lights (default 4)
 *   - min interval between updates (default 2000ms)
 *   - optional soft multi-step color fade (not video capture)
 *   - explicit start/stop; never auto-flood on boot
 *
 * UI name: Soft Ambient Sync. MASTER_ONLY.
 */

function clamp01(x) {
  return Math.max(0, Math.min(1, Number(x) || 0));
}

const DEFAULTS = {
  maxLights: 4,
  minIntervalMs: 2000,
  maxSteps: 8,
  stepMs: 250,
};

class SoftAmbientSync {
  constructor(app, opts = {}) {
    this.app = app;
    this.homey = app?.homey;
    this._maxLights = Math.max(1, Math.min(8, Number(opts.maxLights) || DEFAULTS.maxLights));
    this._minIntervalMs = Math.max(1000, Math.min(15000, Number(opts.minIntervalMs) || DEFAULTS.minIntervalMs));
    this._lastAt = 0;
    this._active = new Set(); // device ids with running fade
    this._timers = new Map();
    this._destroyed = false;
  }

  static get defaults() { return { ...DEFAULTS }; }

  /** Rate-limit gate — Contre quoi: flood prevention */
  canUpdate(now = Date.now()) {
    return now - this._lastAt >= this._minIntervalMs;
  }

  stopAll() {
    for (const [, t] of this._timers) {
      try { this.homey?.clearInterval?.(t); } catch (_e) { /* */ }
    }
    this._timers.clear();
    this._active.clear();
  }

  destroy() {
    this._destroyed = true;
    this.stopAll();
  }

  stopDevice(light) {
    const id = this._id(light);
    const t = this._timers.get(id);
    if (t) {
      try { this.homey?.clearInterval?.(t); } catch (_e) { /* */ }
      this._timers.delete(id);
    }
    this._active.delete(id);
  }

  _id(light) {
    try {
      return String(light?.getData?.()?.id || light?.getId?.() || light?.id || '?');
    } catch (_e) {
      return '?';
    }
  }

  async _setColor(light, { hue, saturation, dim, onoff }) {
    const set = light.safeSetCapabilityValue?.bind(light) || light.setCapabilityValue?.bind(light);
    if (!set) return;
    if (onoff != null && light.hasCapability?.('onoff')) await set('onoff', !!onoff).catch(() => {});
    if (dim != null && light.hasCapability?.('dim')) await set('dim', clamp01(dim)).catch(() => {});
    if (hue != null && light.hasCapability?.('light_hue')) await set('light_hue', clamp01(hue)).catch(() => {});
    if (saturation != null && light.hasCapability?.('light_saturation')) {
      await set('light_saturation', clamp01(saturation)).catch(() => {});
    }
  }

  /**
   * Apply ambient color to up to maxLights — soft steps, rate-limited.
   * @returns {{ applied: number, skipped: string|null, planSteps: number }}
   */
  apply(lights = [], color = {}, opts = {}) {
    if (this._destroyed || !this.homey) {
      return { applied: 0, skipped: 'destroyed', planSteps: 0 };
    }
    const now = Date.now();
    if (!opts.force && !this.canUpdate(now)) {
      return { applied: 0, skipped: 'rate_limit', planSteps: 0 };
    }

    const list = (lights || []).filter(Boolean).slice(0, this._maxLights);
    if (!list.length) return { applied: 0, skipped: 'no_lights', planSteps: 0 };

    const target = {
      hue: clamp01(color.hue != null ? color.hue : 0.08),
      saturation: clamp01(color.saturation != null ? color.saturation : 0.55),
      dim: clamp01(color.dim != null ? color.dim : 0.45),
      onoff: color.onoff !== false,
    };

    const steps = Math.max(2, Math.min(DEFAULTS.maxSteps, Number(opts.steps) || 6));
    const stepMs = Math.max(150, Math.min(1000, Number(opts.stepMs) || DEFAULTS.stepMs));
    this._lastAt = now;

    let applied = 0;
    for (const light of list) {
      this.stopDevice(light);
      const id = this._id(light);
      const from = {
        hue: clamp01(light.getCapabilityValue?.('light_hue') ?? target.hue),
        saturation: clamp01(light.getCapabilityValue?.('light_saturation') ?? target.saturation),
        dim: clamp01(light.getCapabilityValue?.('dim') ?? target.dim),
      };

      let i = 0;
      const timer = this.homey.setInterval(async () => {
        if (this._destroyed || light._destroyed) {
          this.stopDevice(light);
          return;
        }
        i += 1;
        const t = i / steps;
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const step = {
          hue: from.hue + (target.hue - from.hue) * ease,
          saturation: from.saturation + (target.saturation - from.saturation) * ease,
          dim: from.dim + (target.dim - from.dim) * ease,
          onoff: true,
        };
        try { await this._setColor(light, step); } catch (_e) { /* soft */ }
        if (i >= steps) this.stopDevice(light);
      }, stepMs);

      this._timers.set(id, timer);
      this._active.add(id);
      // kick
      this._setColor(light, {
        hue: from.hue + (target.hue - from.hue) * 0.15,
        saturation: from.saturation + (target.saturation - from.saturation) * 0.15,
        dim: from.dim + (target.dim - from.dim) * 0.15,
        onoff: true,
      }).catch(() => {});
      applied += 1;
    }

    return { applied, skipped: null, planSteps: steps };
  }

  snapshot() {
    return {
      active: this._active.size,
      minIntervalMs: this._minIntervalMs,
      maxLights: this._maxLights,
      lastAt: this._lastAt,
    };
  }
}

module.exports = SoftAmbientSync;
