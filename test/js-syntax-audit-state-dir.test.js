'use strict';
// P3049: js-syntax-audit must not crash when .github/state is missing (pr-gate ENOENT on master).
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

describe('P3049 js-syntax-audit without .github/state', function () {
  this.timeout(20000);
  it('creates the state dir and writes the report', function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'p3049-'));
    fs.mkdirSync(path.join(root, 'tools', 'ci'), { recursive: true });
    fs.copyFileSync(path.join(__dirname, '..', 'tools', 'ci', 'js-syntax-audit.js'), path.join(root, 'tools', 'ci', 'js-syntax-audit.js'));
    fs.writeFileSync(path.join(root, 'ok.js'), "'use strict';\nmodule.exports = 1;\n");
    const r = spawnSync(process.execPath, [path.join(root, 'tools', 'ci', 'js-syntax-audit.js')], { encoding: 'utf8' });
    assert.strictEqual(r.status, 0, r.stderr);
    const out = JSON.parse(fs.readFileSync(path.join(root, '.github', 'state', 'js-syntax-audit.json'), 'utf8'));
    assert.strictEqual(out.bad.length, 0);
    assert.ok(out.total >= 2);
    fs.rmSync(root, { recursive: true, force: true });
  });
});
