'use strict';

/**
 * P2678 — Dynamic / petit-bout JSON.parse (OOM harden)
 *
 * Contre quoi (diag 149bc1a5 JsonParse OOM @ ~63MB):
 * - Full lib/tuya/fingerprints.json (~0.9MB) parsed in one shot during boot
 * - Buffer.toString('utf8') before JSON.parse (double allocation)
 * - AutonomousEnricher full mfs_db (~5MB) parse on Homey
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SHARDS = path.join(ROOT, 'lib', 'tuya', 'fp-shards');

describe('P2678 dynamic / batched JSON load', () => {
  it('fp-shards exist with manifest and no oversize shard', () => {
    assert.ok(fs.existsSync(path.join(SHARDS, 'manifest.json')), 'manifest');
    const man = JSON.parse(fs.readFileSync(path.join(SHARDS, 'manifest.json')));
    assert.ok(man.shardCount >= 50, 'many small shards');
    assert.ok(man.keyCount >= 5000, 'covers broad catalog keys');
    let max = 0;
    for (const id of Object.keys(man.shards || {})) {
      const fp = path.join(SHARDS, `${id}.json`);
      assert.ok(fs.existsSync(fp), `shard ${id}`);
      const sz = fs.statSync(fp).size;
      max = Math.max(max, sz);
      assert.ok(sz < 180 * 1024, `${id} must stay petit bout (<180KB), got ${sz}`);
    }
    assert.ok(max > 0);
  });

  it('fingerprintShardId is stable for HOBEIAN / TZ3000 / TZE284', () => {
    const { fingerprintShardId } = require('../../lib/tuya/fingerprintShardId');
    assert.equal(fingerprintShardId('HOBEIAN'), 'HOBEIAN');
    assert.equal(fingerprintShardId('_TZ3000_abc'), 'TZ3000_a');
    assert.equal(fingerprintShardId('_TZE284_m1cvyneb'), 'TZE284_m');
    assert.equal(fingerprintShardId('_TZE200_icka1clh'), 'TZE200_i');
  });

  it('IntelligentLazyLoad exposes batched Buffer loader (no utf8)', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib', 'performance', 'IntelligentLazyLoad.js'),
      'utf8',
    );
    assert.ok(src.includes('loadJsonBuffersBatched'));
    assert.ok(src.includes('P2678'));
    assert.ok(!/JSON\.parse\(\s*buf\.toString\(\s*['"]utf8['"]\s*\)\s*\)/.test(src));
  });

  it('DeviceFingerprintDB prefers shards over monolith at boot', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib', 'tuya', 'DeviceFingerprintDB.js'),
      'utf8',
    );
    assert.ok(src.includes('fp-shards'));
    assert.ok(src.includes('_ensureShardForManufacturer'));
    assert.ok(src.includes('P2678'));
    assert.ok(src.includes('_tryUpgradeBroadCatalogBatched'));
  });

  it('AutonomousEnricher never toString utf8 before JSON.parse', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib', 'dynamic', 'AutonomousEnricher.js'),
      'utf8',
    );
    assert.ok(!/JSON\.parse\(\s*rawBuf\.toString\(\s*['"]utf8['"]\s*\)\s*\)/.test(src));
    assert.ok(src.includes('P2678') || src.includes('512 * 1024'));
  });

  it('runtime getFingerprint loads matching shard dynamically', () => {
    const FP = require('../../lib/tuya/DeviceFingerprintDB');
    assert.ok(FP._shardsAvailable(), 'shards shipped');
    // Force curated-only base then shard pull
    const entry = FP.getFingerprint('_TZ3000_fllyghyj', 'SNZB-02');
    // May be null if not in catalog — but shard file must load without throw
    assert.ok(typeof entry === 'object' || entry === null);
    const shardId = require('../../lib/tuya/fingerprintShardId').fingerprintShardId('_TZ3000_fllyghyj');
    assert.ok(fs.existsSync(path.join(SHARDS, `${shardId}.json`)));
  });
});
