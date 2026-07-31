'use strict';

/**
 * Tests — case-variant completeness (v9.0.373)
 * Homey matches zigbee manufacturerName CASE-SENSITIVELY at pairing time.
 * Every Tuya-pattern fingerprint must exist in BOTH upper and lower case
 * in its driver, otherwise devices reporting in the other case pair as
 * "Unknown Zigbee device". Synthetic placeholders are exempt.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..');
const TUYA_RX = /^_t[zy][a-z0-9]{4,}_/i;
const SYNTHETIC_RX = /_disabled|_dummy|_generic|_hybrid|_master|placeholder|needs_/i;

function tuyaCanonical(m) {
  const match = String(m).match(/^(_t[zy][a-z0-9]+)_(.+)$/i);
  return match ? `${match[1].toUpperCase()}_${match[2].toLowerCase()}` : null;
}

describe('case-variant completeness (pairing, unknown device prevention)', () => {
  it('every Tuya fingerprint exists in both cases in every driver', function () {
    if (typeof this.timeout === 'function') {this.timeout(60000);}
    const app = require(path.join(ROOT, 'app.json'));
    const missing = [];
    for (const d of app.drivers) {
      const mfrs = d.zigbee?.manufacturerName || [];
      const exact = new Set(mfrs);
      const seen = new Set();
      for (const m of mfrs) {
        const lc = String(m).toLowerCase();
        if (seen.has(lc)) {continue;}
        seen.add(lc);
        if (!TUYA_RX.test(lc) || SYNTHETIC_RX.test(lc)) {continue;}
        const up = lc.toUpperCase();
        if (!exact.has(up) && up !== lc) {missing.push(`${d.id}: ${m} (manque ${up})`);}
        if (!exact.has(lc)) {missing.push(`${d.id}: ${m} (manque ${lc})`);}
      }
    }
    assert.deepStrictEqual(missing, [],
      `${missing.length} variante(s) de casse manquante(s):\n${missing.slice(0, 10).join('\n')}`);
  });

  it('every Tuya fingerprint also has the canonical variant (prefix UPPER + suffix lower)', function () {
    if (typeof this.timeout === 'function') {this.timeout(60000);}
    const app = require(path.join(ROOT, 'app.json'));
    const missing = [];
    for (const d of app.drivers) {
      const mfrs = d.zigbee?.manufacturerName || [];
      const exact = new Set(mfrs);
      const seen = new Set();
      for (const m of mfrs) {
        const lc = String(m).toLowerCase();
        if (seen.has(lc)) {continue;}
        seen.add(lc);
        if (!TUYA_RX.test(lc) || SYNTHETIC_RX.test(lc)) {continue;}
        const canon = tuyaCanonical(lc);
        if (canon && canon !== lc && canon !== lc.toUpperCase() && !exact.has(canon)) {
          missing.push(`${d.id}: ${m} (manque canonique ${canon})`);
        }
      }
    }
    assert.deepStrictEqual(missing, [],
      `${missing.length} variante(s) canonique(s) manquante(s):\n${missing.slice(0, 10).join('\n')}`);
  });

  it('mfs_db has no case-duplicate keys (runtime matching is case-insensitive)', () => {
    const db = require(path.join(ROOT, 'data', 'mfs_db.json'));
    const seen = new Map();
    const dups = [];
    for (const k of Object.keys(db)) {
      const lk = k.toLowerCase();
      if (seen.has(lk)) {dups.push(`${seen.get(lk)} <-> ${k}`);}
      else {seen.set(lk, k);}
    }
    assert.deepStrictEqual(dups, [],
      `${dups.length} doublon(s) de casse dans mfs_db:\n${dups.join('\n')}`);
  });
});
