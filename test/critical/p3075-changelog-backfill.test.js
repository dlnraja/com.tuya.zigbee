'use strict';
// P3075 (t587u): old changelog entries rewritten as granular en/fr notes, versions untouched.
const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const B = require(path.join(ROOT, 'scripts', 'automation', 'changelog-backfill.js'));
const CE = require(path.join(ROOT, 'scripts', 'automation', 'changelog-entry.js'));

// Placeholder / vague entries still waiting for a rewrite, per app. May only go down.
const CEIL = { 'com.dlnraja.tuya.zigbee': 0, 'com.dlnraja.tuya.zigbee.stable': 128, 'com.dlnraja.tuya.zigbee.bastien': 551 };
// Last version covered by the backlog ratchet, per app (later bumps are judged by the bump routine itself).
const CUTOFF = { 'com.dlnraja.tuya.zigbee.bastien': '1.0.217' };

describe('P3075 changelog backfill', () => {
  it('reads only user-facing commits and keeps ids, not refs', () => {
    assert.strictEqual(B.classify('chore(ledger): forum posts past lastSeen [skip ci]'), null);
    assert.strictEqual(B.classify('v9.0.1601: 459 drivers, 4335 FPs [skip ci]'), null);
    const c = B.classify('fix(P2913,#560): TRV06 battery alarm on the thermostat (forum 140352#2265)');
    assert.strictEqual(c.kind, 'fix');
    assert.deepStrictEqual(c.models, ['TRV06']);
    assert.strictEqual(c.topics[0][0], 'thermostats');
  });

  it('writes both languages, and says so when a build changed nothing for users', () => {
    const d = B.describe(['feat(P1): Wi-Fi curtain position from DP3', 'fix(P2): TS011F plug energy reading', 'ci: lint']);
    assert.match(d.en, /curtains and blinds/);
    assert.match(d.fr, /rideaux et volets/);
    assert.match(d.en, /TS011F/);
    const m = B.describe(['chore: sync', 'ci(P3): gates']);
    assert.match(m.en, /^Maintenance build/);
    assert.match(m.fr, /^Version de maintenance/);
  });

  it('keeps a model with every family its commit names, and skips coarse ranges', () => {
    const d = B.describe(['fix: TS0601 thermostat and curtain motor timing', 'fix: TS011F plug']);
    assert.match(d.en, /thermostats & curtains and blinds \(TS0601\)/);
    assert.doesNotMatch(d.en, /thermostats \(TS0601, TS011F\)/);
    const obj = { '2.0.1': { en: 'Device compatibility and reliability improvements.' } };
    const wide = new Map([['2.0.1', Array.from({ length: 200 }, (_, i) => 'fix: plug ' + i)]]);
    assert.strictEqual(B.backfill(obj, wide).length, 0);
  });

  it('finds version bumps by tag or subject', () => {
    assert.strictEqual(B.bumpOf('v9.0.1601: 459 drivers, 4335 FPs [skip ci]'), '9.0.1601');
    assert.strictEqual(B.bumpOf('chore(stable): v5.12.511 [skip ci]'), '5.12.511');
    assert.strictEqual(B.bumpOf('fix: TS0601 thermostat'), null);
  });

  it('never adds or removes versions and keeps human English', () => {
    const obj = { '1.0.2': { en: 'v1.0.2: automated publish, manifest sync, and Homey test promotion.' }, '1.0.1': { en: 'Radar distance re-arm and TS0043 pairing fix.' } };
    const ranges = new Map([['1.0.2', ['fix: radar presence TS0601']], ['1.0.1', ['fix: radar']]]);
    const untouched = JSON.parse(JSON.stringify(obj));
    assert.strictEqual(B.backfill(untouched, ranges).filter((c) => c.why === 'no-fr').length, 0, 'English-only kept as is by default');
    const ch = B.backfill(obj, ranges, { fillFr: true });
    assert.deepStrictEqual(Object.keys(obj).sort(), ['1.0.1', '1.0.2']);
    assert.ok(!CE.isPlaceholder(obj['1.0.2'].en));
    assert.strictEqual(obj['1.0.1'].en, 'Radar distance re-arm and TS0043 pairing fix.');
    assert.ok(obj['1.0.1'].fr);
    assert.strictEqual(ch.length, 2);
  });

  it('placeholder entries left in this branch stay under the ceiling', () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const cl = JSON.parse(fs.readFileSync(path.join(ROOT, '.homeychangelog.json'), 'utf8'));
    // Versions written after the backfill by the bump routine are outside this ratchet (CUTOFF); the ceiling covers the backlog.
    const cut = CUTOFF[app.id];
    const keys = Object.keys(cl).filter((k) => /^\d+\.\d+\.\d+$/.test(k) && (!cut || CE.cmpVer(k, cut) <= 0)).sort(CE.cmpVer);
    let left = 0;
    keys.forEach((k, i) => { if (B.needsRewrite(cl[k], cl[keys[i - 1]]) && B.needsRewrite(cl[k], cl[keys[i - 1]]) !== 'no-fr') left++; });
    const ceil = CEIL[app.id];
    if (ceil != null) assert.ok(left <= ceil, `${left} placeholder/vague entries (ceiling ${ceil})`);
  });
});

describe('P3075 changelog backfill cutoff', () => {
  it('a vague entry written after the cutoff does not break the backlog ceiling', () => {
    const cl = { '1.0.217': { en: 'x' }, '1.0.218': { en: 'Device fixes and improvements for switch (1 fix).' } };
    const kept = Object.keys(cl).filter((k) => CE.cmpVer(k, CUTOFF['com.dlnraja.tuya.zigbee.bastien']) <= 0);
    assert.deepStrictEqual(kept, ['1.0.217']);
  });
});
