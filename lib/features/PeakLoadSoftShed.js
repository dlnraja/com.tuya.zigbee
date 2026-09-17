'use strict';

/**
 * PeakLoadSoftShed (P2566) — unbranded peak power → soft dim (energy-hub load shed feel).
 * When a meter device exceeds W threshold, soft-dim enrolled lights. MASTER_ONLY.
 * UI: Peak Load Soft Shed.
 */

function clamp01(x) {
  return Math.max(0, Math.min(1, Number(x) || 0));
}

class PeakLoadSoftShed {
  constructor(app, opts = {}) {
    this.app = app;
    this.homey = app?.homey;
    this._meter = null;
    this._lights = new Set();
    this._thresholdW = Math.max(100, Number(opts.thresholdW) || 2500);
    this._dimTo = clamp01(opts.dimTo != null ? opts.dimTo : 0.35);
    this._restore = opts.restore !== false;
    this._saved = new Map();
    this._shedding = false;
    this._intervalMs = Math.max(5000, Math.min(120000, Number(opts.intervalMs) || 15000));
    this._interval = null;
    this._destroyed = false;
  }

  start() {
    if (this._interval || !this.homey) return;
    this._interval = this.homey.setInterval(() => {
      if (this._destroyed) return;
      this._tick().catch(() => {});
    }, this._intervalMs);
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
    this._lights.clear();
    this._saved.clear();
  }

  enroll(meter, lights = [], opts = {}) {
    this._meter = meter || this._meter;
    if (opts.thresholdW) this._thresholdW = Math.max(100, Number(opts.thresholdW));
    if (opts.dimTo != null) this._dimTo = clamp01(opts.dimTo);
    for (const l of lights || []) {
      if (l) this._lights.add(l);
    }
    this.start();
    return { lights: this._lights.size, thresholdW: this._thresholdW };
  }

  _readPowerW() {
    if (!this._meter) return null;
    try {
      if (this._meter.hasCapability?.('measure_power')) {
        const v = Number(this._meter.getCapabilityValue('measure_power'));
        return Number.isFinite(v) ? v : null;
      }
    } catch (_e) { /* */ }
    return null;
  }

  async _tick() {
    if (!this._lights.size) return;
    const w = this._readPowerW();
    if (w == null) return;

    if (w >= this._thresholdW && !this._shedding) {
      this._shedding = true;
      for (const light of this._lights) {
        try {
          const cur = light.hasCapability?.('dim') ? Number(light.getCapabilityValue('dim')) : null;
          if (Number.isFinite(cur)) this._saved.set(light, cur);
          if (typeof this.app._hueSetLight === 'function') {
            await this.app._hueSetLight(light, { dim: this._dimTo });
          } else if (light.hasCapability?.('dim')) {
            await (light.safeSetCapabilityValue || light.setCapabilityValue)?.('dim', this._dimTo);
          }
        } catch (_e) { /* soft */ }
      }
      this.app.log?.(`[PEAK-SHED] ON power=${w}W ≥ ${this._thresholdW}W`);
    } else if (w < this._thresholdW * 0.85 && this._shedding) {
      this._shedding = false;
      if (this._restore) {
        for (const [light, dim] of this._saved) {
          try {
            if (typeof this.app._hueSetLight === 'function') {
              await this.app._hueSetLight(light, { dim });
            } else if (light.hasCapability?.('dim')) {
              await (light.safeSetCapabilityValue || light.setCapabilityValue)?.('dim', dim);
            }
          } catch (_e) { /* soft */ }
        }
      }
      this._saved.clear();
      this.app.log?.(`[PEAK-SHED] OFF power=${w}W`);
    }
  }

  snapshot() {
    return {
      lights: this._lights.size,
      thresholdW: this._thresholdW,
      shedding: this._shedding,
      dimTo: this._dimTo,
    };
  }
}

module.exports = PeakLoadSoftShed;
