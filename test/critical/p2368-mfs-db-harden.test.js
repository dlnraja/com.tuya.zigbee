'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DB = path.join(ROOT, 'data', 'mfs_db.json');
const { KNOWN_CORRECTIONS } = require('../../tools/ci/sync-compose-to-mfs-db');

function findEntry(mfrNorm) {
  const db = JSON.parse(fs.readFileSync(DB, 'utf8'));
  const key = Object.keys(db).find((k) => k.toLowerCase() === mfrNorm.toLowerCase() && typeof db[k] === 'object' && db[k].driverId);
  return key ? { key, entry: db[key] } : null;
}

describe('P2368 mfs_db hardening', () => {
  it('mfs_db loads and has _meta', () => {
    const db = JSON.parse(fs.readFileSync(DB, 'utf8'));
    assert.ok(db._meta);
    assert.ok(Object.keys(db).length > 4000);
  });

  it('known corrections are reflected in mfs_db', () => {
    for (const fix of KNOWN_CORRECTIONS.filter((f) => !f.mergeInto)) {
      const hit = findEntry(fix.mfr);
      assert.ok(hit, `missing mfr ${fix.mfr}`);
      assert.strictEqual(hit.entry.driverId, fix.driverId, `${fix.mfr} driverId`);
    }
  });

  it('402vrq2i routes to smart_knob not switch_4_gang_metering', () => {
    const hit = findEntry('_tz3000_402vrq2i');
    assert.ok(hit);
    assert.strictEqual(hit.entry.driverId, 'smart_knob');
  });

  it('HLX9TNZB TZE284 routes to dimmer_1_gang_tuya', () => {
    const hit = findEntry('_tze284_hlx9tnzb');
    assert.ok(hit);
    assert.strictEqual(hit.entry.driverId, 'dimmer_1_gang_tuya');
  });

  it('no case-duplicate mfr keys', () => {
    const db = JSON.parse(fs.readFileSync(DB, 'utf8'));
    const seen = new Map();
    for (const k of Object.keys(db)) {
      if (typeof db[k] !== 'object' || !db[k].driverId) continue;
      const lk = k.toLowerCase();
      if (seen.has(lk)) {
        assert.fail(`case duplicate: ${seen.get(lk)} vs ${k}`);
      }
      seen.set(lk, k);
    }
  });

  it('UdpDiscoveryKeys SSOT exists (wifi unrelated sanity)', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'lib/tuya-local/UdpDiscoveryKeys.js')));
  });
});
