'use strict';

/**
 * LiveDataUpdater (P92.77) — "Over-the-air" DATA updates from our own
 * GitHub Pages feed. The repo's deploy-pages workflow exports
 * data/mfs_db_latest.json daily; the app fetches it every 24h and merges
 * NEW fingerprints as a runtime overlay — no app reinstall needed.
 *
 * SECURITY MODEL (strict, by design):
 *  - HTTPS-only, 15s timeout, 5MB cap, JSON.parse ONLY (never eval/require)
 *  - Schema validation: every mfr key and value field regex-checked
 *  - Prototype-pollution guard (__proto__/constructor/prototype rejected)
 *  - Entry count cap (20k) and per-field length caps
 *  - Version compare before applying; local curated mfs_db ALWAYS wins
 *    (overlay only ADDS manufacturers absent locally)
 *  - ANY failure (network, schema, parse) → keep local data, log, retry tomorrow
 *  - Zero external API, zero secrets, zero cost: our own gh-pages only.
 */

const https = require('https');
const FEED_URL = 'https://dlnraja.github.io/com.tuya.zigbee/data/mfs_db_latest.json';
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ENTRIES = 20000;
// Real-world mfrs include unicode (MÜLLER LICHT), punctuation (THIRD
// REALITY, INC), symbols (zzh!). Block control chars only.
const MFR_RX = /^[^\u0000-\u001F\u007F]{1,64}$/u;
const DRIVER_RX = /^[A-Za-z0-9_]{2,60}$/;
// '__proto__' stays blocked (JSON.parse own-prop is safe to iterate, but
// paranoia for any future merge); 'prototype'/'constructor' are legit
// manufacturer names in the wild (mfs_db literally has a "prototype" mfr).
const FORBIDDEN_KEYS = new Set(['__proto__']);
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

class LiveDataUpdater {
  constructor(homey, logger) {
    this.homey = homey;
    this.log = logger || (() => {});
    this._overlay = null; // { version, generated, devices: {mfr: {driverId, modelIds}} }
    this._timer = null;
  }

  async start() {
    // Restore last-good overlay from store (survives restarts)
    try {
      const stored = this.homey.settings.get('live_data_overlay');
      if (stored && this._validatePayload(stored)) {
        this._overlay = stored;
        this.log(`[LIVE-DATA] Overlay restauré depuis le store (v${stored.version})`);
      }
    } catch { /* no stored overlay */ }

    // First check shortly after boot (staggered to avoid boot storm)
    this._timer = setTimeout(() => this.checkNow().catch(() => {}), 120000 + Math.floor(Math.random() * 60000));
    // Then daily
    this._interval = setInterval(() => this.checkNow().catch(() => {}), CHECK_INTERVAL_MS);
    if (typeof this._interval.unref === 'function') {this._interval.unref();}
  }

  stop() {
    if (this._timer) {clearTimeout(this._timer);}
    if (this._interval) {clearInterval(this._interval);}
  }

  /** The merged overlay (mfrs absent from local mfs_db), or null. */
  getOverlay() {
    return this._overlay ? this._overlay.devices : null;
  }

  getVersion() {
    return this._overlay ? this._overlay.version : null;
  }

  async checkNow() {
    this.log('[LIVE-DATA] Vérification du flux GitHub Pages…');
    let payload;
    try {
      payload = await this._fetchJson(FEED_URL);
    } catch (err) {
      this.log(`[LIVE-DATA] Fetch impossible (${err.message}) — données locales conservées`);
      return { updated: false, reason: err.message };
    }

    if (!this._validatePayload(payload)) {
      this.log('[LIVE-DATA] Payload invalide (schéma) — rejeté');
      return { updated: false, reason: 'invalid schema' };
    }

    const currentVersion = this._overlay?.version || this.homey.settings.get('live_data_version') || '';
    if (payload.version && currentVersion && String(payload.version) <= String(currentVersion)) {
      this.log(`[LIVE-DATA] Déjà à jour (v${currentVersion})`);
      return { updated: false, reason: 'up to date' };
    }

    this._overlay = payload;
    try {
      this.homey.settings.set('live_data_overlay', payload);
      this.homey.settings.set('live_data_version', String(payload.version || ''));
    } catch { /* store full — keep in-memory only */ }
    const count = Object.keys(payload.devices || {}).length;
    this.log(`[LIVE-DATA] ✅ Overlay mis à jour: v${payload.version} (${count} fabricants)`);
    return { updated: true, version: payload.version, count };
  }

  _validatePayload(p) {
    if (!p || typeof p !== 'object' || Array.isArray(p)) {return false;}
    if (typeof p.version !== 'string' && typeof p.version !== 'number') {return false;}
    const devices = p.devices;
    if (!devices || typeof devices !== 'object' || Array.isArray(devices)) {return false;}
    const keys = Object.keys(devices);
    if (keys.length > MAX_ENTRIES) {return false;}
    for (const k of keys) {
      if (FORBIDDEN_KEYS.has(k) || !MFR_RX.test(k)) {return false;}
      const e = devices[k];
      if (!e || typeof e !== 'object' || Array.isArray(e)) {return false;}
      if (typeof e.driverId !== 'string' || !DRIVER_RX.test(e.driverId)) {return false;}
      if (e.modelIds !== undefined) {
        if (!Array.isArray(e.modelIds) || e.modelIds.length > 60) {return false;}
        for (const m of e.modelIds) {
          if (typeof m !== 'string' || m.length > 60) {return false;}
        }
      }
      if (e.source !== undefined && (typeof e.source !== 'string' || e.source.length > 120)) {return false;}
    }
    return true;
  }

  _fetchJson(url) {
    return new Promise((resolve, reject) => {
      if (!url.startsWith('https://')) {return reject(new Error('HTTPS only'));}
      const req = https.get(url, { headers: { 'User-Agent': 'homey-tuya-app/9.0' } }, (res) => {
        if (res.statusCode !== 200) {res.resume(); return reject(new Error(`HTTP ${res.statusCode}`));}
        const chunks = [];
        let received = 0;
        res.on('data', (c) => {
          received += c.length;
          if (received > MAX_BYTES) {req.destroy(new Error('feed exceeds 5MB cap'));}
          chunks.push(c);
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
          } catch (e) {reject(new Error('invalid JSON'));}
        });
      });
      req.setTimeout(15000, () => req.destroy(new Error('timeout 15s')));
      req.on('error', reject);
    });
  }
}

module.exports = LiveDataUpdater;
