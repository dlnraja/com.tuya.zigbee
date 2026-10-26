'use strict';

/**
 * AdaptiveLightingEngine — ONE app-level, owned, bounded scheduler that makes
 * every opted-in light follow the sun (P3067, inspiration: iGen 2026-10-26).
 *
 * Safety contract (user t578u — default ON must be harmless):
 *  - Nothing is written at pairing/app start: a light is only "armed" after the
 *    engine has seen it OFF; the first adaptive write happens on the next ON.
 *  - Manual override: any CT/brightness/colour value that differs from our own
 *    last write pauses that light for OVERRIDE_PAUSE_MS (resets on next ON).
 *  - Only lights that are ON are touched; smooth steps; max writes per tick.
 *  - Global kill switch: app setting adaptive_lighting_global === false.
 *  - Writes go through triggerCapabilityListener so the driver's own path
 *    (ZCL, Tuya EF00, Tuya Wi-Fi local) sends the command; no extra hub.
 */

const Curve = require('./AdaptiveLightingCurve');

const TICK_MS = 60 * 1000;
const OVERRIDE_PAUSE_MS = 60 * 60 * 1000;
const MAX_WRITES_PER_TICK = 24;
const MAX_WRITES_PER_LIGHT = 3; // CT|hue+sat, + dim
const MAX_DEVICES = 600;
const CT_STEP = 0.08;
const DIM_STEP = 0.10;
const CT_TOLERANCE = 0.03;
const DIM_TOLERANCE = 0.03;
const GLOBAL_SETTING = 'adaptive_lighting_global';
const MAX_IN_FLIGHT = 2;            // t582u: global concurrency cap
const WRITE_SPACING_MS = 150;       // jitter base between writes of one worker
const TRANSITION_MS = 2000;         // passed as listener opts.duration (used by drivers that support transitions)
const BACKOFF_BASE_MS = 60 * 1000;  // failure backoff 1, 2, 4 … min
const BACKOFF_MAX_MS = 60 * 60 * 1000;

class AdaptiveLightingEngine {
  constructor(homey, {
    solarElevation = null, logger = null, now = () => Date.now(), spacingMs = WRITE_SPACING_MS, random = Math.random,
  } = {}) {
    this._spacingMs = spacingMs;
    this._random = random;
    this._writeCount = 0;
    this._rot = 0;
    this.homey = homey;
    this._solar = solarElevation;
    this._log = typeof logger === 'function' ? logger : () => {};
    this._now = now;
    this._timer = null;
    this._running = false;
    this._destroyed = false;
    this._state = new Map();
  }

  isGloballyEnabled() {
    try { return this.homey?.settings?.get?.(GLOBAL_SETTING) !== false; } catch (_e) { return true; }
  }

  start() {
    if (this._destroyed || this._timer) {return;}
    const h = this.homey;
    if (!h || typeof h.setInterval !== 'function') {return;}
    this._timer = h.setInterval(() => { this.tick().catch((e) => this._log('[ADAPTIVE] tick error:', e.message)); }, TICK_MS);
  }

  stop() {
    if (this._timer && typeof this.homey?.clearInterval === 'function') {this.homey.clearInterval(this._timer);}
    this._timer = null;
  }

  destroy() { this._destroyed = true; this.stop(); this._state.clear(); }

  _devices() {
    const out = [];
    let drivers = {};
    try { drivers = this.homey?.drivers?.getDrivers?.() || {}; } catch (_e) { return out; }
    for (const drv of Object.values(drivers)) {
      let list = [];
      try { list = drv.getDevices?.() || []; } catch (_e) { list = []; }
      for (const d of list) { if (out.length < MAX_DEVICES) {out.push(d);} }
    }
    return out;
  }

  static deviceKey(device) {
    try { const data = device.getData?.() || {}; return String(data.id || data.ieeeAddress || data.token || device.getName?.()); } catch (_e) { return null; }
  }

  static isEligible(device) {
    if (!device || typeof device.getSetting !== 'function' || typeof device.hasCapability !== 'function') {return false;}
    if (device.getSetting('adaptive_lighting') !== true) {return false;}
    if (device.getSetting('adaptive_lighting_enabled') === true) {return false;} // legacy per-device manager owns it
    if (device.adaptiveLighting && device.adaptiveLighting.active === true) {return false;} // per-device manager (P3065 card) running: one writer only
    if (!device.hasCapability('onoff')) {return false;}
    return device.hasCapability('light_temperature') || device.hasCapability('dim')
      || (device.hasCapability('light_hue') && device.hasCapability('light_saturation'));
  }

  computeTargets(date = new Date(this._now())) {
    let elevation = null;
    try {
      if (this._solar && typeof this._solar.getElevation === 'function') {elevation = this._solar.getElevation(date);}
    } catch (_e) { elevation = null; }
    const { factor, source } = Curve.daylightFactor({ date, elevation });
    return { kelvin: Curve.targetKelvin(factor), bright: Curve.targetBrightness(factor), source };
  }

