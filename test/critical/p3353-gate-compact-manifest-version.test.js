'use strict';

/**
 * P3353: the bot bump v9.0.1627 (572e48a4f3, [skip ci]) held the transport retry on "CI missing".
 * Its parent 82422683fe was CI-green and the bump only changed version/changelog bookkeeping, but the
 * root app.json is a compact one-line file: the -U0 diff of a one-line file is the whole manifest,
 * so the line-based version-only check saw a "code change". The check now compares the parsed JSON
 * with the version fields removed. Anything else in a manifest (a driver, a couple) still counts.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { describe, it } = require('../_support/dual-runner');
const { jsonVersionOnlyChange, localCodeChanged, affectsCiIdentity } = require('../../.github/scripts/athom-publish-policy.js');

const BASE = { id: 'com.x', version: '9.0.1626', drivers: [{ id: 'switch_1gang', zigbee: { manufacturerName: ['_TZ3000_aaaaaaaa'], productId: ['TS0001'] } }] };

describe('P3353 version-only change of a compact JSON manifest', () => {
  it('a compact app.json that only bumps version is version-only', () => {
    assert.strictEqual(jsonVersionOnlyChange(JSON.stringify(BASE), JSON.stringify({ ...BASE, version: '9.0.1627' })), true);
  });
  it('package-lock root + packages[""] version bump is version-only', () => {
    const a = { name: 'x', version: '1.0.0', lockfileVersion: 3, packages: { '': { name: 'x', version: '1.0.0' }, 'node_modules/y': { version: '2.0.0' } } };
    const b = JSON.parse(JSON.stringify(a)); b.version = '1.0.1'; b.packages[''].version = '1.0.1';
    assert.strictEqual(jsonVersionOnlyChange(JSON.stringify(a, null, 2), JSON.stringify(b, null, 2)), true);
  });
  it('a dependency version or any manifest content change is not version-only', () => {
    const a = { name: 'x', version: '1.0.0', packages: { 'node_modules/y': { version: '2.0.0' } } };
    const b = JSON.parse(JSON.stringify(a)); b.packages['node_modules/y'].version = '2.0.1';
    assert.strictEqual(jsonVersionOnlyChange(JSON.stringify(a), JSON.stringify(b)), false);
    const c = JSON.parse(JSON.stringify(BASE)); c.version = '9.0.1627'; c.drivers[0].zigbee.manufacturerName.push('_TZ3000_bbbbbbbb');
    assert.strictEqual(jsonVersionOnlyChange(JSON.stringify(BASE), JSON.stringify(c)), false);
  });
  it('unparsable or identical text is not version-only', () => {
    assert.strictEqual(jsonVersionOnlyChange('{', '{}'), false);
    assert.strictEqual(jsonVersionOnlyChange(JSON.stringify(BASE), JSON.stringify(BASE)), false);
  });
});

describe('P3353 gate code-identity on a real git history', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3353-'));
  const g = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8' }).trim();
  const write = (f, s) => { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), s); };
  g('init', '-q'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't');
  write('app.json', JSON.stringify(BASE)); write('package.json', '{\n  "name": "x",\n  "version": "9.0.1626"\n}\n');
  write('CHANGELOG.md', 'a\n'); write('lib/a.js', 'module.exports = 1;\n');
  g('add', '-A'); g('commit', '-qm', 'code');
  const green = g('rev-parse', 'HEAD');
  write('app.json', JSON.stringify({ ...BASE, version: '9.0.1627' })); write('package.json', '{\n  "name": "x",\n  "version": "9.0.1627"\n}\n');
  write('CHANGELOG.md', 'b\na\n'); write('data/mfs_db.json', '{"v":2}');
  g('add', '-A'); g('commit', '-qm', 'v9.0.1627 [skip ci]');
  const bump = g('rev-parse', 'HEAD');

  it('a bot bump of the compact app.json + package.json + changelog inherits the parent CI', () => {
    assert.strictEqual(localCodeChanged(green, bump, affectsCiIdentity, dir), false);
  });
  it('a manifest content change after the green commit still stales its CI', () => {
    const c = JSON.parse(JSON.stringify(BASE)); c.version = '9.0.1628'; c.drivers[0].zigbee.productId.push('TS0002');
    write('app.json', JSON.stringify(c)); g('commit', '-qam', 'couple');
    assert.strictEqual(localCodeChanged(green, g('rev-parse', 'HEAD'), affectsCiIdentity, dir), true);
  });
  it('a code file change still stales its CI', () => {
    write('lib/a.js', 'module.exports = 2;\n'); g('commit', '-qam', 'code2');
    assert.strictEqual(localCodeChanged(bump, g('rev-parse', 'HEAD'), affectsCiIdentity, dir), true);
  });
});
