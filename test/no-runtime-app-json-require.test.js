'use strict';
// WHY(OOM diag c05db40d, 9.0.1330): runtime code must never load the multi-MB app.json manifest.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('runtime does not require app.json', () => {
  it('AppVersion / WifiFixIt read the version from package.json', () => {
    for (const rel of ['lib/utils/AppVersion.js', 'lib/wifi/WifiFixIt.js']) {
      const f = path.join(__dirname, '..', rel);
      if (!fs.existsSync(f)) continue;
      const src = fs.readFileSync(f, 'utf8').replace(/\/\/.*$/gm, '');
      assert.ok(!/require\(['"][./]+app\.json['"]\)/.test(src), `${rel} requires app.json`);
    }
  });
  it('version from package.json matches app.json', () => {
    const root = path.join(__dirname, '..');
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const m = fs.readFileSync(path.join(root, 'app.json'), 'utf8').match(/"version"\s*:\s*"([^"]+)"/);
    assert.strictEqual(pkg.version, m && m[1]);
    assert.strictEqual(require('../lib/utils/AppVersion').getAppVersion(), pkg.version);
  });
});
