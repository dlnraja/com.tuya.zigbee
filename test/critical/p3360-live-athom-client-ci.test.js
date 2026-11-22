'use strict';
/**
 * P3360: Live promote must use the same Homey CLI AthomApi path as Auto-Publish
 * (homey@4.4.1, HOMEY_PAT as AthomCloudAPIToken, audience 'apps'). The client
 * module must still load when those packages are missing.
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
      assert.equal(typeof c.createClient, 'function');
      return;
    }
    try {
      await c.createClient({ log() {} });
      assert.fail('createClient should reject when SDK modules are missing');
    } catch (err) {
      assert.equal(err.code, 'ATHOM_API_MODULE_MISSING');
      assert.match(String(err.message), /homey@4\.4\.1|not installed/i);
      assert.doesNotMatch(String(err.message), /Cannot find module 'homey\/services\/AthomApi'/);
    }
  });

  it('promote-live.js prefers HomeySDK createClient (Auto-Publish path) and keeps REST as fallback', () => {
    const src = fs.readFileSync(path.join(ROOT, '.github/scripts/promote-live.js'), 'utf8');
    assert.match(src, /homey-apps-api-client/);
    assert.match(src, /sdkModulesAvailable\(\)/);
    assert.match(src, /Client\.createClient/);
    assert.match(src, /Client\.getBuilds/);
    assert.match(src, /Client\.updateBuildChannel/);
    assert.match(src, /HOMEY_PAT_NOT_LOGGED_IN/);
    assert.match(src, /getDelegationToken/);
    assert.match(src, /apps-api\.athom\.com/);
    assert.doesNotMatch(src, /require\([^)]*homey\/services\/AthomApi/);
    assert.doesNotMatch(src, /require\([^)]*homey\/lib\/AthomApi/);
  });

  it('promote-live.yml installs pinned homey@4.4.1 and checks the AthomApi module loads', () => {
    const yml = fs.readFileSync(path.join(ROOT, '.github/workflows/promote-live.yml'), 'utf8');
    assert.match(yml, /homey@4\.4\.1/);
    assert.match(yml, /Homey AthomApi module load/);
    assert.match(yml, /sdkModulesAvailable/);
    assert.match(yml, /HOMEY_HEADLESS: '1'/);
    assert.match(yml, /dry_run/);
  });

  it('createClient fails closed with HOMEY_PAT_NOT_LOGGED_IN instead of interactive login', () => {
    const src = fs.readFileSync(path.join(ROOT, '.github/scripts/homey-apps-api-client.js'), 'utf8');
    assert.match(src, /isLoggedIn/);
    assert.match(src, /HOMEY_PAT_NOT_LOGGED_IN/);
    assert.match(src, /not starting interactive login/);
    assert.doesNotMatch(src, /AthomApi\.login\(/);
  });
});
