'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

describe('P2830d prune undeclared pair/repair views (publish payload only)', () => {
  it('removes only html views the driver does not declare', () => {
    const { pruneUndeclaredViews } = require('../../scripts/maintenance/prune-publish-payload.cjs');
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'p2830d-'));
    const mk = (rel, c = 'x') => { const f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c); };
    fs.writeFileSync(path.join(root, 'app.json'), JSON.stringify({ drivers: [
      { id: 'a', pair: [{ id: 'list_devices', template: 'list_devices' }, { id: 'select_driver' }], repair: [{ id: 'configure' }] },
      { id: 'b' },
    ] }));
    mk('drivers/a/pair/select_driver.html'); mk('drivers/a/pair/select-driver.html'); mk('drivers/a/pair/notes.txt');
    mk('drivers/a/repair/configure.html'); mk('drivers/a/repair/old.html');
    mk('drivers/b/pair/anything.html');
    const removed = { bytes: 0, count: 0, samples: [] };
    pruneUndeclaredViews(root, removed);
    const has = (r) => fs.existsSync(path.join(root, r));
    assert.ok(has('drivers/a/pair/select_driver.html'));
    assert.ok(!has('drivers/a/pair/select-driver.html'));
    assert.ok(has('drivers/a/pair/notes.txt'), 'non-html untouched');
    assert.ok(has('drivers/a/repair/configure.html'));
    assert.ok(!has('drivers/a/repair/old.html'));
    assert.ok(has('drivers/b/pair/anything.html'), 'drivers without declared views are never pruned');
    assert.equal(removed.count, 2);
    fs.rmSync(root, { recursive: true, force: true });
  });
});
