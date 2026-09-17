'use strict';

/**
 * LampMeshOccupancy (P2563) — Homey-feasible alternative to proprietary lamp RF sensing.
 *
 * Commercial hubs may use dedicated Zigbee PHY firmware (closed). Homey Pro exposes
 * coarse link quality / last-seen / capability events. This module fuses:
 *   - RSSI/LQI variance across enrolled mains lights (mesh disturbance proxy)
 *   - optional alarm_motion / occupancy from real sensors
 *   - habit EMA (LocalWorkflowLearner-style) for false-positive dampening
 *
 * Branding-free UI name: "Lamp Mesh Occupancy". Never claim vendor parity.
 * MASTER_ONLY.
 */

const EventEmitter = require('events');

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function ema(prev, next, a = 0.25) {
  if (!Number.isFinite(next)) return prev;
  if (!Number.isFinite(prev)) return next;
  return prev * (1 - a) + next * a;
}

class LampMeshOccupancy extends EventEmitter {
  /**
   * @param {object} app Homey App instance
   * @param {object} [opts]
   */
  constructor(app, opts = {}) {
    super();
    this.app = app;
    this.homey = app?.homey;
    this._zones = new Map(); // zoneId → { lights: Set, state, scoreEma, timer }
    this._pollMs = clamp(Number(opts.pollMs) || 8000, 3000, 60000);
    this._threshold = clamp(Number(opts.threshold) || 0.42, 0.15, 0.9);
    this._clear = clamp(Number(opts.clearThreshold) || 0.18, 0.05, 0.5);
    this._minLights = Math.max(1, Number(opts.minLights) || 2);
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
    this._zones.clear();
  }

  /**
   * Enroll lights into a mesh zone (best-effort occupancy).
   * @param {string} zoneId
   * @param {Array<object>} lights Homey devices
   */
  enrollZone(zoneId, lights = []) {
    const id = String(zoneId || 'default').slice(0, 64);
    const set = new Set((lights || []).filter(Boolean));
    this._zones.set(id, {
      lights: set,
      occupied: false,
      scoreEma: 0,
      samples: 0,
      lastAt: 0,
    });
    this.start();
    return { zoneId: id, lightCount: set.size };
  }

  unenrollZone(zoneId) {
    this._zones.delete(String(zoneId || 'default'));
  }

  async _sampleDevice(dev) {
    let rssi = null;
    let lqi = null;
    try {
      rssi = await this._readRssi(dev);
    } catch (_e) { /* */ }
    try {
      lqi = await this._readLqi(dev);
    } catch (_e) { /* */ }

    let motion = null;
    try {
      if (dev.hasCapability?.('alarm_motion')) {
        motion = !!dev.getCapabilityValue('alarm_motion');
      }
    } catch (_e) { /* */ }

    return { rssi, lqi, motion, name: dev.getName?.() || '?' };
  }

  async _readRssi(dev) {
    // Prefer store / health mixin values Homey already collected
    const stored = Number(dev.getStoreValue?.('zb_rssi') ?? dev.getStoreValue?.('rssi'));
    if (Number.isFinite(stored)) return stored;
    const settings = Number(dev.getSetting?.('zb_rssi'));
    if (Number.isFinite(settings)) return settings;
    // Soft: zigbee node if exposed
    const node = dev.zclNode || dev.node;
    const r = node?.rssi ?? node?.lastRssi;
    return Number.isFinite(Number(r)) ? Number(r) : null;
  }

  async _readLqi(dev) {
    const stored = Number(dev.getStoreValue?.('zb_lqi') ?? dev.getStoreValue?.('lqi'));
    if (Number.isFinite(stored)) return stored;
    const node = dev.zclNode || dev.node;
    const l = node?.lqi ?? node?.linkQuality;
    return Number.isFinite(Number(l)) ? Number(l) : null;
  }

  _variance(values) {
    const nums = values.filter((v) => Number.isFinite(v));
    if (nums.length < 2) return 0;
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    const v = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
    return Math.sqrt(v);
  }

  async _tick() {
    for (const [zoneId, zone] of this._zones) {
      const samples = [];
      for (const light of zone.lights) {
        try {
          samples.push(await this._sampleDevice(light));
        } catch (_e) { /* */ }
      }
      if (samples.length < this._minLights && !samples.some((s) => s.motion === true)) {
        continue;
      }

      const rssiVar = this._variance(samples.map((s) => s.rssi));
      const lqiVar = this._variance(samples.map((s) => s.lqi));
      // Normalize: typical RSSI jitter 2–8 dB when people move near mesh
      const radioScore = clamp((rssiVar / 8) * 0.55 + (lqiVar / 20) * 0.45, 0, 1);
      const motionBoost = samples.some((s) => s.motion === true) ? 0.55 : 0;
      const raw = clamp(radioScore + motionBoost, 0, 1);

      zone.samples += 1;
      zone.scoreEma = ema(zone.scoreEma, raw, zone.samples < 5 ? 0.35 : 0.2);
      zone.lastAt = Date.now();

      const prev = zone.occupied;
      if (!zone.occupied && zone.scoreEma >= this._threshold) {
        zone.occupied = true;
      } else if (zone.occupied && zone.scoreEma <= this._clear) {
        zone.occupied = false;
      }

      if (prev !== zone.occupied) {
        this.emit('occupancy', {
          zoneId,
          occupied: zone.occupied,
          score: Math.round(zone.scoreEma * 1000) / 1000,
          lights: samples.length,
          source: motionBoost > 0 ? 'hybrid' : 'mesh_soft',
        });
      }
    }
  }

  snapshot() {
    const zones = {};
    for (const [id, z] of this._zones) {
      zones[id] = {
        lightCount: z.lights.size,
        occupied: z.occupied,
        scoreEma: z.scoreEma,
        samples: z.samples,
      };
    }
    return { zones, threshold: this._threshold };
  }
}

module.exports = LampMeshOccupancy;
