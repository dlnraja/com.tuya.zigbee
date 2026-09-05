'use strict';

/**
 * P92 - fingerprint-matcher unit tests
 * Heuristic, case-insensitive manufacturerName/productId matching:
 * exact, normalized (parasites), interchangeable TZE prefixes, mfr-only
 * with unknown pid, fuzzy suffix (edit distance <= 2), pid-only fallback.
 */

const assert = require('assert');

const FM = require('../lib/utils/fingerprint-matcher');
const CompoundFingerprintDB = require('../lib/DeviceFingerprintDB');
const RuntimeFingerprintDB = require('../lib/tuya/DeviceFingerprintDB');

const ZWSP = '​'; // zero-width space
const NBSP = ' '; // non-breaking space

function makeDb() {
  return {
    '_TZE200_vvmbj46n': { driverId: 'lcdtemphumidsensor', modelIds: ['TS0601'] },
    '_TZE284_sgabhwa6': { driverId: 'soil_sensor', modelIds: ['TS0601'] },
    '_TZ3000_qaaysllp': { driverId: 'lcdtemphumidluxsensor', modelIds: ['TS0201'] },
    '_TYZB01_xyz12345': { driverId: 'motion_sensor', modelIds: ['TS0202'] },
  };
}

describe('fingerprint-matcher (P92 heuristic matching)', function() {

  describe('normalizeMfr', function() {
    it('splits known Tuya prefixes from the suffix', function() {
      const norm = FM.normalizeMfr('_TZE200_vvmbj46n');
      assert.strictEqual(norm.key, '_tze200_vvmbj46n');
      assert.strictEqual(norm.prefix, '_tze200');
      assert.strictEqual(norm.suffix, 'vvmbj46n');
    });

    it('lowercases mixed case', function() {
      assert.strictEqual(FM.normalizeMfr('_TzE200_VvMbJ46N').key, '_tze200_vvmbj46n');
    });

    it('strips zero-width and non-breaking parasites', function() {
      assert.strictEqual(FM.normalizeMfr(`_TZE200${ZWSP}_vvmbj46n${NBSP}`).key, '_tze200_vvmbj46n');
    });

    it('strips control characters', function() {
      assert.strictEqual(FM.normalizeMfr('_TZE200_vvmbj46n\t').key, '_tze200_vvmbj46n');
    });

    it('unifies repeated/odd separators', function() {
      assert.strictEqual(FM.normalizeMfr('_TZE200__vvmbj46n').key, '_tze200_vvmbj46n');
      assert.strictEqual(FM.normalizeMfr('_TZE200 vvmbj46n').key, '_tze200_vvmbj46n');
    });

    it('returns empty key for null/empty input', function() {
      assert.strictEqual(FM.normalizeMfr(null).key, '');
      assert.strictEqual(FM.normalizeMfr('   ').key, '');
    });
  });

  describe('normalizePid', function() {
    it('uppercases and cleans', function() {
      assert.strictEqual(FM.normalizePid('ts0601'), 'TS0601');
      assert.strictEqual(FM.normalizePid(` ts0601${ZWSP}`), 'TS0601');
    });
  });

  describe('matchFingerprint scoring tiers', function() {
    it('scores an exact raw key 1.0', function() {
      const hit = FM.matchFingerprint('_TZE200_vvmbj46n', 'TS0601', makeDb());
      assert.strictEqual(hit.matchType, 'exact');
      assert.strictEqual(hit.score, 1.0);
      assert.strictEqual(hit.entry.driverId, 'lcdtemphumidsensor');
    });

    it('scores a case-insensitive match 0.95 (normalized)', function() {
      const hit = FM.matchFingerprint('_tze200_VVMBJ46N', 'TS0601', makeDb());
      assert.strictEqual(hit.matchType, 'normalized');
      assert.strictEqual(hit.score, 0.95);
    });

    it('tolerates parasite characters (normalized)', function() {
      const hit = FM.matchFingerprint(`${NBSP}_TZE200_vvmbj46n${ZWSP}`, 'TS0601', makeDb());
      assert.strictEqual(hit.matchType, 'normalized');
      assert.strictEqual(hit.entry.driverId, 'lcdtemphumidsensor');
    });

    it('matches _TZE204_ against a _TZE200_ key (prefix_variant 0.9)', function() {
      const hit = FM.matchFingerprint('_TZE204_vvmbj46n', 'TS0601', makeDb());
      assert.strictEqual(hit.matchType, 'prefix_variant');
      assert.strictEqual(hit.score, 0.9);
      assert.strictEqual(hit.entry.driverId, 'lcdtemphumidsensor');
    });

    it('matches _TZE284_ against a _TZE200_ key (prefix_variant)', function() {
      const hit = FM.matchFingerprint('_TZE284_vvmbj46n', 'TS0601', makeDb());
      assert.strictEqual(hit.matchType, 'prefix_variant');
    });

    it('matches _TYST11_ against a _TZE284_ key (prefix_variant)', function() {
      const hit = FM.matchFingerprint('_TYST11_sgabhwa6', 'TS0601', makeDb());
      assert.strictEqual(hit.matchType, 'prefix_variant');
      assert.strictEqual(hit.entry.driverId, 'soil_sensor');
    });

    it('does NOT prefix-match across non-interchangeable families', function() {
      const hit = FM.matchFingerprint('_TZE200_qaaysllp', 'TS0201', makeDb());
      // _TZ3000_ and _TZE200_ are not interchangeable: no prefix_variant,
      // and the suffix is identical so fuzzy (dist 0) is excluded too.
      assert.strictEqual(hit, null);
    });

    it('fuzzy-matches a 1-char typo in the suffix (0.6)', function() {
      const hit = FM.matchFingerprint('_TZE200_vvmbj46o', 'TS0601', makeDb());
      assert.strictEqual(hit.matchType, 'fuzzy_suffix');
      assert.strictEqual(hit.score, 0.6);
      assert.strictEqual(hit.editDistance, 1);
    });

    it('fuzzy-matches a 2-char typo in the suffix', function() {
      const hit = FM.matchFingerprint('_TZE200_vvmbj4oo', 'TS0601', makeDb());
      assert.strictEqual(hit.matchType, 'fuzzy_suffix');
      assert.strictEqual(hit.editDistance, 2);
    });

    it('rejects a 3-char typo (edit distance > 2)', function() {
      const hit = FM.matchFingerprint('_TZE200_vvmbjooo', 'TS0601', makeDb());
      assert.strictEqual(hit, null);
    });

    it('does not fuzzy-match very short suffixes', function() {
      const db = { '_TZE200_abc': { driverId: 'x' } };
      const hit = FM.matchFingerprint('_TZE200_abd', null, db);
      assert.strictEqual(hit, null);
    });

    it('downgrades an exact mfr with unknown pid to 0.7', function() {
      const hit = FM.matchFingerprint('_TZ3000_qaaysllp', 'TS9999', makeDb());
      assert.strictEqual(hit.matchType, 'mfr_exact_pid_unknown');
      assert.strictEqual(hit.score, 0.7);
    });

    it('keeps exact mfr + known pid at full score (pid case-insensitive)', function() {
      const hit = FM.matchFingerprint('_TZE200_vvmbj46n', 'ts0601', makeDb());
      assert.strictEqual(hit.matchType, 'exact');
      assert.strictEqual(hit.score, 1.0);
    });

    it('returns null when nothing matches', function() {
      assert.strictEqual(FM.matchFingerprint('_TZE200_zzzzzzzz', 'TS0601', makeDb()), null);
      assert.strictEqual(FM.matchFingerprint('_TZE200_zzzzzzzz', null, makeDb()), null);
    });

    it('returns null for empty manufacturerName', function() {
      assert.strictEqual(FM.matchFingerprint('', 'TS0601', makeDb()), null);
      assert.strictEqual(FM.matchFingerprint(null, 'TS0601', makeDb()), null);
    });

    it('honours a stricter custom threshold', function() {
      const hit = FM.matchFingerprint('_TZE204_vvmbj46n', 'TS0601', makeDb(), { threshold: 0.95 });
      assert.strictEqual(hit, null);
    });

    it('exact always beats prefix_variant and fuzzy', function() {
      const db = {
        '_TZE200_vvmbj46n': { driverId: 'a' },
        '_TZE204_vvmbj46n': { driverId: 'b' },
      };
      const hit = FM.matchFingerprint('_TZE204_vvmbj46n', null, db);
      assert.strictEqual(hit.matchType, 'exact');
      assert.strictEqual(hit.entry.driverId, 'b');
    });
  });

  describe('bestCandidates / suggestDriverFromPid fallbacks', function() {
    it('returns the k closest candidates without threshold', function() {
      const top = FM.bestCandidates('_TZE200_vvmbj46x', makeDb(), 3);
      assert(top.length >= 1);
      assert.strictEqual(top[0].key, '_TZE200_vvmbj46n');
    });

    it('suggests the most frequent driverHint for a pid', function() {
      const devices = {
        _tze200_aaaa1111: { modelIds: ['TS0601'], driverHint: 'soil_sensor', confidence: 0.9 },
        _tze204_bbbb2222: { modelIds: ['TS0601'], driverHint: 'soil_sensor', confidence: 0.5 },
        _tze200_cccc3333: { modelIds: ['TS0601'], driverHint: 'climate_sensor', confidence: 0.3 },
        _tz3000_dddd4444: { modelIds: ['TS0001'], driverHint: 'switch_1gang', confidence: 0.9 },
      };
      const suggestion = FM.suggestDriverFromPid('ts0601', devices);
      assert.strictEqual(suggestion.driverHint, 'soil_sensor');
      assert.strictEqual(suggestion.count, 2);
    });

    it('returns null when no mfs_db entry carries the pid', function() {
      const suggestion = FM.suggestDriverFromPid('TS9999', { _tze200_aaaa1111: { modelIds: ['TS0601'], driverHint: 'soil_sensor' } });
      assert.strictEqual(suggestion, null);
    });
  });

  describe('verbose logging', function() {
    it('logs raw input, normalized form and retained score when verbose', function() {
      const lines = [];
      FM.matchFingerprint('_TZE204_vvmbj46n', 'TS0601', makeDb(), { verbose: true, log: (...a) => lines.push(a.map(x => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ')) });
      const blob = lines.join('\n');
      assert(blob.includes('match attempt'), 'expected attempt log');
      assert(blob.includes('_TZE204_vvmbj46n'), 'expected raw input in log');
      assert(blob.includes('_tze204_vvmbj46n'), 'expected normalized form in log');
      assert(blob.includes('match retained'), 'expected retained log');
      assert(blob.includes('prefix_variant'), 'expected matchType in log');
      assert(blob.includes('0.9'), 'expected retained score in log');
    });

    it('stays silent by default', function() {
      const lines = [];
      FM.matchFingerprint('_TZE204_vvmbj46n', 'TS0601', makeDb(), { log: (...a) => lines.push(a.join(' ')) });
      assert.strictEqual(lines.length, 0);
    });
  });

  describe('index invalidation', function() {
    it('sees db mutations after invalidateIndex', function() {
      const db = { '_TZE200_qqqq1111': { driverId: 'first' } };
      assert.strictEqual(FM.matchFingerprint('_TZE200_qqqq1111', null, db).entry.driverId, 'first');
      db['_TZE200_qqqq1111'] = { driverId: 'second' };
      FM.invalidateIndex(db);
      assert.strictEqual(FM.matchFingerprint('_TZE200_qqqq1111', null, db).entry.driverId, 'second');
    });
  });

  describe('integration: lib/DeviceFingerprintDB (compound)', function() {
    it('keeps exact compound matches at matchType exact', function() {
      const profile = CompoundFingerprintDB.lookup('_TZE284_sgabhwa6', 'TS0601');
      assert.strictEqual(profile.matchType, 'exact');
      assert.strictEqual(profile.driver, 'soil_sensor');
    });

    it('routes an interchangeable TZE prefix to the same driver', function() {
      const profile = CompoundFingerprintDB.lookup('_TZE204_sgabhwa6', 'TS0601');
      assert(profile, 'expected a heuristic hit');
      assert.strictEqual(profile.driver, 'soil_sensor');
      assert.strictEqual(profile.matchType, 'prefix_variant');
    });

    it('routes a 1-char suffix typo via fuzzy_suffix', function() {
      const profile = CompoundFingerprintDB.lookup('_TZE200_jthf7vb7', 'TS0601');
      assert(profile, 'expected a fuzzy hit');
      assert.strictEqual(profile.driver, 'water_leak_sensor');
      assert.strictEqual(profile.matchType, 'fuzzy_suffix');
    });

    it('still falls back to productId_default for total unknowns', function() {
      const profile = CompoundFingerprintDB.lookup('_TZE200_zzzzzzzz', 'TS0601');
      assert.strictEqual(profile.matchType, 'productId_default');
    });
  });

  describe('integration: lib/tuya/DeviceFingerprintDB (runtime)', function() {
    it('keeps exact runtime fingerprints free of heuristic metadata', function() {
      const fp = RuntimeFingerprintDB.getFingerprint('_TZE200_vvmbj46n', 'TS0601');
      assert(fp);
      assert.strictEqual(fp._matchedKey, undefined);
    });

    it('resolves a _TZE204_ variant of a _TZE200_ fingerprint', function() {
      const fp = RuntimeFingerprintDB.getFingerprint('_TZE204_vvmbj46n', 'TS0601');
      assert(fp);
      assert.strictEqual(fp.driverId, 'lcdtemphumidsensor');
      assert.strictEqual(fp.matchType, 'prefix_variant');
      assert.strictEqual(fp._matchedKey, '_TZE200_vvmbj46n');
      assert(fp._matchScore >= 0.9);
    });

    it('resolves a _TYST11_ alias through the heuristic', function() {
      assert.strictEqual(RuntimeFingerprintDB.getDriverId('_TYST11_sgabhwa6', 'TS0601'), 'soil_sensor');
    });

    it('returns null for total unknowns', function() {
      assert.strictEqual(RuntimeFingerprintDB.getFingerprint('_TZE200_zzzzzzzz', 'TS0601'), null);
    });
  });
});
