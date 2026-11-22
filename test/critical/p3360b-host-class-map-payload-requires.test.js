'use strict';

// P3360b (CI 2026-11-22, master publish run): payload-preflight rejected
// lib/drivers/PublishedHostClassMap.js because its held-class loaders fell back to
// require('../../drivers/<held>/device'), and held driver folders are not in the
// Athom payload. Loaders must only go through the lib/hosted/<id>/ shims, which
// prepare-publish overwrites in the payload with the held code.

const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const FILE = path.join(ROOT, 'lib', 'drivers', 'PublishedHostClassMap.js');
const MAPS = require('../../lib/drivers/published-host-class-maps.json');

describe('P3360b PublishedHostClassMap payload-safe requires', () => {
  const src = fs.readFileSync(FILE, 'utf8');

  it('never requires a drivers/ folder directly (held folders are absent from the payload)', () => {
    assert.doesNotMatch(src, /require\(\s*['"]\.\.\/\.\.\/drivers\//);
  });

  it('every held id in the maps has a lib/hosted shim that resolves in the source tree', () => {
    const held = [...new Set((MAPS.maps || []).map((m) => m.held))];
    assert.ok(held.length > 0);
    for (const id of held) {
      assert.match(src, new RegExp(`require\\('\\.\\./hosted/${id}/device'\\)`), `${id} loader`);
      const shim = path.join(ROOT, 'lib', 'hosted', id, 'device.js');
      assert.ok(fs.existsSync(shim), `${id} shim`);
      assert.doesNotThrow(() => require.resolve(shim));
    }
  });
});
