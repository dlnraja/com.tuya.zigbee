'use strict';
/**
 * P3330 - Athom driver-count ceiling (user 15/11/2026: fix the AggregateErrors of apps above ~345 drivers).
 * Every master upload with 348+ drivers since 21/10/2026 was refused (AggregateError); 347 reached Test.
 * The pre-upload guard (shared by every publish path of the three apps) must block an upload above the
 * per-app ceiling BEFORE Athom, and the env may only lower the ceiling, never raise it.
 */
const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..');
const GUARD = path.join(ROOT, '.github', 'scripts', 'pre-upload-completeness-guard.js');
const guard = require(GUARD);

const tmp = [];
function w(root, rel, data) { const f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, data); }
function makePkg(appId, n) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'p3330-'));
  tmp.push(root);
  const ids = Array.from({ length: n }, (_, i) => `d_${i}`);
  w(root, 'app.json', JSON.stringify({ id: appId, version: '9.9.9', images: { small: '/assets/images/small.png' }, drivers: ids.map((id) => ({ id, images: { small: `/drivers/${id}/assets/images/small.png` } })) }));
  w(root, 'app.js', "'use strict';\nmodule.exports = 1;\n");
  w(root, 'lib/blob.bin', crypto.randomBytes(1600 * 1024));
  w(root, 'assets/images/small.png', crypto.randomBytes(64));
  for (const id of ids) {
    w(root, `drivers/${id}/driver.js`, 'module.exports = 1;\n');
    w(root, `drivers/${id}/device.js`, 'module.exports = 1;\n');
    w(root, `drivers/${id}/assets/images/small.png`, crypto.randomBytes(16));
  }
  return root;
}
const ceilingErrors = (root, appId, env = {}) => guard.check(root, { appId, env }).errors.filter((e) => /ceiling/.test(e));

describe('P3330 Athom driver-count ceiling', () => {
  after(() => { for (const d of tmp) fs.rmSync(d, { recursive: true, force: true }); });

  it('master and stable are capped at the proven 347; bastien and unknown apps have no ceiling', () => {
    assert.equal(guard.driverCeiling('com.dlnraja.tuya.zigbee', {}), 347);
    assert.equal(guard.driverCeiling('com.dlnraja.tuya.zigbee.stable', {}), 347);
    assert.equal(guard.driverCeiling('com.dlnraja.tuya.zigbee.bastien', {}), null);
  });

  it('the env can only lower a ceiling, never raise it', () => {
    assert.equal(guard.driverCeiling('com.dlnraja.tuya.zigbee', { ATHOM_MAX_UPLOAD_DRIVERS: '400' }), 347);
    assert.equal(guard.driverCeiling('com.dlnraja.tuya.zigbee', { ATHOM_MAX_UPLOAD_DRIVERS: '300' }), 300);
    assert.equal(guard.driverCeiling('com.dlnraja.tuya.zigbee', { ATHOM_MAX_UPLOAD_DRIVERS: 'x' }), 347);
  });

  it('a 348-driver master package is blocked before upload; 347 passes the ceiling', () => {
    assert.match(ceilingErrors(makePkg('com.dlnraja.tuya.zigbee', 348), 'com.dlnraja.tuya.zigbee').join('\n'), /348 drivers > Athom ceiling 347/);
    assert.deepEqual(ceilingErrors(makePkg('com.dlnraja.tuya.zigbee', 347), 'com.dlnraja.tuya.zigbee'), []);
  });

  it('the ceiling is enforced on the id inside app.json even when the caller passes no app id', () => {
    const root = makePkg('com.dlnraja.tuya.zigbee.stable', 348);
    assert.match(ceilingErrors(root, '').join('\n'), /ceiling 347/);
  });

  it('the evidence file documents the same ceiling', () => {
    const doc = fs.readFileSync(path.join(ROOT, 'docs', 'knowledge', 'athom-driver-ceiling.md'), 'utf8');
    assert.match(doc, /ceiling[^\n]*347/i);
    assert.match(doc, /#3706/);
  });
});
