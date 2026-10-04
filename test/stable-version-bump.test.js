'use strict';
/* eslint-env mocha */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { nextPatch, cmp, setVersion } = require('../.github/scripts/stable-version-bump');

describe('stable publish version bump (re-upload of an existing version is rejected by Homey)', () => {
  it('bumps the patch and orders versions', () => {
    assert.strictEqual(nextPatch('5.12.359'), '5.12.360');
    assert.ok(cmp('5.12.360', '5.12.359') > 0);
    assert.ok(cmp('5.12.99', '5.12.100') < 0);
  });
  it('writes the version into a publish dir, keeps app.json minified, the app id and a changelog entry', () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'svb-'));
    fs.writeFileSync(path.join(d, 'app.json'), `${JSON.stringify({ id: 'com.dlnraja.tuya.zigbee.stable', version: '5.12.359' })}\n`);
    fs.writeFileSync(path.join(d, 'package.json'), `${JSON.stringify({ name: 'x', version: '5.12.359' }, null, 2)}\n`);
    fs.writeFileSync(path.join(d, '.homeychangelog.json'), `${JSON.stringify({ '5.12.359': { en: 'a' } }, null, 2)}\n`);
    setVersion(d, '5.12.360', { manifestsOnly: true });
    const raw = fs.readFileSync(path.join(d, 'app.json'), 'utf8');
    assert.ok(!/\n\s+"/.test(raw), 'app.json stays minified');
    const app = JSON.parse(raw);
    assert.strictEqual(app.version, '5.12.360');
    assert.strictEqual(app.id, 'com.dlnraja.tuya.zigbee.stable');
    assert.strictEqual(JSON.parse(fs.readFileSync(path.join(d, 'package.json'), 'utf8')).version, '5.12.360');
    assert.ok(JSON.parse(fs.readFileSync(path.join(d, '.homeychangelog.json'), 'utf8'))['5.12.360'].en);
  });
});
