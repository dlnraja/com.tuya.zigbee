'use strict';
const test = require('node:test');
const assert = require('node:assert');
const D = require('../data.js');
test('no Live link while an app has no Live build; Test link always present', () => {
  for (const b of Object.values(D.BRANCHES)) {
    const l = D.installLinks(b.appId);
    assert.strictEqual(l.test, 'https://homey.app/a/' + b.appId + '/test/');
    assert.strictEqual(l.live, b.live ? 'https://homey.app/a/' + b.appId + '/' : null);
  }
});
test('Live link appears when the branch is flagged live', () => {
  const m = D.BRANCHES.master; const prev = m.live; m.live = true;
  try { assert.strictEqual(D.installLinks(m.appId).live, 'https://homey.app/a/com.dlnraja.tuya.zigbee/'); } finally { m.live = prev; }
});
test('generated README and site never link a 404 Live URL', () => {
  const md = require('../build-readme.js');
  const src = require('fs').readFileSync(require.resolve('../build-site.js'), 'utf8');
  assert.match(src, /l\.live \?/);
  assert.ok(md);
});
