'use strict';
// P3069: the publish changelog line is a short human summary (en + fr) built from our own commits,
// versions are kept newest first, existing entries are never rewritten, and the old generic
// "automated publish, manifest sync" text is never produced again.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const ce = require(path.join(ROOT, 'scripts/automation/changelog-entry.js'));
const GENERIC = /automated publish, manifest sync/i;

test('device commits give a short en + fr line with topics and counts', () => {
  const e = ce.summarize(['fix(P1): thermostat TRV setpoint DP2', 'feat(flow): plug power card', 'ci(x): summary', 'chore(ledger): data [auto:x] [skip ci]']);
  assert.match(e.en, /^Device fixes and improvements for .*thermostat.*\(1 fix, 1 improvement\)\.$/);
  assert.match(e.fr, /^Corrections et améliorations pour : .*thermostat.*\(1 correctif, 1 amélioration\)\.$/);
  assert.ok(e.en.length < 260 && e.fr.length < 260);
  assert.doesNotMatch(e.en, /`/);
});

test('internal-only commits give an honest maintenance line, never the old generic text', () => {
  const e = ce.summarize(['ci(P3069): x', 'test: y', 'docs: z']);
  assert.match(e.en, /^Maintenance release/);
  assert.match(e.fr, /^Version de maintenance/);
  for (const v of [e.en, e.fr, ce.summarize([]).en]) assert.doesNotMatch(v, GENERIC);
});

test('existing real entries are kept, placeholders are refilled, versions end newest first', () => {
  const obj = { changelog: [{ version: '1.0.0' }], '9.0.2': { en: 'Real words.' }, '9.0.10': { en: 'v9.0.10: automated publish, manifest sync, and Homey test promotion.' }, '9.0.3': { en: 'Other.' } };
  const r = ce.updateChangelog(obj, '9.0.11', ['fix: curtain motor direction']);
  assert.deepStrictEqual(Object.keys(r.obj), ['changelog', '9.0.11', '9.0.10', '9.0.3', '9.0.2']);
  assert.strictEqual(r.obj['9.0.2'].en, 'Real words.');
  assert.strictEqual(r.obj['9.0.10'].en, obj['9.0.10'].en, 'old entries stay as they are (additive)');
  assert.ok(r.obj['9.0.11'].en && r.obj['9.0.11'].fr);
  assert.ok(ce.isPlaceholder(obj['9.0.10'].en) && ce.isPlaceholder('Reliability improvements.') && !ce.isPlaceholder('Real words.'));
  for (const g of ['Bug fixes and improvements', 'v9.0.4: Bug fixes and improvements.', 'Device compatibility and reliability improvements.']) assert.ok(ce.isPlaceholder(g), g);
  const again = ce.updateChangelog(r.obj, '9.0.11', ['fix: something else']);
  assert.strictEqual(again.changed, false, 'a real entry is never rewritten');
});

test('the repo changelog is ordered newest first and the generators no longer write the generic text', () => {
  const keys = Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, '.homeychangelog.json'), 'utf8'))).filter((k) => /^\d+\.\d+\.\d+$/.test(k));
  assert.deepStrictEqual(keys, [...keys].sort((a, b) => ce.cmpVer(b, a)));
  for (const f of ['.github/workflows/auto-publish-on-push.yml', '.github/scripts/bump-homey-version.js', '.github/scripts/ensure-next-changelog.js']) {
    const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.doesNotMatch(s, GENERIC, f);
    assert.match(s, /scripts\/automation\/changelog-entry/, f);
  }
});

test('bump and ensure-next replace a generic HOMEY_CHANGELOG with our summary, keep a real one', () => {
  const { execFileSync } = require('child_process');
  const os = require('os');
  for (const [text, expectGeneric] of [['Bug fixes and improvements', false], ['TRV06 battery alarm fix.', true]]) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3069-cl-'));
    fs.writeFileSync(path.join(dir, 'app.json'), JSON.stringify({ version: '1.0.1' }));
    fs.writeFileSync(path.join(dir, '.homeychangelog.json'), JSON.stringify({ '1.0.1': { en: 'Old.' } }));
    execFileSync(process.execPath, [path.join(ROOT, '.github/scripts/ensure-next-changelog.js')], { cwd: dir, env: { ...process.env, HOMEY_CHANGELOG: text, GITHUB_OUTPUT: '' }, encoding: 'utf8' });
    const out = JSON.parse(fs.readFileSync(path.join(dir, '.homeychangelog.json'), 'utf8'));
    assert.deepStrictEqual(Object.keys(out), ['1.0.2', '1.0.1']);
    assert.strictEqual(out['1.0.1'].en, 'Old.');
    assert.strictEqual(out['1.0.2'].en === text, expectGeneric, out['1.0.2'].en);
    if (!expectGeneric) assert.ok(out['1.0.2'].fr);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('version write-back fills its entry through changelog-entry.js and keeps the file newest first', () => {
  const sh = require('fs').readFileSync(require('path').join(__dirname, '..', '..', '.github/scripts/version-writeback.sh'), 'utf8');
  assert.match(sh, /scripts\/automation\/changelog-entry\.js/);
  assert.match(sh, /updateChangelog\(c,V,/);
  assert.match(sh, /catch \(_\)/, 'old fixed text kept as fallback only');
});
