'use strict';

/**
 * P3023: app-level knowledge shared by every device of the same exact couple (mfr|pid).
 *
 * Two devices with the same manufacturerName + modelId behave the same: what one learned
 * (which MethodChain step wins for a domain, which action an unknown pattern really is) is a
 * strong PRIOR for the other — but never an override: each device keeps its own store and its
 * own learning wins (per-device override). Only exact couples are keyed; nothing is invented.
 *
 * Memory: BoundedMap of ≤ MAX_COUPLES couples (LRU), per couple ≤ MAX_CHAIN winners and
 * ≤ MAX_PATTERNS patterns, compact fields. Persisted in app settings (versioned, ≤ MAX_BYTES,
 * debounced, flushed on app uninit). Never throws.
 */

const { BoundedMap } = require('../memory/BoundedMap');

const SETTINGS_KEY = 'p3023_couple_knowledge';
const VERSION = 1;
const MAX_COUPLES = 128;
const MAX_CHAIN = 16;
const MAX_PATTERNS = 24;
const MAX_BYTES = 48 * 1024;
const SAVE_DEBOUNCE_MS = 30 * 1000;

function coupleKey(mfr, pid) {
  const m = String(mfr || '').trim().toLowerCase();
  const p = String(pid || '').trim().toUpperCase();
  if (!m || !p) { return null; }
  return `${m}|${p}`.slice(0, 80);
}

function coupleOf(device) {
  try {
    const s = (k) => { try { return (typeof device.getSetting === 'function' && device.getSetting(k)) || ''; } catch (_e) { return ''; } };
    let mfr = s('zb_manufacturer_name');
    let pid = s('zb_model_id') || s('zb_product_id');
    if ((!mfr || !pid) && typeof device.getStoreValue === 'function') {
      mfr = mfr || device.getStoreValue('manufacturerName') || '';
      pid = pid || device.getStoreValue('modelId') || '';
    }
    return coupleKey(mfr, pid);
  } catch (_e) { return null; }
}

function _cap(obj, max) {
  const keys = Object.keys(obj);
  if (keys.length <= max) { return; }
  keys.sort((a, b) => (obj[a].t || 0) - (obj[b].t || 0)).slice(0, keys.length - max).forEach((k) => { delete obj[k]; });
}

class CoupleKnowledge {
  constructor(opts = {}) {
    this._m = new BoundedMap({ max: opts.maxCouples || MAX_COUPLES });
    this._homey = null;
    this._timer = null;
    this._loaded = false;
    this._dirty = false;
    this._now = typeof opts.now === 'function' ? opts.now : Date.now;
  }

  attach(homey) { if (homey && !this._homey) { this._homey = homey; } return this; }

  _load() {
    if (this._loaded) { return; }
    this._loaded = true;
    try {
      const raw = this._homey && this._homey.settings && this._homey.settings.get(SETTINGS_KEY);
      if (!raw || raw.v !== VERSION || !raw.c || typeof raw.c !== 'object') { return; }
      const entries = Object.entries(raw.c).sort((a, b) => ((a[1] && a[1].t) || 0) - ((b[1] && b[1].t) || 0));
      for (const [k, e] of entries) {
        if (!e || typeof e !== 'object') { continue; }
        this._m.set(k, { t: e.t || 0, c: e.c && typeof e.c === 'object' ? e.c : {}, l: e.l && typeof e.l === 'object' ? e.l : {} });
      }
    } catch (_e) { /* fresh */ }
  }

  _entry(key, create) {
    if (!key) { return null; }
    this._load();
    let e = this._m.get(key);
    if (!e && create) { e = { t: this._now(), c: {}, l: {} }; this._m.set(key, e); }
    return e || null;
  }

  /** MethodChain winner for (couple, domain) or null. */
  chainWinner(key, domain) {
    const e = this._entry(key, false);
    const w = e && e.c[domain];
    return w ? w.w : null;
  }

  noteChainWinner(key, domain, step) {
    const e = this._entry(key, true);
    if (!e || !domain || !step) { return; }
    const now = this._now();
    const prev = e.c[domain];
    if (prev && prev.w === step) { prev.n = Math.min(255, (prev.n || 0) + 1); prev.t = now; } else { e.c[String(domain).slice(0, 60)] = { w: String(step).slice(0, 30), n: 1, t: now }; }
    _cap(e.c, MAX_CHAIN);
    e.t = now;
    this._touch();
  }

