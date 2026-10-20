'use strict';
// P2902: Athom processing_failed gives no error body. The payload preflight must catch
// locally what we can check, and direct-api-publish must keep a usable token after polling.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { preflight } = require('../../scripts/ci/payload-preflight.cjs');

function png(w, h) {
  const b = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20);
  return b;
}
function fixture(mut) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-'));
  const w = (rel, c) => { fs.mkdirSync(path.dirname(path.join(d, rel)), { recursive: true }); fs.writeFileSync(path.join(d, rel), c); };
  const app = { id: 'x', drivers: [{ id: 'a', images: { small: '/drivers/a/assets/images/small.png', large: '/drivers/a/assets/images/large.png' } }],
    flow: { actions: [{ id: 'c1', args: [{ name: 'device', type: 'device', filter: 'driver_id=a' }] }] } };
  w('drivers/a/driver.js', "require('../../lib/ok');");
  w('drivers/a/device.js', '//');
  w('lib/ok.js', '//');
  w('drivers/a/assets/images/small.png', png(75, 75));
  w('drivers/a/assets/images/large.png', png(500, 500));
  w('locales/en.json', '{}');
  if (mut) mut(app, w);
  w('app.json', JSON.stringify(app));
  return d;
}
test('clean payload passes', () => assert.deepStrictEqual(preflight(fixture()).errors, []));
test('catches unresolved require, bad image, duplicate flow id, non-ASCII path', () => {
  const r = preflight(fixture((app, w) => {
    w('drivers/a/driver.js', "require('../../lib/missing');");
    w('drivers/a/assets/images/large.png', png(400, 400));
    app.flow.actions.push({ id: 'c1' });
    w('drivers/a/assets/é.svg', '<svg/>');
  }));
  const all = r.errors.join('\n');
  assert.match(all, /unresolved require/);
  assert.match(all, /400x400/);
  assert.match(all, /duplicate flow actions id: c1/);
  assert.match(all, /non-ASCII/);
});
test('try-guarded optional require is only a warning', () => {
  const r = preflight(fixture((app, w) => w('lib/ok.js', "try { require('./ci-only'); } catch (e) {}")));
  assert.deepStrictEqual(r.errors, []);
  assert.ok(r.warns.some((x) => /optional require/.test(x)));
});
test('malformed device filters are flagged', () => {
  const r = preflight(fixture((app) => { app.flow.actions[0].args[0].filter = 'driver_id=a|driver_id=b'; }));
  assert.ok(r.warns.some((x) => /malformed device filter/.test(x)));
});
test('repo flow cards use valid device filter syntax', () => {
  for (const f of ['knob_rotated.json']) assert.doesNotMatch(fs.readFileSync(path.join(__dirname, '../../.homeycompose/flow/triggers', f), 'utf8'), /driver_id=[^"&]*,/);
  for (const f of ['set_power_on_behavior.json', 'set_software_child_lock.json']) {
    assert.doesNotMatch(fs.readFileSync(path.join(__dirname, '../../.homeycompose/flow/actions', f), 'utf8'), /\|driver_id=/);
  }
});
test('direct-api-publish refreshes token, dumps raw failed build, runs preflight', () => {
  const s = fs.readFileSync(path.join(__dirname, '../../scripts/direct-api-publish.js'), 'utf8');
  assert.match(s, /AUTH_EXPIRED_RE/);
  assert.match(s, /refreshAuth/);
  assert.match(s, /dumpFailedBuild/);
  assert.match(s, /runPreflight\(appPath\)/);
});
