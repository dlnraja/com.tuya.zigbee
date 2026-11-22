'use strict';
// P3363: changelogs belong to this app, current version is present, user notes
// are en+fr and do not leak internal ids or personal names. The generator derives
// a note from commits since the previous published (or bumped) version.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { describe, it } = require('../_support/dual-runner');
const ROOT = path.join(__dirname, '..', '..');
const CC = require(path.join(ROOT, 'scripts/automation/changelog-coherence.js'));
const CE = require(path.join(ROOT, 'scripts/automation/changelog-entry.js'));

describe('P3363 changelog coherence', () => {
  it('strips foreign-app versions and keeps this app\'s keys newest first', () => {
    const obj = {
      changelog: [{ version: '9.0.1', en: 'x' }, { version: '5.12.1', en: 'y' }],
      '9.0.2': { en: 'Master note.' },
      '5.12.546': { en: 'Should leave this branch.' },
      '1.0.1': { en: 'Other app.' },
    };
    const stripped = CC.stripForeign(obj, '5.');
    assert.deepStrictEqual(Object.keys(stripped).filter((k) => /^\d/.test(k)), ['5.12.546']);
    assert.deepStrictEqual(stripped.changelog.map((e) => e.version), ['5.12.1']);
  });

  it('sanitizes personal names and internal ids from a user-facing note', () => {
    const t = CC.sanitizeUserText('Fixed TRV06 battery (P3297, GH#581, #2265). 657 dlnraja comments deleted from JohanBendz/com.tuya.zigbee.');
    assert.doesNotMatch(t, /P3297|GH#581|#2265|dlnraja/i);
    assert.match(t, /TRV06/);
  });

  it('fails the live tree when foreign versions or a missing current entry exist, and --fix removes foreign keys', () => {
    const a = CC.audit(ROOT);
    // After a fix this is empty; before, stable/bastien fail. The unit test uses a temp copy.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3363-cl-'));
    fs.copyFileSync(path.join(ROOT, 'package.json'), path.join(dir, 'package.json'));
    const composeDir = path.join(dir, '.homeycompose');
    fs.mkdirSync(composeDir);
    const id = JSON.parse(fs.readFileSync(path.join(ROOT, '.homeycompose/app.json'), 'utf8')).id;
    fs.writeFileSync(path.join(composeDir, 'app.json'), JSON.stringify({ id, version: JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'))).version, description: { en: 'x' } }));
    const pkgVer = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'))).version;
    const cl = { changelog: [], '9.0.1': { en: 'foreign' }, [pkgVer]: { en: 'ok', fr: 'ok' } };
    // If this app is 9.x, 9.0.1 is own; plant a definitely foreign key.
    cl['0.0.1'] = { en: 'foreign-other' };
    fs.writeFileSync(path.join(dir, '.homeychangelog.json'), JSON.stringify(cl, null, 2));
    const before = CC.audit(dir);
    assert.ok(before.foreignCount >= 1, JSON.stringify(before.findings));
    const applied = CC.apply(dir);
    fs.writeFileSync(path.join(dir, '.homeychangelog.json'), applied.json);
    const after = CC.audit(dir);
    assert.equal(after.foreignCount, 0);
    assert.ok(after.version && JSON.parse(fs.readFileSync(path.join(dir, '.homeychangelog.json'), 'utf8'))[after.version]);
    fs.rmSync(dir, { recursive: true, force: true });
    void a;
  });

  it('live changelog has no foreign-app versions and lists the current package version', () => {
    const a = CC.audit(ROOT);
    assert.equal(a.foreignCount, 0, JSON.stringify(a.findings));
    assert.ok(!a.findings.some((f) => f.code === 'version-mismatch'), JSON.stringify(a.findings));
    const cl = JSON.parse(fs.readFileSync(path.join(ROOT, '.homeychangelog.json'), 'utf8'));
    const keys = Object.keys(cl).filter((k) => /^\d+\.\d+\.\d+$/.test(k));
    assert.deepStrictEqual(keys, [...keys].sort((x, y) => CE.cmpVer(y, x)));
  });

  it('runtime subjects still count when the commit also has [skip ci]', () => {
    const note = CE.precise([
      'fix(drivers/power_clamp_meter): scale bidirectional clamp reports on the 3-phase profile [skip ci]',
      'chore(diag): stderr breadcrumbs for large JSON parses and capped device notes [skip ci]',
    ]);
    assert.match(note.en, /bidirectional clamp reports/);
    assert.match(note.fr, /./);
  });

  it('folds historical wide characters and translates an English leftover FR body', () => {
    const folded = CC.foldWideChars('c\u0153ur \u2192 \u2265 10');
    assert.equal(folded, 'coeur -> >= 10');
    assert.ok([...folded].every((c) => c.charCodeAt(0) <= 0xFF));
    const repaired = CC.ensureFr({
      en: 'Changed: scale bidirectional clamp reports on the 3-phase profile; stderr breadcrumbs for large JSON parses and capped device notes; keep the precise publish call the suite locks;',
      fr: 'Modifie : scale bidirectional clamp reports on the 3-phase profile; stderr breadcrumbs for large JSON parses and capped device notes; keep the precise publish call the suite locks;',
    });
    const fr = CC.accentFr(repaired.fr);
    assert.match(fr, /triphas\u00E9|born\u00E9s|verrouille/);
    assert.doesNotMatch(fr, /breadcrumbs|stderr|scale bidirectional/);
  });
});
