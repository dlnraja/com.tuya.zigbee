'use strict';

/**
 * P2676 — Bastien boot must not hard-crash on missing homey-zigbeedriver
 * (Gmail diag cb3c0c87 @ 1.0.51 — "Rien ne fonctionne" / zero lights+relays)
 *
 * Contre quoi:
 * - ZigBeeDriverFlowCardPatch hard-require at top level
 * - app.js hard-require of the patch
 * - prepare-publish ships without node_modules/homey-zigbeedriver
 * - P2696: top-level `return` after soft-skip (Illegal return → Fleetwood fail)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');

describe('P2676 Bastien/master zigbeedriver boot harden', () => {
  it('ZigBeeDriverFlowCardPatch soft-requires homey-zigbeedriver (no illegal top-level return)', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib', 'drivers', 'ZigBeeDriverFlowCardPatch.js'),
      'utf8',
    );
    assert.ok(src.includes('try {'), 'must try/catch require');
    assert.ok(/require\(['"]homey-zigbeedriver['"]\)/.test(src));
    assert.ok(src.includes('soft-skip') || src.includes('P2676'));
    assert.ok(
      !/^const \{ ZigBeeDriver \} = require\(['"]homey-zigbeedriver['"]\);/m.test(src),
      'hard top-level require must be gone',
    );
    // Contre quoi(P2696): CommonJS top-level return → Unified CI Fleetwood JS_SYNTAX
    assert.ok(
      !/module\.exports\s*=\s*null;\s*return\s*;/.test(src),
      'must not use top-level return after soft-skip',
    );
    assert.ok(/if\s*\(\s*!ZigBeeDriver\s*\)/.test(src), 'soft-skip via if (!ZigBeeDriver)');
    assert.doesNotThrow(() => new vm.Script(src, { filename: 'ZigBeeDriverFlowCardPatch.js' }));
  });

  it('app.js wraps ZigBeeDriverFlowCardPatch require', () => {
    const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    const idx = src.indexOf('ZigBeeDriverFlowCardPatch');
    assert.ok(idx > 0);
    const window = src.slice(Math.max(0, idx - 160), idx + 100);
    assert.ok(/try\s*\{/.test(window), 'app.js must try/catch patch require');
  });

  it('package.json declares homey-zigbeedriver dependency', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.dependencies && pkg.dependencies['homey-zigbeedriver']);
  });
});
