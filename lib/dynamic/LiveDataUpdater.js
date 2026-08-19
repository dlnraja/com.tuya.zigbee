'use strict';

/**
 * LiveDataUpdater (P92.77 / P148) — OTA fingerprint overlay from our GitHub Pages.
 *
 * P148 (Peter OOM 96c19859 @ 9.0.537): merging ALL mfs_db segments then
 * writing the full blob into Homey settings blew the ~64MB heap (heap OOM /
 * StringBytes WriteString). Rules now:
 *  - Check manifest version BEFORE downloading segments
 *  - Cap overlay entry count + serialized size
 *  - Never persist oversized payloads to settings (clear bad stores on boot)
 *  - Prefer RAM-safe early exit over completeness
 */

const https = require('https');
const CircuitBreaker = require('../utils/CircuitBreaker');
const FEED_URL = 'https://dlnraja.github.io/com.tuya.zigbee/data/mfs_db_latest.json';
const MANIFEST_URL = 'https://dlnraja.github.io/com.tuya.zigbee/data/mfs_db_manifest.json';
const FEED_BASE = 'https://dlnraja.github.io/com.tuya.zigbee/data/';
const MAX_BYTES = 2 * 1024 * 1024; // per-request hard cap (was 5MB)
const MAX_ENTRIES = 1500; // overlay cap (was 20k — unsafe on Homey Pro)
const MAX_STORE_CHARS = 180000; // ~180KB serialized — Homey settings + V8
const MFR_RX = /^[^\u0000-\u001F\u007F]{1,64}$/u;
const DRIVER_RX = /^[A-Za-z0-9_]{2,60}$/;
const FORBIDDEN_KEYS = new Set(['__proto__']);
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

class LiveDataUpdater {
  constructor(homey, logger) {
    this.homey = homey;
    this.log = logger || (() => {});
    this._overlay = null;
    this._timer = null;
    this._interval = null;

    // Network resilience (local-first): do not hammer remote sources when offline.
    this._breaker = new CircuitBreaker({
      name: 'LiveDataUpdater',
      failureThreshold: 3,
      resetTimeout: 60000,
      successThreshold: 1,
      maxBackoff: 300000,
      isFailure: (err) => err && err.code && ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET', 'EAI_AGAIN'].includes(err.code),
      log: (msg) => this.log(msg),
    });
  }

  async start() {
    try {
      const stored = this.homey.settings.get('live_data_overlay');
      if (stored && this._isStoreSafe(stored) && this._validatePayload(stored)) {
        this._overlay = stored;
        this.log(`[LIVE-DATA] Overlay restored (v${stored.version}, ${Object.keys(stored.devices || {}).length} mfrs)`);
      } else if (stored) {
        this.log('[LIVE-DATA] Clearing oversized/invalid stored overlay (heap safety)');
        try {
          this.homey.settings.unset('live_data_overlay');
          this.homey.settings.unset('live_data_version');
        } catch { /* ignore */ }
      }
    } catch { /* no stored overlay */ }

    this._timer = this.homey.setTimeout(() => this.checkNow().catch(() => {}), 180000 + Math.floor(Math.random() * 120000));
    this._interval = this.homey.setInterval(() => this.checkNow().catch(() => {}), CHECK_INTERVAL_MS);
    if (typeof this._interval.unref === 'function') this._interval.unref();
  }

  stop() {
    if (this._timer) {
      try { this.homey.clearTimeout(this._timer); } catch { clearTimeout(this._timer); }
      this._timer = null;
    }
    if (this._interval) {
      try { this.homey.clearInterval(this._interval); } catch { clearInterval(this._interval); }
      this._interval = null;
    }
  }

  getOverlay() {
    return this._overlay ? this._overlay.devices : null;
  }

  getVersion() {
    return this._overlay ? this._overlay.version : null;
  }