  static rangeFor(device) {
    let profile = null;
    try { profile = typeof device.getAdaptiveCtProfile === 'function' ? device.getAdaptiveCtProfile() : null; } catch (_e) { profile = null; }
    const store = (k) => { try { return device.getStoreValue?.(k); } catch (_e) { return undefined; } };
    const phys = Curve.physicalRange({
      minMired: store('ct_phys_min_mired'), maxMired: store('ct_phys_max_mired'),
      minK: profile?.minK, maxK: profile?.maxK,
    });
    const driverMired = profile?.driverMired || Curve.DEFAULT_DRIVER_MIRED;
    return { phys, driverMired };
  }

  async tick() {
    if (this._running || this._destroyed || !this.isGloballyEnabled()) {return { writes: 0 };}
    this._running = true;
    let writes = 0;
    try {
      const targets = this.computeTargets(); // curve computed ONCE per tick for all lights
      const devices = this._devices();
      const seen = new Set();
      const jobs = [];
      // rotate the start index so a cap never starves the same lights (cheap fairness, no shuffle alloc)
      const n = devices.length;
      const start = n ? this._rot % n : 0;
      this._rot = (this._rot + MAX_WRITES_PER_TICK) % 1000003;
      for (let i = 0; i < n; i++) {
        const device = devices[(start + i) % n];
        if (!AdaptiveLightingEngine.isEligible(device)) {continue;}
        const key = AdaptiveLightingEngine.deviceKey(device);
        if (!key) {continue;}
        seen.add(key);
        if (jobs.length >= MAX_WRITES_PER_TICK) {continue;}
        if (this._needsWork(device, key)) {jobs.push([device, key]);}
      }
      for (const k of this._state.keys()) { if (!seen.has(k)) {this._state.delete(k);} }
      writes = await this._runPool(jobs, targets);
    } finally {
      this._running = false;
    }
    return { writes };
  }

  async _runPool(jobs, targets) {
    let idx = 0;
    let writes = 0;
    let inFlight = 0;
    const worker = async () => {
      // reserve the worst case per light so the per-tick write budget is a hard cap
      while (idx < jobs.length && !this._destroyed
        && writes + ((inFlight + 1) * MAX_WRITES_PER_LIGHT) <= MAX_WRITES_PER_TICK) {
        const [device, key] = jobs[idx++];
        inFlight++;
        let w = 0;
        try { w = await this._processDevice(device, key, targets); } finally { inFlight--; }
        writes += w;
        if (w && this._spacingMs > 0) {await this._sleep(this._spacingMs + Math.floor(this._random() * this._spacingMs));}
      }
    };
    const pool = [];
    for (let i = 0; i < Math.min(MAX_IN_FLIGHT, jobs.length); i++) {pool.push(worker());}
    await Promise.all(pool);
    return writes;
  }

  _sleep(ms) {
    return new Promise((resolve) => {
      if (typeof this.homey?.setTimeout === 'function') {this.homey.setTimeout(resolve, ms);} else {resolve();}
    });
  }

  // Cheap pre-filter: state bookkeeping for OFF lights, skip paused/backed-off ones without a job.
  _needsWork(device, key) {
    let st = this._state.get(key);
    if (!st) { st = { armed: false, lastOn: null, ours: {}, pausedUntil: 0, fails: 0, retryAt: 0, range: null }; this._state.set(key, st); }
    if (device.getCapabilityValue('onoff') !== true) { st.armed = true; st.lastOn = false; return false; }
    if (!st.armed) { st.lastOn = true; return false; }
    if (st.lastOn !== false && this._now() < Math.max(st.pausedUntil, st.retryAt)) {return false;}
    return true;
  }

  async _processDevice(device, key, targets) {
    const st = this._state.get(key);
    if (!st) {return 0;}
    const on = device.getCapabilityValue('onoff') === true;
    if (!on) { st.armed = true; st.lastOn = false; return 0; }
    if (st.lastOn === false) { st.pausedUntil = 0; st.ours = {}; st.range = null; } // new ON cycle
    st.lastOn = true;
    if (!st.armed) {return 0;}
    const now = this._now();
    if (this._detectOverride(device, st)) { st.pausedUntil = now + OVERRIDE_PAUSE_MS; st.ours = {}; return 0; }
    if (now < st.pausedUntil || now < st.retryAt) {return 0;}
    return this._apply(device, st, targets);
  }

  _detectOverride(device, st) {
    const differs = (cap, tol) => {
      if (typeof st.ours[cap] !== 'number' || !device.hasCapability(cap)) {return false;}
      const cur = device.getCapabilityValue(cap);
      return typeof cur === 'number' && Math.abs(cur - st.ours[cap]) > tol;
    };
    return differs('light_temperature', CT_TOLERANCE) || differs('dim', DIM_TOLERANCE)
      || differs('light_hue', CT_TOLERANCE) || differs('light_saturation', CT_TOLERANCE);
  }

