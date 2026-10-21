'use strict';
const assert = require('assert');
const G = require('../tools/ci/test-pairing-gate');

describe('P2940 test pairing gate', () => {
  it('maps lib modules, index files and driver folders to the name a test must mention', () => {
    assert.strictEqual(G.subjectOf('lib/buttons/ButtonEventRouter.js'), 'ButtonEventRouter');
    assert.strictEqual(G.subjectOf('lib/zigbee/cluster/index.js'), 'cluster');
    assert.strictEqual(G.subjectOf('drivers/heiman_siren/device.js'), 'heiman_siren');
    assert.strictEqual(G.subjectOf('drivers/heiman_siren/driver.compose.json'), null);
    assert.strictEqual(G.subjectOf('lib/x/foo.test.js'), null);
    assert.strictEqual(G.subjectOf('scripts/a.js'), null);
  });
  it('flags only untested files', () => {
    const rows = G.evaluate([{ status: 'A', file: 'lib/a/Foo.js' }, { status: 'M', file: 'lib/a/Bar.js' }, { status: 'A', file: 'README.md' }], "require('../lib/a/Bar')");
    assert.deepStrictEqual(rows.map((r) => [r.subject, r.tested]), [['Foo', false], ['Bar', true]]);
  });
  it('report-only until the switch date, then blocking on new files; explicit mode wins', () => {
    assert.strictEqual(G.resolveMode(null, undefined, '2026-10-21'), 'report');
    assert.strictEqual(G.resolveMode(null, undefined, G.BLOCK_NEW_FROM), 'block-new');
    assert.strictEqual(G.resolveMode('report', 'block-new', '2030-01-01'), 'report');
    assert.strictEqual(G.resolveMode(null, 'block-new', '2026-10-21'), 'block-new');
    assert.strictEqual(G.resolveMode('bogus', undefined, '2026-10-21'), 'report');
  });
});
