'use strict';
// P3069 (t585u): ratchet — no new workflow without an "about" header, no new script pasting
// third-party titles/bodies into reports, no new long quoted excerpt in docs, helper reports keep their shape.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const G = require(path.join(__dirname, '..', '..', 'scripts', 'ci', 'report-structure-ratchet.js'));
const base = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '.github', 'report-ratchet-baseline.json'), 'utf8'));

test('repository is at or below the baseline', () => {
  const errs = G.compare(G.collect(), base);
  assert.deepStrictEqual(errs, []);
});

test('regressions are caught', () => {
  const cur = { workflowsWithoutAbout: ['new.yml'], quotingScripts: [{ file: 'scripts/x.js', lines: 1 }], docExcerpts: { 'docs/knowledge/X.md': 2 }, brokenReports: [{ file: 'r.md', problems: ['missing thanks/credits line'] }] };
  const errs = G.compare(cur, { workflowsWithoutAbout: [], quotingScripts: [], docExcerpts: { 'docs/knowledge/X.md': 1 } });
  assert.strictEqual(errs.length, 4, errs.join('\n'));
});

test('quote detector: third-party fields yes, our own helpers no', () => {
  assert.ok(G.QUOTE_RE.test('L.push(`- [#${it.number}](${it.html_url}) ${it.title}`)'));
  assert.ok(G.QUOTE_RE.test('const t = `${p.cooked}`;'));
  assert.ok(!G.QUOTE_RE.test('L.push(`- ${sourceRef(x)}`)'));
  assert.ok(!G.QUOTE_RE.test('const t = `${report.title}`;'));
});

test('baseline may only shrink (no file listed that is now clean is required to stay)', () => {
  const cur = G.collect();
  assert.ok(cur.workflowsWithoutAbout.length <= base.workflowsWithoutAbout.length);
  assert.ok(cur.quotingScripts.length <= base.quotingScripts.length);
});