  async checkNow() {
    if (this._heapTooHigh()) {
      this.log('[LIVE-DATA] Skip fetch — heap pressure');
      return { updated: false, reason: 'heap pressure' };
    }

    if (!this._breaker.isAvailable) {
      this.log('[LIVE-DATA] Skip fetch — circuit breaker open');
      return { updated: false, reason: 'circuit open' };
    }

    this.log('[LIVE-DATA] Checking GitHub Pages feed…');
    const currentVersion = this._overlay?.version || this.homey.settings.get('live_data_version') || '';

    let payload;
    try {
      payload = await this._fetchSegmented(currentVersion);
      if (payload === 'UP_TO_DATE') {
        this.log(`[LIVE-DATA] Already up to date (v${currentVersion})`);
        return { updated: false, reason: 'up to date' };
      }
      if (!payload) {
        payload = await this._fetchJson(FEED_URL);
      }
    } catch (err) {
      this.log(`[LIVE-DATA] Fetch failed (${err.message}) — keep local`);
      return { updated: false, reason: err.message };
    }

    if (!this._validatePayload(payload)) {
      this.log('[LIVE-DATA] Invalid payload schema — rejected');
      return { updated: false, reason: 'invalid schema' };
    }

    if (payload.version && currentVersion && String(payload.version) <= String(currentVersion)) {
      this.log(`[LIVE-DATA] Already up to date (v${currentVersion})`);
      return { updated: false, reason: 'up to date' };
    }

    // Cap before holding in memory / settings
    payload = this._capPayload(payload);
    this._overlay = payload;

    if (this._isStoreSafe(payload)) {
      try {
        this.homey.settings.set('live_data_overlay', payload);
        this.homey.settings.set('live_data_version', String(payload.version || ''));
      } catch (err) {
        this.log(`[LIVE-DATA] Store skip (${err.message}) — in-memory only`);
      }
    } else {
      this.log('[LIVE-DATA] Overlay too large for settings — in-memory only');
    }

    const count = Object.keys(payload.devices || {}).length;
    this.log(`[LIVE-DATA] Overlay updated: v${payload.version} (${count} mfrs)`);
    return { updated: true, version: payload.version, count };
  }

  _heapTooHigh() {
    try {
      const mem = process.memoryUsage();
      // Use RSS (what Homey Pro counts as app memory budget ~64MB).
      // heapUsed alone underestimates total footprint (native, buffers, modules).
      // Guard at 55MB RSS to leave 9MB headroom for device traffic spikes.
      const rss = mem.rss || 0;
      const heapUsed = mem.heapUsed || 0;
      return rss > 55 * 1024 * 1024 || heapUsed > 40 * 1024 * 1024;
    } catch {
      return false;
    }
  }

  _isStoreSafe(p) {
    if (!p || typeof p !== 'object') return false;
    const n = Object.keys(p.devices || {}).length;
    if (n > MAX_ENTRIES) return false;
    try {
      const s = JSON.stringify(p);
      return s.length <= MAX_STORE_CHARS;
    } catch {
      return false;
    }
  }

  _capPayload(p) {
    const devices = p.devices || {};
    const keys = Object.keys(devices);
    if (keys.length <= MAX_ENTRIES && this._isStoreSafe(p)) return p;
    const capped = {};
    for (let i = 0; i < Math.min(keys.length, MAX_ENTRIES); i++) {
      capped[keys[i]] = devices[keys[i]];
    }
    return { version: p.version, generated: p.generated, devices: capped };
  }

