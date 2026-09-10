'use strict';

/**
 * P2454 — package-lock must never stamp nested deps with Homey app version
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const {
  assertPackageLockIntegrity,
  syncRootPackageVersion,
} = require('../../tools/ci/sync-root-package-version');

describe('P2454 — package-lock root-only version sync', () => {
  it('current repo lock is clean', () => {
    assert.doesNotThrow(() => assertPackageLockIntegrity());
  });

  it('syncRootPackageVersion refuses nested app-version stamps', () => {
    const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'p2454-'));
    const appVer = '9.0.999';
    fs.writeFileSync(path.join(tmp, 'app.json'), JSON.stringify({ version: appVer }));
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ name: 'x', version: '0.0.1' }));
    fs.writeFileSync(path.join(tmp, 'package-lock.json'), JSON.stringify({
      name: 'x',
      version: '0.0.1',
      lockfileVersion: 3,
      packages: {
        '': { name: 'x', version: '0.0.1' },
        'node_modules/cosmiconfig': { version: appVer },
      },
    }));
    assert.throws(
      () => assertPackageLockIntegrity(tmp),
      (err) => err && err.code === 'P2454_LOCK_CORRUPT'
    );
    // clean nested then sync root
    const lock = JSON.parse(fs.readFileSync(path.join(tmp, 'package-lock.json'), 'utf8'));
    lock.packages['node_modules/cosmiconfig'].version = '9.0.0';
    fs.writeFileSync(path.join(tmp, 'package-lock.json'), JSON.stringify(lock));
    syncRootPackageVersion(appVer, tmp);
    const after = JSON.parse(fs.readFileSync(path.join(tmp, 'package-lock.json'), 'utf8'));
    assert.strictEqual(after.version, appVer);
    assert.strictEqual(after.packages[''].version, appVer);
    assert.strictEqual(after.packages['node_modules/cosmiconfig'].version, '9.0.0');
  });
});
