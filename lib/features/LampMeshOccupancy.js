'use strict';

/**
 * LampMeshOccupancy (P2563/P2564) — full Homey-feasible lamp-as-sensor occupancy.
 *
 * Commercial hubs use closed Zigbee PHY. Homey cannot claim that parity.
 * This module implements the strongest soft stack available on Homey Pro:
 *   1. Per-light RSSI/LQI baseline + disturbance (history)
 *   2. Cross-light mesh variance
 *   3. Activity proxies (onoff/dim/lastSeen)
 *   4. Optional PIR / occupancy sensors
 *   5. Optional AdvancedPresenceEngine fusion hint
 *
 * Branding-free UI: "Lamp Mesh Occupancy". Feasibility = full_soft (Homey max).
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

function deviceIdOf(dev) {
  try {
    return String(dev?.getData?.()?.id || dev?.getId?.() || dev?.id || Math.random());
  } catch (_e) {
    return String(Math.random());
  }
}

class LampMeshOccupancy extends EventEmitter {
  constructor(app, opts = {}) {
    super();
    this.app = app;
    this.homey = app?.homey;
    this._zones = new Map();
    this._pollMs = clamp(Number(opts.pollMs) || 5000, 2000, 60000);
    this._threshold = clamp(Number(opts.threshold) || 0.38, 0.12, 0.9);
    this._clear = clamp(Number(opts.clearThreshold) || 0.16, 0.05, 0.5);
    this._minLights = Math.max(1, Number(opts.minLights) || 2);
    this._historyLen = Math.max(4, Math.min(24, Number(opts.historyLen) || 10));
    this._presenceEngine = opts.presenceEngine || null;
    this._interval = null;
    this._destroyed = false;
  }

  attachPresenceEngine(engine) {
    this._presenceEngine = engine || null;
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
   * @param {string} zoneId
   * @param {Array<object>} lights
   * @param {object} [extra]
   * @param {Array<object>} [extra.sensors]
   */
  enrollZone(zoneId, lights = [], extra = {}) {
    const id = String(zoneId || 'default').slice(0, 64);
    const prev = this._zones.get(id);
    const lightSet = new Set((lights || []).filter(Boolean));
    // WHY(P2568): prev.sensors is a Set — never call .filter on it
    const prevSensors = prev?.sensors
      ? (prev.sensors instanceof Set ? [...prev.sensors] : [].concat(prev.sensors))
      : [];
    const extraSensors = Array.isArray(extra.sensors) ? extra.sensors : [];
    const sensorSet = new Set([...extraSensors, ...prevSensors].filter(Boolean));
    this._zones.set(id, {
      lights: lightSet,
      sensors: sensorSet,
      occupied: prev?.occupied || false,
      scoreEma: prev?.scoreEma || 0,
      samples: prev?.samples || 0,
      lastAt: 0,
      history: prev?.history || new Map(), // deviceId → { rssi:[], lqi:[], baselineRssi, lastActivity }
    });
    this.start();
    return { zoneId: id, lightCount: lightSet.size, sensorCount: sensorSet.size };
  }

  enrollSensors(zoneId, sensors = []) {
    const id = String(zoneId || 'default').slice(0, 64);
    const z = this._zones.get(id);
    if (!z) {
      return this.enrollZone(id, [], { sensors });
    }
    for (const s of sensors || []) {
      if (s) z.sensors.add(s);
    }
    this.start();
    return { zoneId: id, sensorCount: z.sensors.size };
  }

  unenrollZone(zoneId) {
    this._zones.delete(String(zoneId || 'default'));
  }

  isOccupied(zoneId) {
    const z = this._zones.get(String(zoneId || 'default'));
    return !!(z && z.occupied);
  }

  getScore(zoneId) {
    const z = this._zones.get(String(zoneId || 'default'));
    return z ? z.scoreEma : 0;
  }

  /**
   * Auto-enroll mains lights (onoff+dim, class light) — Homey fleet scan.
   */
  autoEnrollMainsLights(zoneId, opts = {}) {
    const max = Math.max(2, Math.min(12, Number(opts.max) || 6));
    const lights = [];
    try {
      const drivers = Object.values(this.homey?.drivers?.getDrivers?.() || {});
      for (const driver of drivers) {
        for (const device of driver.getDevices?.() || []) {
          const isLight = device.getClass?.() === 'light'
            || (device.hasCapability?.('onoff') && device.hasCapability?.('dim'));
          if (!isLight) continue;
          // Prefer mains: skip measure_battery phantoms when possible
          if (device.hasCapability?.('measure_battery') && !device.hasCapability?.('meter_power')) continue;
          lights.push(device);
          if (lights.length >= max) break;
        }
        if (lights.length >= max) break;
      }
    } catch (_e) { /* soft */ }
    return this.enrollZone(zoneId, lights, opts);
  }

  async _sampleDevice(dev, zone) {
    const id = deviceIdOf(dev);
    let hist = zone.history.get(id);
    if (!hist) {
      hist = {
        rssi: [],
        lqi: [],
        baselineRssi: null,
        baselineLqi: null,
        lastOnoff: null,
        lastDim: null,
        lastActivityAt: 0,
      };
      zone.history.set(id, hist);
    }

    const rssi = await this._readRssi(dev);
    const lqi = await this._readLqi(dev);
    if (Number.isFinite(rssi)) {
      hist.rssi.push(rssi);
      if (hist.rssi.length > this._historyLen) hist.rssi.shift();
      if (hist.baselineRssi == null && hist.rssi.length >= 3) {
        hist.baselineRssi = hist.rssi.reduce((a, b) => a + b, 0) / hist.rssi.length;
      }
    }
    if (Number.isFinite(lqi)) {
      hist.lqi.push(lqi);
      if (hist.lqi.length > this._historyLen) hist.lqi.shift();
      if (hist.baselineLqi == null && hist.lqi.length >= 3) {
        hist.baselineLqi = hist.lqi.reduce((a, b) => a + b, 0) / hist.lqi.length;
      }
    }

    let motion = null;
    try {
      if (dev.hasCapability?.('alarm_motion')) motion = !!dev.getCapabilityValue('alarm_motion');
      else if (dev.hasCapability?.('alarm_generic')) motion = !!dev.getCapabilityValue('alarm_generic');
    } catch (_e) { /* */ }

    let activity = 0;
    try {
      const onoff = dev.hasCapability?.('onoff') ? !!dev.getCapabilityValue('onoff') : null;
      const dim = dev.hasCapability?.('dim') ? Number(dev.getCapabilityValue('dim')) : null;
      if (hist.lastOnoff != null && onoff != null && hist.lastOnoff !== onoff) {
        hist.lastActivityAt = Date.now();
        activity = 0.45;
      }
      if (hist.lastDim != null && Number.isFinite(dim) && Math.abs(dim - hist.lastDim) > 0.08) {
        hist.lastActivityAt = Date.now();
        activity = Math.max(activity, 0.35);
      }
      if (hist.lastOnoff == null && onoff != null) hist.lastOnoff = onoff;
      else if (onoff != null) hist.lastOnoff = onoff;
      if (hist.lastDim == null && Number.isFinite(dim)) hist.lastDim = dim;
      else if (Number.isFinite(dim)) hist.lastDim = dim;
      if (hist.lastActivityAt && Date.now() - hist.lastActivityAt < 45000) {
        activity = Math.max(activity, 0.25);
      }
    } catch (_e) { /* */ }

    // Per-device disturbance vs own baseline
    let disturb = 0;
    if (hist.baselineRssi != null && Number.isFinite(rssi)) {
      disturb = Math.max(disturb, clamp(Math.abs(rssi - hist.baselineRssi) / 10, 0, 1));
    }
    if (hist.baselineLqi != null && Number.isFinite(lqi)) {
      disturb = Math.max(disturb, clamp(Math.abs(lqi - hist.baselineLqi) / 40, 0, 1));
    }

    if (this._presenceEngine && Number.isFinite(rssi)) {
      try { this._presenceEngine.ingestRssi?.(id, rssi); } catch (_e) { /* */ }
    }
    if (this._presenceEngine && Number.isFinite(lqi)) {
      try { this._presenceEngine.ingestLqi?.(id, lqi); } catch (_e) { /* */ }
    }

    return { id, rssi, lqi, motion, activity, disturb, name: dev.getName?.() || '?' };
  }

  async _readRssi(dev) {
    const stored = Number(dev.getStoreValue?.('zb_rssi') ?? dev.getStoreValue?.('rssi'));
    if (Number.isFinite(stored)) return stored;
    const settings = Number(dev.getSetting?.('zb_rssi'));
    if (Number.isFinite(settings)) return settings;
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
    return Math.sqrt(nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length);
  }

  /**
   * Pure fusion — Contre quoi unit-tested.
   */
  static fuseScores(parts = {}) {
    const radio = clamp(Number(parts.radio) || 0, 0, 1);
    const disturb = clamp(Number(parts.disturb) || 0, 0, 1);
    const activity = clamp(Number(parts.activity) || 0, 0, 1);
    const motion = clamp(Number(parts.motion) || 0, 0, 1);
    const presence = clamp(Number(parts.presence) || 0, 0, 1);
    // Weighted soft stack (sums ~1.0)
    return clamp(
      radio * 0.28
      + disturb * 0.28
      + activity * 0.14
      + motion * 0.22
      + presence * 0.08,
      0,
      1,
    );
  }

  async _tick() {
    for (const [zoneId, zone] of this._zones) {
      const samples = [];
      for (const light of zone.lights) {
        try { samples.push(await this._sampleDevice(light, zone)); } catch (_e) { /* */ }
      }
      for (const sensor of zone.sensors) {
        try { samples.push(await this._sampleDevice(sensor, zone)); } catch (_e) { /* */ }
      }

      const motionHit = samples.some((s) => s.motion === true);
      if (samples.length < this._minLights && !motionHit) continue;

      const rssiVar = this._variance(samples.map((s) => s.rssi));
      const lqiVar = this._variance(samples.map((s) => s.lqi));
      const radio = clamp((rssiVar / 8) * 0.55 + (lqiVar / 20) * 0.45, 0, 1);
      const disturb = clamp(
        samples.reduce((a, s) => a + (s.disturb || 0), 0) / Math.max(1, samples.length),
        0,
        1,
      );
      const activity = clamp(
        Math.max(0, ...samples.map((s) => s.activity || 0)),
        0,
        1,
      );
      const motion = motionHit ? 1 : 0;

      let presence = 0;
      if (this._presenceEngine) {
        try {
          presence = this._presenceEngine.isPresent
            ? clamp((Number(this._presenceEngine.confidence) || 0) / 100, 0, 1)
            : 0;
        } catch (_e) { /* */ }
      }

      const raw = LampMeshOccupancy.fuseScores({ radio, disturb, activity, motion, presence });
      zone.samples += 1;
      zone.scoreEma = ema(zone.scoreEma, raw, zone.samples < 5 ? 0.4 : 0.22);
      zone.lastAt = Date.now();

      const prev = zone.occupied;
      if (!zone.occupied && zone.scoreEma >= this._threshold) zone.occupied = true;
      else if (zone.occupied && zone.scoreEma <= this._clear) zone.occupied = false;

      if (prev !== zone.occupied) {
        this.emit('occupancy', {
          zoneId,
          occupied: zone.occupied,
          score: Math.round(zone.scoreEma * 1000) / 1000,
          lights: zone.lights.size,
          sensors: zone.sensors.size,
          source: motionHit ? 'hybrid' : (presence > 0.3 ? 'presence_fusion' : 'mesh_full'),
        });
      }
    }
  }

  snapshot() {
    const zones = {};
    for (const [id, z] of this._zones) {
      zones[id] = {
        lightCount: z.lights.size,
        sensorCount: z.sensors.size,
        occupied: z.occupied,
        scoreEma: z.scoreEma,
        samples: z.samples,
      };
    }
    return { zones, threshold: this._threshold, clear: this._clear, pollMs: this._pollMs };
  }
}

module.exports = LampMeshOccupancy;
