'use strict';
/* eslint-env mocha */
// P2965: intentional padded manufacturerNames are accepted by the R20 identifier audit only through
// the separate, sourced allowlist (data/rules/padded-mfr-allowlist.json) and only as the exact string
// in the listed driver. The legacy baseline stays shrink-only.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { audit, loadAllowlist, applyAllowlist, freshVsBaseline, isAllowlisted } = require('../tools/ci/identifier-audit');
const { caseTwins, EXACT_DRIVERS } = require('../scripts/validation/ensure-case-variants');

const ROOT = path.join(__dirname, '..');
const ALLOW = path.join(ROOT, 'data', 'rules', 'padded-mfr-allowlist.json');
const BASELINE = path.join(ROOT, 'tools', 'ci', 'identifier-audit-baseline.json');
const EMPTY_BASE = { malformed: [], hidden: [] };
const ENTRIES = [{ value: 'AOYAN  ', driver: 'radar_x', source: { url: 'https://example.invalid/z2m' }, decision: ['P2958'] }];

function fixture(drivers) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pma-'));
  for (const [id, zigbee] of Object.entries(drivers)) {
    fs.mkdirSync(path.join(root, 'drivers', id), { recursive: true });
    fs.writeFileSync(path.join(root, 'drivers', id, 'driver.compose.json'), JSON.stringify({ zigbee }));
  }
  return root;
}
const gate = (root) => freshVsBaseline(applyAllowlist(audit(root), ENTRIES), EMPTY_BASE);

describe('P2965 padded manufacturerName allowlist', () => {
  it('accepts the allowlisted exact string in its listed driver', () => {
    assert.deepStrictEqual(gate(fixture({ radar_x: { manufacturerName: ['AOYAN  '], productId: ['AY204T'] } })), []);
  });
  it('fails the same string in another driver', () => {
    assert.deepStrictEqual(gate(fixture({ other: { manufacturerName: ['AOYAN  '], productId: ['AY204T'] } })), ['other:"AOYAN  "']);
  });
  it('fails an unlisted padded name, a case twin and a different padding width', () => {
    const fresh = gate(fixture({ radar_x: { manufacturerName: ['AOYAN  ', 'aoyan  ', 'AOYAN ', '_TZ3000_abcdefgh '], productId: ['AY204T'] } }));
    assert.deepStrictEqual(fresh.sort(), ['radar_x:"AOYAN "', 'radar_x:"_TZ3000_abcdefgh "', 'radar_x:"aoyan  "'].sort());
  });
  it('never allowlists invisible/non-ASCII findings even with a matching driver', () => {
    assert.strictEqual(isAllowlisted({ driver: 'radar_x', raw: 'AOYAN  ', why: 'invisible/control character' }, ENTRIES), false);
  });
  it('rejects malformed allowlist entries (unpadded value or missing source)', () => {
    const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pma-')), 'a.json');
    fs.writeFileSync(f, JSON.stringify({ entries: [{ value: 'AOYAN', driver: 'x', source: { url: 'u' }, decision: ['P1'] }] }));
    assert.throws(() => loadAllowlist(f), /invalid entry/);
    fs.writeFileSync(f, JSON.stringify({ entries: [{ value: 'AOYAN  ', driver: 'x', decision: ['P1'] }] }));
    assert.throws(() => loadAllowlist(f), /invalid entry/);
  });

  describe('repository data', () => {
    const entries = loadAllowlist(ALLOW);
    it('every entry is sourced (Z2M file + link) and carries P2941/P2958', () => {
      assert.ok(entries.length >= 3);
      for (const e of entries) {
        assert.match(e.source.url, /^https:\/\/github\.com\/Koenkk\/zigbee-herdsman-converters\/blob\/[0-9a-f]{40}\/src\/devices\/\w+\.ts#L\d+$/, e.value);
        assert.ok(e.source.url.includes(e.source.file), e.source.url);
        assert.ok(e.decision.includes('P2941') && e.decision.includes('P2958'), JSON.stringify(e));
      }
    });
    it('covers the three P2958 dedicated drivers with their exact Z2M strings', () => {
      const keys = entries.map((e) => `${e.driver}|${JSON.stringify(e.value)}`).sort();
      assert.deepStrictEqual(keys, [
        'presence_radar_aoyan_ay204t|"AOYAN  "',
        'water_leak_aoyan_ay222z|"AOYAN  "',
        'water_leak_blitzwolf_bw_is9|"_TZ3000_eit7p838 "',
      ]);
    });
    it('each allowlisted string is really present in its driver compose', () => {
      for (const e of entries) {
        const z = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', e.driver, 'driver.compose.json'), 'utf8')).zigbee;
        assert.ok(z.manufacturerName.includes(e.value), `${e.driver} ${JSON.stringify(e.value)}`);
        if (e.productId) {assert.ok(z.productId.includes(e.productId), `${e.driver} ${e.productId}`);}
      }
    });
    it('baseline stays shrink-only: no allowlisted entry is duplicated in it', () => {
      const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
      const known = new Set(base.malformed.map((m) => `${m.driver}:${m.value}`));
      for (const e of entries) {assert.ok(!known.has(`${e.driver}:${JSON.stringify(e.value)}`), e.driver);}
      assert.ok(base.malformed.length <= 11, `baseline grew to ${base.malformed.length}`);
    });
  });

  describe('auto-fix case-variant bot (scripts/validation/ensure-case-variants.js)', () => {
    it('never invents a case twin of a padded name (9.0.1593 regression)', () => {
      assert.deepStrictEqual(caseTwins(['AOYAN  ']), []);
      assert.deepStrictEqual(caseTwins(['_TZ3000_eit7p838 ']), []);
    });
    it('still adds twins for normal brand names', () => {
      assert.deepStrictEqual(caseTwins(['HOBEIAN']), ['hobeian']);
    });
    it('treats allowlisted drivers as byte-exact (no "aoyan" twin on water_leak_aoyan_ay222z)', () => {
      for (const d of ['presence_radar_aoyan_ay204t', 'water_leak_aoyan_ay222z', 'water_leak_blitzwolf_bw_is9']) {assert.ok(EXACT_DRIVERS.has(d), d);}
    });
  });
});
