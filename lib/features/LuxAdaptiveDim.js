'use strict';

/**
 * LuxAdaptiveDim (P2565) — unbranded lux→brightness follow (Aqara illuminance lighting feel).
 * When room lux is high, dim lights; when dark, raise toward target — soft steps, BootBudget-safe.
 * MASTER_ONLY. UI: Lux Adaptive Dim.
 */

const DaylightAtmosphere = require('./DaylightAtmosphere');

function clamp01(x) {
  return Math.max(0, Math.min(1, Number(x) || 0));
}

/**
 * Map lux → preferred dim.
 * dark (<luxLow) → brightTarget; bright (>luxHigh) → dimFloor
 */
function luxToDim(lux, opts = {}) {
  const low = Math.max(1, Number(opts.luxLow) || 40);
  const high = Math.max(low + 10, Number(opts.luxHigh) || 400);
  const brightTarget = clamp01(opts.brightTarget != null ? opts.brightTarget : 0.85);
  const dimFloor = clamp01(opts.dimFloor != null ? opts.dimFloor : 0.15);
  if (!Number.isFinite(lux)) return null;
  if (lux <= low) return brightTarget;
  if (lux >= high) return dimFloor;
  const t = (lux - low) / (high - low);
  return Math.round((brightTarget + (dimFloor - brightTarget) * t) * 1000) / 1000;
}

class LuxAdaptiveDim {
  constructor(app, opts = {}) {
    this.app = app;
    this.homey = app?.homey;
    this._devices = new Map(); // id → { light, sensor, opts, lastDim }
    this._intervalMs = Math.max(15000, Math.min(300000, Number(opts.intervalMs) || 60000));
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
    this._devices.clear();
  }

  enroll(light, sensor, opts = {}) {
    if (!light) return null;
    const id = String(light.getData?.()?.id || light.getName?.() || Math.random()).slice(0, 64);
    this._devices.set(id, { light, sensor: sensor || null, opts, lastDim: null });
    this.start();
    return { id };
  }

  unenroll(light) {
    const id = String(light?.getData?.()?.id || '');
    return this._devices.delete(id);
  }

  _readLux(entry) {
    const fromSensor = DaylightAtmosphere.luxFromDevice?.(entry.sensor);
    if (typeof fromSensor === 'number') return fromSensor;
    const fromLight = DaylightAtmosphere.luxFromDevice?.(entry.light);
    if (typeof fromLight === 'number') return fromLight;
    const stored = entry.light.getStoreValue?.('room_balance_lux');
    return typeof stored === 'number' ? stored : null;
  }

  async _tick() {
    for (const [, entry] of this._devices) {
      const light = entry.light;
      if (!light || light._destroyed) continue;
      if (light.hasCapability?.('onoff') && light.getCapabilityValue?.('onoff') !== true) continue;
      if (!light.hasCapability?.('dim')) continue;

      const lux = this._readLux(entry);
      const target = luxToDim(lux, entry.opts);
      if (target == null) continue;
      if (entry.lastDim != null && Math.abs(entry.lastDim - target) < 0.04) continue;

      try {
        if (typeof this.app._hueSetLight === 'function') {
          await this.app._hueSetLight(light, { dim: target });
        } else {
          const set = light.safeSetCapabilityValue?.bind(light) || light.setCapabilityValue?.bind(light);
          await set?.('dim', target);
        }
        entry.lastDim = target;
        if (typeof lux === 'number') {
          light.setStoreValue?.('room_balance_lux', lux).catch?.(() => {});
        }
      } catch (_e) { /* soft */ }
    }
  }

  snapshot() {
    return { enrolled: this._devices.size, intervalMs: this._intervalMs };
  }
}

module.exports = LuxAdaptiveDim;
module.exports.luxToDim = luxToDim;