  async _write(device, st, cap, value) {
    if (typeof device.triggerCapabilityListener !== 'function') {return 0;}
    try {
      await device.triggerCapabilityListener(cap, value, { duration: TRANSITION_MS });
      st.ours[cap] = value;
      st.fails = 0;
      this._writeCount++;
      return 1;
    } catch (e) {
      st.fails = Math.min(st.fails + 1, 8);
      st.retryAt = this._now() + Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * (2 ** (st.fails - 1)));
      this._log('[ADAPTIVE] write failed', cap, e.message);
      return 0;
    }
  }

  async _apply(device, st, targets) {
    let n = 0;
    const mode = device.hasCapability('light_mode') ? device.getCapabilityValue('light_mode') : null;
    if (device.hasCapability('light_temperature')) {
      if (mode !== 'color') {n += await this._applyCt(device, st, targets);}
    } else if (device.hasCapability('light_hue') && device.hasCapability('light_saturation')) {
      n += await this._applyRgbWhite(device, st, targets);
    }
    if (device.hasCapability('dim') && device.getSetting('adaptive_brightness') === true) {
      n += await this._applyStep(device, st, 'dim', targets.bright, DIM_STEP);
    }
    return n;
  }

  async _applyStep(device, st, cap, goal, maxStep) {
    if (goal === null || goal === undefined) {return 0;}
    const cur = device.getCapabilityValue(cap);
    const next = Curve.stepToward(cur, goal, maxStep);
    if (typeof cur === 'number' && Math.abs(next - cur) < 0.01) {return 0;}
    return this._write(device, st, cap, next);
  }

  async _applyCt(device, st, targets) {
    if (!st.range) {st.range = AdaptiveLightingEngine.rangeFor(device);} // cached per ON cycle
    const { phys, driverMired } = st.range;
    const n = await this._applyStep(device, st, 'light_temperature', Curve.kelvinToHomeyTemperature(targets.kelvin, phys, driverMired), CT_STEP);
    // feeds P3065's 'adaptive colour temperature changed' trigger (its published contract; soft, deduped there)
    if (n) {try { this.homey?.app?.featureFlowCards?.triggerAdaptiveKelvin?.(device, targets.kelvin); } catch (_e) { /* soft */ }}
    return n;
  }

  // RGB-only: approximate the white point; never touches a light showing a real colour (sat > 0.6).
  async _applyRgbWhite(device, st, targets) {
    const curSat = device.getCapabilityValue('light_saturation');
    if (typeof curSat === 'number' && curSat > 0.6) {return 0;}
    const hs = Curve.kelvinToHueSat(targets.kelvin);
    const h = await this._applyStep(device, st, 'light_hue', hs.hue, 1);
    const s = await this._applyStep(device, st, 'light_saturation', hs.saturation, 1);
    return h + s;
  }

  /** Public, for Flow cards: pause one light for N minutes (1..1440); it resumes by itself. */
  pause(device, minutes) {
    const m = Number(minutes);
    if (!Number.isFinite(m) || m <= 0) {return false;}
    const key = AdaptiveLightingEngine.deviceKey(device);
    if (!key) {return false;}
    let st = this._state.get(key);
    if (!st) {
      if (this._state.size >= MAX_DEVICES) {return false;}
      st = { armed: false, lastOn: null, ours: {}, pausedUntil: 0, fails: 0, retryAt: 0, range: null };
      this._state.set(key, st);
    }
    st.pausedUntil = this._now() + Math.min(m, 1440) * 60000;
    st.ours = {};
    return true;
  }

  /** Public, for Flow cards: lift a pause now. */
  resume(device) {
    const st = this._state.get(AdaptiveLightingEngine.deviceKey(device));
    if (st) {st.pausedUntil = 0; st.ours = {};}
    return !!st;
  }

  /** Public, for Flow cards: true when the engine is allowed to adapt this light right now. */
  isActiveFor(device) {
    if (!this.isGloballyEnabled() || !AdaptiveLightingEngine.isEligible(device)) {return false;}
    const st = this._state.get(AdaptiveLightingEngine.deviceKey(device));
    return !st || this._now() >= st.pausedUntil;
  }

  getReport() {
    return {
      global: this.isGloballyEnabled(), tracked: this._state.size, writes: this._writeCount, targets: this.computeTargets(),
    };
  }
}

AdaptiveLightingEngine.GLOBAL_SETTING = GLOBAL_SETTING;
AdaptiveLightingEngine.OVERRIDE_PAUSE_MS = OVERRIDE_PAUSE_MS;
AdaptiveLightingEngine.MAX_WRITES_PER_TICK = MAX_WRITES_PER_TICK;
AdaptiveLightingEngine.MAX_IN_FLIGHT = MAX_IN_FLIGHT;
AdaptiveLightingEngine.MAX_DEVICES = MAX_DEVICES;
module.exports = AdaptiveLightingEngine;