  /** Learned pattern consensus {a, b, p, q} or null. */
  pattern(key, pat) {
    const e = this._entry(key, false);
    return (e && e.l[pat]) || null;
  }

  /** A device confirmed (agree=true) or contradicted an action for a pattern. */
  notePattern(key, pat, action, button, agree = true) {
    const e = this._entry(key, true);
    if (!e || !pat || !action) { return; }
    const now = this._now();
    const k = String(pat).slice(0, 60);
    let r = e.l[k];
    if (!r || (r.a !== action && agree && (r.p || 0) <= (r.q || 0))) {
      r = { a: String(action).slice(0, 30), b: button == null ? null : Number(button), p: 0, q: 0, t: now };
      e.l[k] = r;
    }
    if (r.a === action ? agree : !agree) { r.p = Math.min(1000, (r.p || 0) + 1); } else { r.q = Math.min(1000, (r.q || 0) + 1); }
    r.t = now;
    _cap(e.l, MAX_PATTERNS);
    e.t = now;
    this._touch();
  }

  _touch() {
    this._dirty = true;
    if (this._timer || !this._homey) { return; }
    try {
      const h = this._homey;
      const fn = () => { this._timer = null; this.flush(); };
      // homey timer first; module-level native setTimeout only when no homey timer API (tests), unref'd, cleared in stop()
      this._timer = typeof h.setTimeout === 'function' ? h.setTimeout(fn, SAVE_DEBOUNCE_MS) : setTimeout(fn, SAVE_DEBOUNCE_MS);
      if (this._timer && typeof this._timer.unref === 'function') { this._timer.unref(); }
    } catch (_e) { this._timer = null; }
  }

  serialize() {
    const c = {};
    for (const [k, e] of this._m.entries()) { c[k] = e; }
    let out = { v: VERSION, c };
    let json = JSON.stringify(out);
    // Size guard: drop the least recently used couples until it fits.
    if (json.length > MAX_BYTES) {
      const keys = Object.keys(c);
      while (keys.length && json.length > MAX_BYTES) {
        const drop = Math.max(1, Math.ceil(keys.length / 4));
        keys.splice(0, drop).forEach((k) => { delete c[k]; this._m.delete(k); });
        out = { v: VERSION, c };
        json = JSON.stringify(out);
      }
    }
    return out;
  }

  flush() {
    if (!this._dirty || !this._homey) { return false; }
    this._dirty = false;
    try { this._homey.settings.set(SETTINGS_KEY, this.serialize()); return true; } catch (_e) { return false; }
  }

  /** App uninit: flush and clear the timer. */
  stop() {
    const t = this._timer;
    this._timer = null;
    if (t) {
      try { if (this._homey && typeof this._homey.clearTimeout === 'function') { this._homey.clearTimeout(t); } } catch (_e) { /* soft */ }
      try { clearTimeout(t); } catch (_e) { /* soft */ }
    }
    this.flush();
  }

  /** Memory budget: keep only the most recent half (persisted copy untouched until next flush). */
  trim() { return this._m.trim(Math.ceil(this._m.max / 2)); }

  snapshot(limit = 20) {
    this._load();
    const out = {};
    let n = 0;
    for (const [k, e] of this._m.entries()) { if (n++ >= limit) { break; } out[k] = { chain: Object.keys(e.c).length, patterns: Object.keys(e.l).length }; }
    return { couples: this._m.size, max: this._m.max, sample: out };
  }
}

let _shared = null;
function shared() { if (!_shared) { _shared = new CoupleKnowledge(); } return _shared; }
function _resetShared() { if (_shared) { try { _shared.stop(); } catch (_e) { /* soft */ } } _shared = null; }

module.exports = { CoupleKnowledge, shared, coupleKey, coupleOf, SETTINGS_KEY, VERSION, MAX_COUPLES, MAX_CHAIN, MAX_PATTERNS, MAX_BYTES, _resetShared };
