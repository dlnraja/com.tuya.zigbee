'use strict';
// P3080 item 4 (t585u): issue and forum titles are summarised with topicOf instead of copied,
// and the report ratchet baseline went from 21 quoting scripts down to 1.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

describe('P3080 report ratchet batch', () => {
  it('baseline keeps at most one quoting script', () => {
    const b = JSON.parse(read('.github/report-ratchet-baseline.json'));
    assert.ok(b.quotingScripts.length <= 1, String(b.quotingScripts.length));
  });
  it('converted tools load topicOf and no longer print raw titles', () => {
    for (const f of ['.github/scripts/scan-johan-full.js', 'tools/ci/auto-bot-issue-triage.js', 'tools/ci/button-issues-deep.js',
      'tools/ci/check-open-buttons.js', 'tools/ci/temporal-cross-ref.js', 'tools/ci/forum-temporal-collect.js',
      'tools/ci/session-start.js', 'tools/ci/parse-forum-digest.js']) {
      const s = read(f);
      assert.match(s, /const \{ topicOf \} = require\('\.\.\/\.\.\/scripts\/lib\/report-writer'\)/, f);
      assert.ok(/topicOf\((?:issue|i|t|p|topic)\.title\)/.test(s), f);
      for (const old of ["') ' + i.title)", "') ' + t.title)", '${issue.title?.slice(0, 60)}', '${i.number} ${i.title}', '- ${t.title}', '"${p.title}"']) assert.ok(!s.includes(old), f + ' ' + old);
    }
  });
  it('topicOf keeps ids and themes, never the sentence', () => {
    const { topicOf } = require(path.join(ROOT, 'scripts', 'lib', 'report-writer'));
    const out = topicOf('My TS0601 thermostat stopped reporting battery since yesterday');
    assert.ok(out.includes('TS0601'));
    assert.ok(!out.includes('stopped reporting'));
  });
  it('ratchet check passes', () => {
    const { execFileSync } = require('child_process');
    execFileSync(process.execPath, [path.join(ROOT, 'scripts/ci/report-structure-ratchet.js')], { cwd: ROOT, stdio: 'pipe' });
  });
});
