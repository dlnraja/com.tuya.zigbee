'use strict';
/**
 * P3101 (t656u / #560): optional firmware-limit compensation, data-driven per exact mfr+pid
 * (config/firmware-limits.json). Additive only:
 *  - nothing at pairing (attach() is called after init, never adds/removes capabilities);
 *  - a real value always wins: markReal(cap) disables the estimate for that capability for good;
 *  - estimates are flagged (store fwlimit_<cap>_estimate + origin 'estimated'), never shown as measured;
 *  - polling is bounded (min interval, max polls/day, max DPs per poll), unref'd timer, cleared on destroy.
 * Power/energy estimation is NOT duplicated here: DeviceTelemetryEstimator / VirtualEnergyEstimator own it.
 * Battery: project rules forbid alarm_battery + measure_battery together and inventing a % without a
 * real signal, so an alarm-derived % is kept in store (diagnostics/flows), the UI keeps alarm_battery.
 */
const CONFIG = require('../../config/firmware-limits.json');
const HOUR_MS = 3600 * 1000;
const DAY_MS = 24 * HOUR_MS;

let _index = null;
function _key(mfr, pid) { return `${String(mfr || '').trim().toLowerCase()}|${String(pid || '').trim().toUpperCase()}`; }
function lookup(mfr, pid, config = CONFIG) {
  if (!mfr || !pid) {return null;}
  if (config === CONFIG) {
    if (!_index) {_index = new Map((CONFIG.couples || []).map((c) => [_key(c.mfr, c.pid), c]));}
    return _index.get(_key(mfr, pid)) || null;
  }
  return (config.couples || []).find((c) => _key(c.mfr, c.pid) === _key(mfr, pid)) || null;
}

function _identity(device) {
  const get = (k) => { try { return device.getSetting?.(k) || device.getStoreValue?.(k) || null; } catch (_e) { return null; } };
  let data = {};
  try { data = device.getData?.() || {}; } catch (_e) { data = {}; }
  const mfr = get('zb_manufacturer_name') || get('manufacturerName') || data.manufacturerName || null;
  const pid = get('zb_model_id') || get('zb_product_id') || get('modelId') || data.productId || null;
  return { mfr, pid };
}

class FirmwareLimitCompensation {
  constructor(device, entry, config = CONFIG) {
    this.device = device;
    this.entry = entry;
    this.bounds = { minPollMin: 60, maxPollsPerDay: 12, maxDpsPerPoll: 4, ...config.bounds || {} };
    this.timer = null;
    this._polls = [];
  }

  static lookup(mfr, pid, config) { return lookup(mfr, pid, config); }

  static attach(device, opts = {}) {
    try {
      if (!device) {return null;}
      if (device.__fwLimit) {return device.__fwLimit;}
      const id = opts.mfr ? { mfr: opts.mfr, pid: opts.pid } : _identity(device);
      const entry = lookup(id.mfr, id.pid, opts.config || CONFIG);
      if (!entry) {return null;}
      const c = new FirmwareLimitCompensation(device, entry, opts.config || CONFIG);
      device.__fwLimit = c;
      c._startPolling();
      return c;
    } catch (_e) { return null; }
  }

  _store(k, v) { try { return this.device.setStoreValue?.(k, v)?.catch?.(() => {}); } catch (_e) { return undefined; } }
  _get(k) { try { return this.device.getStoreValue?.(k); } catch (_e) { return undefined; } }
  _log(...a) { try { this.device.log?.('[FWLIMIT]', ...a); } catch (_e) { /* soft */ } }

  isRealSeen(cap) { return this._get(`fwlimit_${cap}_real`) === true; }

  /** A real report arrived: the estimate for this capability is disabled for good. */
  markReal(cap) {
    if (this.isRealSeen(cap)) {return false;}
    this._store(`fwlimit_${cap}_real`, true);
    this._store(`fwlimit_${cap}_estimate`, null);
    this._log(`real ${cap} seen -> estimate disabled`);
    return true;
  }

  /** alarm_battery (real) -> flagged % estimate kept in store; null when no honest estimate exists. */
  onAlarmBattery(low) {
    const b = this.entry.compensation && this.entry.compensation.battery;
    if (!b || b.mode !== 'alarm_estimate' || this.isRealSeen('measure_battery')) {return null;}
    const pct = low === true ? b.lowPercent : low === false ? b.okPercent : null;
    const est = Number.isFinite(pct) ? { percent: pct, origin: 'estimated', reason: `alarm_battery:${low}`, at: Date.now() } : null;
    this._store('fwlimit_measure_battery_estimate', est);
    return est;
  }

  handleDp(dpId) {
    const b = this.entry.compensation && this.entry.compensation.battery;
    if (b && Array.isArray(b.realDps) && b.realDps.includes(Number(dpId))) {this.markReal('measure_battery');}
  }

  pollPlan() {
    const p = this.entry.compensation && this.entry.compensation.poll;
    if (!p || !Array.isArray(p.dps) || !p.dps.length) {return null;}
    const intervalMin = Math.max(this.bounds.minPollMin, Number(p.intervalMin) || 0, Math.ceil(1440 / this.bounds.maxPollsPerDay));
    return { dps: p.dps.slice(0, this.bounds.maxDpsPerPoll).map(Number), intervalMs: intervalMin * 60 * 1000 };
  }

  /** Bounded: refuses when the 24 h budget is spent. */
  async pollOnce(now = Date.now()) {
    const plan = this.pollPlan();
    if (!plan || this.device._destroyed) {return false;}
    this._polls = this._polls.filter((t) => now - t < DAY_MS);
    if (this._polls.length >= this.bounds.maxPollsPerDay) {return false;}
    this._polls.push(now);
    try {
      const { tuyaDataQuery } = require('../tuya/TuyaDataQuery');
      await tuyaDataQuery(this.device, plan.dps, { logPrefix: '[FWLIMIT-POLL]' });
      return true;
    } catch (_e) { return false; }
  }

  _startPolling() {
    const plan = this.pollPlan();
    if (!plan) {return;}
    const h = this.device.homey;
    const si = h && typeof h.setInterval === 'function' ? h.setInterval.bind(h) : setInterval;
    this.timer = si(() => { this.pollOnce().catch(() => {}); }, plan.intervalMs);
    if (this.timer && typeof this.timer.unref === 'function') {this.timer.unref();}
  }

  destroy() {
    if (this.timer) {
      const h = this.device.homey;
      const ci = h && typeof h.clearInterval === 'function' ? h.clearInterval.bind(h) : clearInterval;
      ci(this.timer);
      this.timer = null;
    }
    if (this.device && this.device.__fwLimit === this) {this.device.__fwLimit = null;}
  }
}

module.exports = FirmwareLimitCompensation;
module.exports.lookup = lookup;
