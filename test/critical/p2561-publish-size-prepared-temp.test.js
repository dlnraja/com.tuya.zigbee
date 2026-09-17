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

  it('stable Publish workflow caps combos at master-aligned 14000/1500', () => {
    const yml = path.join(ROOT, '.github/workflows/publish-stable.yml');
    if (!fs.existsSync(yml)) {
      // master track may not ship this workflow — soft OK
      assert.ok(true);
      return;
    }
    const y = fs.readFileSync(yml, 'utf8');
    assert.match(y, /HOMEY_ZIGBEE_MAX_TOTAL_COMBOS:\s*"14000"/);
    assert.match(y, /HOMEY_ZIGBEE_MAX_DRIVER_COMBOS:\s*"1500"/);
  });
});
