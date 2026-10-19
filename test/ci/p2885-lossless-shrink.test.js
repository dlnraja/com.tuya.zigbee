'use strict';
// P2885: lossless shrink of the prepared publish dir (JSON minify + proven-unreferenced lib JS).
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const S = require('../../scripts/maintenance/lossless-shrink-payload.cjs');

function fixture(extra = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'p2885-fx-'));
  const files = {
    'app.json': '{"id":"x"}',
    'app.js': "const a = require('./lib/a');\nconst name = 'mentioned_mod';\nmodule.exports = a;\n",
    'lib/a.js': "module.exports = require('./a2');\n",
    'lib/a2.js': 'module.exports = 2;\n',
    'lib/dead.js': "module.exports = require('./deadchild');\n",
    'lib/deadchild.js': 'module.exports = 0;\n',
    'lib/mentioned_mod.js': 'module.exports = 3;\n',
    'lib/clusters/Unused.js': 'module.exports = 4;\n',
    'drivers/d1/driver.js': "module.exports = require('../../lib/a');\n",
    'drivers/d1/device.js': 'module.exports = 1;\n',
    'data/x.json': JSON.stringify({ a: [1, 2, { b: 'é' }], c: null }, null, 2),
    'drivers/d1/driver.compose.json': JSON.stringify({ k: 1 }, null, 2),
    ...extra,
  };
  for (const [rel, body] of Object.entries(files)) {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, body);
  }
  return root;
}

describe('P2885 lossless-shrink-payload', () => {
  it('minifies JSON in runtime data dirs only, with identical parse result', () => {
    const root = fixture();
    const before = JSON.parse(fs.readFileSync(path.join(root, 'data/x.json'), 'utf8'));
    const r = S.minifyJson(root, false);
    assert.strictEqual(r.files, 1);
    const raw = fs.readFileSync(path.join(root, 'data/x.json'), 'utf8');
    assert.ok(!raw.includes('\n'));
    assert.deepStrictEqual(JSON.parse(raw), before);
    assert.ok(fs.readFileSync(path.join(root, 'drivers/d1/driver.compose.json'), 'utf8').includes('\n'), 'drivers untouched');
  });

  it('drops only unreached and unmentioned lib JS; keeps lib/clusters and mentioned files', () => {
    const root = fixture();
    const r = S.pruneJs(root, false);
    assert.deepStrictEqual(r.files.sort(), ['lib/dead.js', 'lib/deadchild.js']);
    assert.strictEqual(r.dropped, 2);
    for (const k of ['lib/a.js', 'lib/a2.js', 'lib/mentioned_mod.js', 'lib/clusters/Unused.js']) {
      assert.ok(fs.existsSync(path.join(root, k)), k);
    }
    assert.ok(!fs.existsSync(path.join(root, 'lib/dead.js')));
  });

  it('skips JS pruning entirely on an unreviewed dynamic require', () => {
    const root = fixture({ 'drivers/d1/device.js': 'const p = "../../lib/" + process.env.X;\nmodule.exports = require(p);\n' });
    const r = S.pruneJs(root, false);
    assert.strictEqual(r.dropped, 0);
    assert.match(r.skipped, /unreviewed dynamic/);
    assert.ok(fs.existsSync(path.join(root, 'lib/dead.js')));
  });

  it('restores every pruned file when the load check finds a new missing module', () => {
    const root = fixture({
      'drivers/d1/device.js': "const P = '../../lib/' + 'd' + 'd';\nmodule.exports = require(P);\n",
      'lib/dd.js': 'module.exports = 9;\n',
    });
    const key = 'drivers/d1/device.js|P';
    S.REVIEWED_DYNAMIC.add(key);
    try {
      const r = S.pruneJs(root, false);
      assert.strictEqual(r.dropped, 0);
      assert.match(r.skipped, /restored/);
      for (const k of ['lib/dd.js', 'lib/dead.js', 'lib/deadchild.js']) assert.ok(fs.existsSync(path.join(root, k)), k);
    } finally {
      S.REVIEWED_DYNAMIC.delete(key);
    }
  });

  it('dry run changes nothing', () => {
    const root = fixture();
    S.minifyJson(root, true);
    const r = S.pruneJs(root, true);
    assert.strictEqual(r.candidates, 2);
    assert.ok(fs.existsSync(path.join(root, 'lib/dead.js')));
    assert.ok(fs.readFileSync(path.join(root, 'data/x.json'), 'utf8').includes('\n'));
  });
});
