'use strict';
// P3075: forum search tools print a link + topic (never the other person's title), and the
// reports inventory lists every guard step, including the P3074 personal-data guard.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const R = require(path.join(ROOT, 'scripts', 'ci', 'report-structure-ratchet.js'));

describe('P3075 forum links + guard inventory', () => {
  it('search-forum scripts no longer interpolate topic titles', () => {
    const left = R.scanScripts().filter((x) => /tools\/ci\/search-forum/.test(x.file));
    assert.deepStrictEqual(left, []);
    for (const f of ['search-forum.js', 'search-forum-v2.js']) {
      assert.match(fs.readFileSync(path.join(ROOT, 'tools', 'ci', f), 'utf8'), /linkRef\(/, f);
    }
  });

  it('inventory names the personal-data guard step', () => {
    const md = R.inventoryMarkdown(R.collect());
    assert.match(md, /Safety guard steps/);
    if (fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'code-quality.yml'), 'utf8').includes('personal-data guard')) {
      assert.match(md, /code-quality\.yml` — P3074 personal-data guard/);
    }
    const doc = fs.readFileSync(path.join(ROOT, 'docs', 'knowledge', 'GHA_REPORTS_INVENTORY.md'), 'utf8');
    assert.match(doc, /personal-data guard/);
  });
});
