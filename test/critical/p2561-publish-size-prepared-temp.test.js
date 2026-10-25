'use strict';

/**
 * P2561 — publish-size-gate prefers prepared temp app.json (Contre quoi: false-fail @ 4.00MB root)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2561 publish size gate prepared-temp preference', () => {
  it('publish-size-gate prefers homey-publish-temp or HOMEY_PUBLISH_APPJSON', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts/ci/publish-size-gate.cjs'), 'utf8');
    assert.match(src, /HOMEY_PUBLISH_APPJSON/);
    assert.match(src, /homey-publish-temp/);
    assert.match(src, /preparedApp|prepared publish/i);
  });

  it('prepare-publish sets HOMEY_PUBLISH_APPJSON after compact', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts/prepare-publish.js'), 'utf8');
    assert.match(src, /HOMEY_PUBLISH_APPJSON/);
    assert.match(src, /P2561/);
  });

  it('stable Publish caps come from config/publish-caps.json: 17000 total, per driver <= 1500 (P3024b, P3036b/c measured)', () => {
    const yml = path.join(ROOT, '.github/workflows/publish-stable.yml');
    if (!fs.existsSync(yml)) {
      // master track may not ship this workflow — soft OK
      assert.ok(true);
      return;
    }
    const y = fs.readFileSync(yml, 'utf8');
    assert.doesNotMatch(y, /HOMEY_ZIGBEE_MAX_TOTAL_COMBOS:\s*"\d+"/, 'P3036c: no cap in the workflow');
    const caps = require(path.join(ROOT, 'scripts', 'lib', 'publish-caps.cjs')).loadPublishCaps({ root: ROOT, env: {} });
    assert.strictEqual(caps.maxTotalCombos, 17000);
    assert.ok(caps.maxDriverCombos > 0 && caps.maxDriverCombos <= 1500, String(caps.maxDriverCombos));
  });
});