  _validatePayload(p) {
    if (!p || typeof p !== 'object' || Array.isArray(p)) return false;
    if (typeof p.version !== 'string' && typeof p.version !== 'number') return false;
    const devices = p.devices;
    if (!devices || typeof devices !== 'object' || Array.isArray(devices)) return false;
    const keys = Object.keys(devices);
    if (keys.length > MAX_ENTRIES) return false;
    for (const k of keys) {
      if (FORBIDDEN_KEYS.has(k) || !MFR_RX.test(k)) return false;
      const e = devices[k];
      if (!e || typeof e !== 'object' || Array.isArray(e)) return false;
      if (typeof e.driverId !== 'string' || !DRIVER_RX.test(e.driverId)) return false;
      if (e.modelIds !== undefined) {
        if (!Array.isArray(e.modelIds) || e.modelIds.length > 60) return false;
        for (const m of e.modelIds) {
          if (typeof m !== 'string' || m.length > 60) return false;
        }
      }
      if (e.source !== undefined && (typeof e.source !== 'string' || e.source.length > 120)) return false;
    }
    return true;
  }

  /**
   * Progressive segmented download. Returns:
   *  - payload object
   *  - 'UP_TO_DATE' when manifest version is not newer (no segment downloads)
   *  - null when segmented feed unavailable
   */
  async _fetchSegmented(currentVersion) {
    let manifest;
    try {
      manifest = await this._fetchJson(MANIFEST_URL);
    } catch {
      return null;
    }
    if (!manifest || typeof manifest !== 'object' || !manifest.segments) return null;

    if (manifest.version && currentVersion && String(manifest.version) <= String(currentVersion)) {
      return 'UP_TO_DATE';
    }

    const entries = Object.entries(manifest.segments)
      .filter(([, info]) => info && typeof info.file === 'string' && /^mfs_db_\w+\.json$/.test(info.file))
      .sort((a, b) => (a[1].count || 0) - (b[1].count || 0));
    if (!entries.length) return null;

    const devices = {};
    let version = manifest.version;
    for (const [seg, info] of entries) {
      if (this._heapTooHigh()) {
        this.log(`[LIVE-DATA] Stop segments early at ${seg} (heap)`);
        break;
      }
      if (Object.keys(devices).length >= MAX_ENTRIES) break;
      try {
        const segPayload = await this._fetchJson(FEED_BASE + info.file);
        if (!segPayload?.devices || typeof segPayload.devices !== 'object') {
          this.log(`[LIVE-DATA] segment ${seg} invalid — skip`);
          continue;
        }
        // Merge with hard cap (do not validate full 20k blob)
        for (const [mfr, entry] of Object.entries(segPayload.devices)) {
          if (Object.keys(devices).length >= MAX_ENTRIES) break;
          if (FORBIDDEN_KEYS.has(mfr) || !MFR_RX.test(mfr)) continue;
          if (!entry || typeof entry.driverId !== 'string' || !DRIVER_RX.test(entry.driverId)) continue;
          devices[mfr] = entry;
        }
        version = segPayload.version || version;
        this.log(`[LIVE-DATA] segment ${seg}: +${Object.keys(segPayload.devices).length} (overlay ${Object.keys(devices).length})`);
        // Drop segment payload reference ASAP
      } catch (err) {
        this.log(`[LIVE-DATA] segment ${seg} failed (${err.message})`);
      }
    }
    if (!Object.keys(devices).length) return null;
    return { version, generated: manifest.generated, devices };
  }

  _fetchJson(url) {
    return this._breaker.exec(() => this._rawFetchJson(url));
  }

  _rawFetchJson(url) {
    return new Promise((resolve, reject) => {
      if (!url.startsWith('https://')) return reject(new Error('HTTPS only'));
      const req = https.get(url, { headers: { 'User-Agent': 'homey-tuya-app/9.0' } }, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const chunks = [];
        let received = 0;
        res.on('data', (c) => {
          received += c.length;
          if (received > MAX_BYTES) req.destroy(new Error('feed exceeds 2MB cap'));
          chunks.push(c);
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
          } catch (e) {
            reject(new Error('invalid JSON'));
          }
        });
      });
      req.setTimeout(15000, () => req.destroy(new Error('timeout 15s')));
      req.on('error', reject);
    });
  }
}

module.exports = LiveDataUpdater;
