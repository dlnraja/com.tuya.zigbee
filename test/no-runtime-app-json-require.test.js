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
  it('no runtime file loads app.json (whole-repo scan)', () => {
    const root = path.join(__dirname, '..');
    const bad = [];
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) { if (!/node_modules|scraper|enrichment/.test(e.name)) walk(p); continue; }
        if (!p.endsWith('.js') || p.endsWith('.test.js')) continue;
        const src = fs.readFileSync(p, 'utf8').replace(/\/\/.*$/gm, '');
        if (/require\(\s*['"][./]*app\.json['"]\s*\)|readFileSync\([^)]*['"]app\.json['"]/.test(src)) bad.push(path.relative(root, p));
      }
    };
    for (const d of ['lib', 'drivers']) if (fs.existsSync(path.join(root, d))) walk(path.join(root, d));
    assert.deepStrictEqual(bad.filter((f) => !/ConfigSchemaValidator/.test(f)), []);
  });
});
