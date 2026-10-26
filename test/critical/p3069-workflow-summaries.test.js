'use strict';
// P3069 step 2: workflows migrated to the shared report helper keep a short summary that is
// written on success AND failure, and never die when the helper file is missing.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const MIGRATED = ['ci-self-check.yml', 'node22-tests.yml', 'validate.yml', 'homey-app-validate.yml',
  'publish.yml', 'publish-stable.yml', 'bastien-publish.yml', 'auto-publish-on-push.yml', 'draft-to-test.yml', 'draft-to-test-fleet.yml'];

for (const wf of MIGRATED) {
  test(`${wf}: summary goes through report-writer, always, with a guard`, () => {
    const p = path.join(ROOT, '.github', 'workflows', wf);
    if (!fs.existsSync(p)) return;
    const src = fs.readFileSync(p, 'utf8');
    assert.match(src, /node scripts\/lib\/report-writer\.js --title/);
    assert.match(src, /\[ -f scripts\/lib\/report-writer\.js \]/);
    const steps = src.split(/\n\s+- name: /).filter((b) => /report-writer\.js --title/.test(b));
    for (const b of steps) assert.match(b, /if: always\(\)/, `${wf}: summary step must run on failure too`);
  });
}

test('report-writer CLI output is short and carries the marker', () => {
  const { execFileSync } = require('child_process');
  const out = execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'lib', 'report-writer.js'),
    '--title', 'X', '--summary', 'All good.', '--headers', 'a|b', '--row', '1|2', '--thanks', 'Mocha'], { encoding: 'utf8' });
  assert.match(out, /^<!-- report-writer:v1/);
  assert.ok(out.split('\n').length < 20, out);
});

test('auto-publish-on-push: first-line picks use awk, not head, under pipefail (no SIGPIPE 141)', () => {
  const p = path.join(ROOT, '.github', 'workflows', 'auto-publish-on-push.yml');
  if (!fs.existsSync(p)) return;
  const src = fs.readFileSync(p, 'utf8');
  assert.ok(!/(?:NEXT|BACKOFF_S)=\/\/p' \| head -1/.test(src));
  assert.ok(!/failed_build_id\)=\[0-9\]\+' "\$OUT" \| head -1/.test(src));
});
