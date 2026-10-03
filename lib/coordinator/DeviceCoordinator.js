'use strict';
// Spec 003 — one entry point per device for values arriving over several channels
// (native ZCL, Tuya DP, raw frames) and for outgoing commands.
//  - Leading edge passes immediately (no added latency); only identical repeats are dropped.
//  - Same sequence number (ZCL seq / Tuya seq) seen again → duplicate.
//  - Same value on the same key inside the profile window → duplicate (any channel).
//  - Buttons: key includes press type, so single/double/long stay distinct.
//  - Commands: identical payload to the same target inside commandMs → dropped; the
//    matching echo report is marked so flows are not retriggered.
// Profiles: data/coordinator-profiles.json (lazy-loaded once), most specific wins.

let _profiles = null;
function loadProfiles() {
  if (_profiles) return _profiles;
  try { _profiles = require('../../data/coordinator-profiles.json'); } catch (_) { _profiles = { default: {} }; }
  return _profiles;
}

const lc = (s) => String(s || '').toLowerCase();

function resolveProfile({ deviceClass, driverId, mfr, pid } = {}, profiles = loadProfiles()) {
  const base = { dedupeMs: 500, commandMs: 400, multiClick: 'off', multiClickMs: 400, ...(profiles.default || {}) };
  const pick = (table, key) => {
    if (!table || !key) return null;
    const k = Object.keys(table).find((x) => lc(x) === lc(key));
    return k ? table[k] : null;
  };
  return Object.assign(base,
    pick(profiles.deviceClass, deviceClass) || {},
    pick(profiles.driver, driverId) || {},
    pick(profiles.mfrPid, mfr && pid ? `${mfr}|${pid}` : null) || {});
}

function valueKey(v) {
  if (Buffer.isBuffer(v)) return `b:${v.toString('hex')}`;
  if (typeof v === 'number') return `n:${Math.round(v * 1000) / 1000}`;
  try { return `${typeof v}:${JSON.stringify(v)}`; } catch (_) { return String(v); }
}

class DeviceCoordinator {
  constructor(identity = {}, { now = () => Date.now(), profile } = {}) {
    this.profile = profile || resolveProfile(identity);
    this._now = now;
    this._rx = new Map();     // key -> { vk, ts, channel }
    this._seq = new Map();    // channel -> Map(seq -> ts)
    this._tx = new Map();     // target -> { pk, ts }
    this.stats = { passed: 0, dupSeq: 0, dupValue: 0, cmdDropped: 0, echo: 0 };
  }

  /** @returns {{apply:boolean, reason:string, echo?:boolean}} */
  ingest(channel, key, value, meta = {}) {
    const now = this._now();
    const win = Number(meta.windowMs ?? this.profile.dedupeMs) || 0;
    if (meta.seq !== undefined && meta.seq !== null) {
      const ch = this._seq.get(channel) || new Map();
      this._seq.set(channel, ch);
      const seen = ch.get(meta.seq);
      ch.set(meta.seq, now);
      if (ch.size > 64) ch.delete(ch.keys().next().value);
      if (seen !== undefined && now - seen < Math.max(win, 2000)) { this.stats.dupSeq++; return { apply: false, reason: 'seq' }; }
    }
    const k = meta.pressType ? `${key}#${meta.pressType}` : key;
    const vk = valueKey(value);
    const last = this._rx.get(k);
    if (win > 0 && last && last.vk === vk && now - last.ts < win) {
      last.ts = now;
      this.stats.dupValue++;
      return { apply: false, reason: 'value' };
    }
    this._rx.set(k, { vk, ts: now, channel });
    const tx = this._tx.get(key);
    const echo = !!(tx && tx.pk === vk && now - tx.ts < Math.max(this.profile.commandMs, 1500));
    if (echo) this.stats.echo++;
    this.stats.passed++;
    return { apply: true, reason: 'new', echo };
  }

  /** @returns {boolean} true when the command should be sent */
  command(target, payload) {
    const now = this._now();
    const pk = valueKey(payload);
    const last = this._tx.get(target);
    if (this.profile.commandMs > 0 && last && last.pk === pk && now - last.ts < this.profile.commandMs) {
      this.stats.cmdDropped++;
      return false;
    }
    this._tx.set(target, { pk, ts: now });
    return true;
  }
}

module.exports = { DeviceCoordinator, resolveProfile, valueKey };
