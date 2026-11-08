'use strict';
// The stable publish log looked like "5.12 would replace soaking 9.0 Test".
// The app ids are different. A 5.x publish of the stable id must not be
// refused because Universal Tuya Test is 9.x. Publishing the master id
// while that Test line is 9.x must still be refused.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { decideSoak, UNIVERSAL_TUYA, STABLE_APP } = require('../../.github/scripts/refuse-stable-test-overwrite');

const ROOT = path.join(__dirname, '..', '..');

describe('P3277 publish target identity', () => {
  it('keeps the stable id, the 5.x line, and the existing store name', () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, '.homeycompose/app.json'), 'utf8'));
    assert.equal(app.id, STABLE_APP);
    assert.equal(app.id, 'com.dlnraja.tuya.zigbee.stable');
    assert.match(app.version, /^5\./);
    assert.equal(app.name.en, 'Tuya Unified (Stable)');
  });

  it('does not block the stable or bastien id because Universal Tuya Test is 9.x', () => {
    assert.deepEqual(decideSoak({ appId: STABLE_APP, testVersion: '9.0.1615' }), {
      skip: false, reason: 'distinct_app_id',
    });
    assert.deepEqual(decideSoak({ appId: 'com.dlnraja.tuya.zigbee.bastien', testVersion: '9.0.1615' }), {
      skip: false, reason: 'distinct_app_id',
    });
  });

  it('still refuses a publish into Universal Tuya while its Test line is 9.x or unknown', () => {
    assert.equal(UNIVERSAL_TUYA, 'com.dlnraja.tuya.zigbee');
    assert.deepEqual(decideSoak({ appId: UNIVERSAL_TUYA, testVersion: '9.0.1615' }), {
      skip: true, reason: 'test_is_9.0.1615',
    });
    assert.deepEqual(decideSoak({ appId: UNIVERSAL_TUYA, testVersion: '' }), {
      skip: true, reason: 'unknown_test_version',
    });
    assert.deepEqual(decideSoak({ appId: UNIVERSAL_TUYA, testVersion: '5.12.544' }), {
      skip: false, reason: 'test_is_5.12.544',
    });
  });

  it('the workflow summary no longer calls an allowed stable publish a 9.0 overwrite', () => {
    const yml = fs.readFileSync(path.join(ROOT, '.github/workflows/publish-stable.yml'), 'utf8');
    assert.equal(yml.includes('5.12.x cannot overwrite soaking 9.0'), false);
    assert.match(yml, /A 9\.x Test build does not block this 5\.x publish/);
    assert.match(yml, /app_id: com\.dlnraja\.tuya\.zigbee\.stable/);
  });
});
