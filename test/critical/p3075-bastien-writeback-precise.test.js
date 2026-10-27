'use strict';
// P3075: the bastien bump and the write-back after Test write a precise en/fr note from our own
// commits (families, model ids), and a version stops at the previous "chore(version): vX" commit.
const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..');
const CE = require(path.join(ROOT, 'scripts', 'automation', 'changelog-entry.js'));
const B = require(path.join(ROOT, 'scripts', 'automation', 'changelog-backfill.js'));
const GENERIC = /Bug fixes and improvements|Device database and reliability updates|^Device fixes and improvements/i;

describe('P3075 bastien write-back precise notes', () => {
  it('writes a precise note in both languages that the backlog check accepts', () => {
    const e = CE.precise(['feat(P1): wall switch backlight mode', 'fix(P2): ZG-301Z repeated DP burst', 'test: x']);
    assert.ok(e.en && e.fr);
    assert.doesNotMatch(e.en, GENERIC);
    assert.match(e.en, /ZG-301Z/);
    assert.strictEqual(B.needsRewrite(e), null, e.en);
    const obj = { '1.0.1': { en: 'Old real words kept as they are.', fr: 'Ancien texte gardé.' } };
    const r = CE.updateChangelog(obj, '1.0.2', ['fix(P3): TS0201 climate sensor humidity']);
    assert.match(r.obj['1.0.2'].en, /TS0201/);
    assert.strictEqual(r.obj['1.0.1'].en, 'Old real words kept as they are.');
  });

  it('a version stops at the previous write-back commit', () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'p3075wb-'));
    const g = (...a) => execFileSync('git', a, { cwd: d, stdio: 'pipe' });
    g('init', '-q'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't');
    for (const m of ['fix(P0): old TS0601 thing', 'chore(version): v1.0.217 written back after Test [skip ci]', 'fix(P4): TS011F plug energy']) {
      g('commit', '-q', '--allow-empty', '-m', m);
    }
    assert.deepStrictEqual(CE.subjectsSinceLastPublish(d), ['fix(P4): TS011F plug energy']);
    fs.rmSync(d, { recursive: true, force: true });
  });

  it('every bastien changelog writer goes through the precise path', () => {
    const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const f of ['.github/scripts/bump-homey-version.js', '.github/scripts/ensure-next-changelog.js']) {
      assert.match(rd(f), /ce\.precise\(ce\.subjectsSinceLastPublish\(\)\)/, f);
      assert.doesNotMatch(rd(f), /ce\.summarize\(/, f);
    }
    assert.match(rd('.github/scripts/version-writeback.sh'), /updateChangelog\(c,V,ce\.subjectsSinceLastPublish\(\)\)/);
    assert.match(rd('scripts/automation/changelog-entry.js'), /obj\[version\] = precise\(subjects\)/);
  });
});
