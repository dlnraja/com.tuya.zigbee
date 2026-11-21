'use strict';
/**
 * P3360: the Live promote job runs on GitHub Actions, which does not ship
 * homey/services/AthomApi or homey/lib/AthomApi. The client module must load
 * anyway, and promote-live.js must talk to apps-api.athom.com with HOMEY_PAT.
 */
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P3360 Live Athom client loads in CI', () => {
  it('homey-apps-api-client can be required without throwing', () => {
    const c = require('../../.github/scripts/homey-apps-api-client');
    assert.equal(typeof c.createClient, 'function');
    assert.equal(typeof c.getBuilds, 'function');
    assert.equal(typeof c.updateBuildChannel, 'function');
    assert.equal(typeof c.sdkModulesAvailable, 'function');
  });

  it('createClient fails with ATHOM_API_MODULE_MISSING when the CLI SDK paths are absent, never a raw require() crash', async () => {
    const c = require('../../.github/scripts/homey-apps-api-client');
    if (c.sdkModulesAvailable()) {
      // Local machine with a Homey CLI install: still must export the hook.
      assert.equal(typeof c.createClient, 'function');
      return;
    }
    try {
      await c.createClient({ log() {} });
      assert.fail('createClient should reject when SDK modules are missing');
    } catch (err) {
      assert.equal(err.code, 'ATHOM_API_MODULE_MISSING');
      assert.match(String(err.message), /HOMEY_PAT|apps-api\.athom\.com/i);
      assert.doesNotMatch(String(err.message), /Cannot find module 'homey\/services\/AthomApi'/);
    }
  });

  it('promote-live.js uses HOMEY_PAT + apps-api REST and does not call createClient', () => {
    const src = fs.readFileSync(path.join(ROOT, '.github/scripts/promote-live.js'), 'utf8');
    assert.match(src, /delegation\/token/);
    assert.match(src, /apps-api\.athom\.com/);
    assert.match(src, /getDelegationToken/);
    assert.doesNotMatch(src, /require\('\.\/homey-apps-api-client'\)/);
    assert.doesNotMatch(src, /require\([^)]*homey\/services\/AthomApi/);
    assert.doesNotMatch(src, /require\([^)]*homey\/lib\/AthomApi/);
  });
});
