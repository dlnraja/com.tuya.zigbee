'use strict';

/**
 * Tests — i18n & data coherence (v9.0.368)
 *  - every locale has all en.json leaf keys, no mojibake anywhere
 *  - no mojibake in .homeycompose (user-visible flow cards/capabilities)
 *  - every mfs_db driverId has a real driver directory (and vice-versa claim)
 *  - version invariants: master is 9.x, never published with a suffix
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..');
const { audit, MOJIBAKE } = require('../tools/ci/locale-completeness');

describe('i18n completeness (v9.0.368)', () => {
  it('all locales have all en.json leaf keys and no mojibake', () => {
    const problems = audit();
    assert.deepStrictEqual(problems, [], JSON.stringify(problems.slice(0, 3)));
  });

  it('no mojibake in .homeycompose (flow cards, capabilities)', () => {
    const broken = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {walk(p);}
        else if (e.name.endsWith('.json') && MOJIBAKE.test(fs.readFileSync(p, 'utf8'))) {broken.push(p);}
      }
    };
    walk(path.join(ROOT, '.homeycompose'));
    assert.deepStrictEqual(broken, [], broken.join(', '));
  });

  it('no mojibake in drivers compose/flow JSON', function () {
    if (typeof this.timeout === 'function') {this.timeout(60000);}
    const broken = [];
    for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
      const dir = path.join(ROOT, 'drivers', d);
      if (!fs.statSync(dir).isDirectory()) {continue;}
      for (const f of fs.readdirSync(dir)) {
        if (!f.endsWith('.json')) {continue;}
        const p = path.join(dir, f);
        if (MOJIBAKE.test(fs.readFileSync(p, 'utf8'))) {broken.push(p);}
      }
    }
    assert.deepStrictEqual(broken, [], broken.slice(0, 10).join(', '));
  });
});

describe('driver ↔ mfs_db coherence', () => {
  it('every mfs_db driverId resolves to an existing driver directory', () => {
    const mfs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'mfs_db.json'), 'utf8'));
    const missing = new Set();
    for (const [fp, entry] of Object.entries(mfs)) {
      const driverId = entry && entry.driverId;
      if (!driverId) {continue;}
      if (!fs.existsSync(path.join(ROOT, 'drivers', driverId, 'driver.compose.json'))) {
        missing.add(`${fp} → ${driverId}`);
      }
    }
    assert.deepStrictEqual([...missing], [], [...missing].slice(0, 10).join(', '));
  });
});

describe('version invariants', () => {
  it('master version is plain semver 9.x (no pre-release suffix)', () => {
    const v = require(path.join(ROOT, 'app.json')).version;
    assert.match(v, /^9\.\d+\.\d+$/, `invalid master version: ${v}`);
  });

  it('package.json, .homeycompose and app.json versions agree', () => {
    const a = require(path.join(ROOT, 'app.json')).version;
    const p = require(path.join(ROOT, 'package.json')).version;
    const h = require(path.join(ROOT, '.homeycompose', 'app.json')).version;
    assert.strictEqual(p, a, `package.json ${p} != app.json ${a}`);
    assert.strictEqual(h, a, `.homeycompose ${h} != app.json ${a}`);
  });
});
