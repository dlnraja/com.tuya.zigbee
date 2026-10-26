'use strict';
// P3069 (t585u): shared CI report helper — short human summary, small table, collapsed details,
// sources as links (never pasted text), a thanks line, bounded length, no emoji walls.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const R = require(path.join(__dirname, '..', '..', 'scripts', 'lib', 'report-writer.js'));

const SRC = 'when I pair the device it shows up as a switch and the temperature never updates after a day';

test('report has marker, title, 1-2 sentence summary, table, thanks', () => {
  const md = R.createReport({ title: 'CI', summary: 'All green. Nothing to do. Extra sentence.' })
    .table(['job', 'result'], [['tests', 'OK']]).thanks('Athom').toMarkdown();
  assert.match(md, /^<!-- report-writer:v1 lang=en -->/);
  assert.match(md, /### CI\n\nAll green\. Nothing to do\.\n/);
  assert.match(md, /<details><summary>Details<\/summary>\n\nExtra sentence\./);
  assert.match(md, /\| job \| result \|/);
  assert.match(md, /\*\*Thanks\*\* — Athom\./);
  assert.deepStrictEqual(R.checkStructure(md), []);
});

test('summary is required', () => {
  assert.throws(() => R.createReport({ title: 'x' }).toMarkdown(), /summary required/);
});

test('emoji are dropped from title, summary and cells', () => {
  const md = R.createReport({ title: '🚀🔥 Publish', summary: '✅ Done.' }).table(['a'], [['❌ fail']]).toMarkdown();
  assert.ok(!/[\u{1F300}-\u{1FAFF}\u2705\u274C]/u.test(md), md);
});

test('rows are capped and the rest is announced', () => {
  const rows = Array.from({ length: 40 }, (_, i) => [i]);
  const md = R.createReport({ title: 't', summary: 's.', maxRows: 5 }).table(['n'], rows).toMarkdown();
  assert.strictEqual((md.match(/^\| \d+ \|$/gm) || []).length, 5);
  assert.match(md, /35 more rows not shown/);
});

test('sourceRef links and credits without the source words', () => {
  const s = R.sourceRef({ name: 'issue', id: 42, url: 'https://github.com/o/r/issues/42', author: 'alice', text: SRC + ' _TZE204_abcd1234 TS0601' });
  assert.strictEqual(s, 'source: [issue #42](https://github.com/o/r/issues/42) by @alice — about: switch, climate sensor, pairing — `_TZE204_abcd1234` `TS0601`');
  assert.ok(!s.includes('never updates'));
  assert.match(R.sourceRef({ name: 'forum', id: '140352/2268', author: 'x' }, 'fr'), /^source: forum #140352\/2268 par @x$/);
});

test('pasted runs from fetched sources are replaced by a placeholder', () => {
  const md = R.createReport({ title: 't', summary: 'One.', sources: [SRC] }).text(`User wrote: ${SRC}.`).toMarkdown();
  assert.ok(!md.includes('never updates after a day'), md);
  assert.match(md, /text not reproduced/);
  assert.strictEqual(R.findVerbatim('short overlap: when I pair the device', [SRC]).length, 0); // < 12 words is fine
});

test('long blockquotes and long quoted strings are flagged and sanitized', () => {
  const quote = '> ' + SRC;
  assert.strictEqual(R.findQuotedExcerpts(quote).length, 1);
  assert.strictEqual(R.findQuotedExcerpts('> short note').length, 0);
  assert.strictEqual(R.findQuotedExcerpts('```\n' + quote + '\n```').length, 0); // code fences are logs, not prose
  const { text, replaced } = R.sanitize(`a\n${quote}\nb "${SRC}"`);
  assert.strictEqual(replaced, 2);
  assert.ok(!text.includes('never updates'));
});

test('length is bounded', () => {
  const md = R.createReport({ title: 't', summary: 's.', maxChars: 500 }).text('x'.repeat(5000)).toMarkdown();
  assert.ok(md.length <= 500, String(md.length));
  assert.match(md, /truncated/);
});

test('write() appends to GITHUB_STEP_SUMMARY', () => {
  const fs = require('fs'); const os = require('os');
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rw-')), 'sum.md');
  R.createReport({ title: 't', summary: 's.', lang: 'fr' }).write({ file: f, stdout: false });
  const md = fs.readFileSync(f, 'utf8');
  assert.match(md, /\*\*Merci\*\* — /);
  assert.deepStrictEqual(R.checkStructure(md), []);
});
