'use strict';
// P3297: stable 5.12.545 / 5.12.546 / 5.12.548 carried "Reliability: N small fixes" or "Maintenance build: same
// devices ... (tooling only)" although runtime fixes shipped (power_clamp_meter scaling, diag breadcrumbs,
// flow card titles). stable-version-bump.js wrote the note with changelog-backfill.describe() directly and
// skipped changelog-entry.precise(), which names the runtime commits when describe() can only count them.
const { describe, it, before, after } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const { entryFromCommits } = require(path.join(ROOT, '.github/scripts/stable-version-bump.js'));
const ce = require(path.join(ROOT, 'scripts/automation/changelog-entry'));
const GENERIC = /^(Reliability: \d+ small fix|Maintenance build: same devices)/i;

function repo(subjects) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3297-'));
  const git = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'pipe', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@example.invalid', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@example.invalid' } });
  git('init', '-q');
  for (const s of subjects) { git('commit', '-q', '--allow-empty', '--no-verify', '-m', s); }
  return dir;
}

describe('P3297 stable bump note names the runtime changes', () => {
  const dirs = [];
  after(() => { for (const d of dirs) { fs.rmSync(d, { recursive: true, force: true }); } });

  it('5.12.545 range: power_clamp_meter fix + diag breadcrumbs are named, not counted', () => {
    const d = repo(['chore(stable): v5.12.544 [skip ci]',
      'fix(changelog): refuse stock filler in the publish path',
      'chore(diag): stderr breadcrumbs for large JSON parses and capped device notes',
      'fix(drivers/power_clamp_meter): scale bidirectional clamp reports on the 3-phase profile']);
    dirs.push(d);
    const e = entryFromCommits(d, ce);
    assert.ok(!GENERIC.test(e.en), e.en);
    assert.match(e.en, /clamp/i);
    assert.ok(e.fr && e.fr.length > 10);
  });

  it('5.12.548 range: flow card fix is named', () => {
    const d = repo(['chore(stable): v5.12.547 [skip ci]',
      'fix(flow): give the warned cards a titleFormatted and refuse a compose publish dir',
      'fix(publish): stage the prepared directory and leave compose out of it',
      'test(flow): IR cards name their arguments and not the device']);
    dirs.push(d);
    const e = entryFromCommits(d, ce);
    assert.ok(!GENERIC.test(e.en), e.en);
    assert.match(e.en, /titleFormatted|flow/i);
  });

  it('a range with only tests and CI keeps the honest maintenance note', () => {
    const d = repo(['chore(stable): v5.12.550 [skip ci]', 'test(ci): lock a gate', 'ci: rename a step']);
    dirs.push(d);
    const e = entryFromCommits(d, ce);
    assert.ok(e.en && !ce.isPlaceholder(e.en), e.en);
  });
});
