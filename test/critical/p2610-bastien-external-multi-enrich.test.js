'use strict';

/**
 * P2610 — Bastien external multi-source enrich Contre quoi
 * Outbound-only: never wipe compose; forbid knob mfrs on wall remotes.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2610 Bastien external multi enrich (outbound)', () => {
  it('p2610 script uses ComplementaryMerge and forbids rotary knob mfrs', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'tools/ci/p2610-bastien-external-multi-enrich.js'),
      'utf8',
    );
    assert.ok(src.includes('appendExactIdentityForms'));
    assert.ok(src.includes('wouldDegradeCompose'));
    assert.ok(src.includes('uri7ongn'));
    assert.ok(src.includes('FORBIDDEN_MFR'));
    assert.ok(src.includes('bastien_external_then_outbound') || src.includes('outbound'));
    assert.ok(!/manufacturerName\s*=\s*\[onlyNew\]/.test(src));
  });

  it('npm scripts wired; Bastien SSOT stays outbound-only', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2610']);
    assert.ok(pkg.scripts['enrich:bastien:external'] || pkg.scripts['enrich:p2610']);
    const ssot = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'config/architecture/bastien-house-ssot.json'),
      'utf8',
    ));
    assert.equal(ssot.enrichment.direction, 'bastien_to_public_only');
    assert.ok((ssot.enrichment.promotesTo || []).includes('master'));
  });

  it('verified TS0043 Zemismart couple stays on button_wireless_3', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_3/driver.compose.json'),
      'utf8',
    ));
    const mfrs = compose.zigbee?.manufacturerName || [];
    assert.ok(mfrs.some((m) => /a7ouggvs/i.test(m)));
    assert.ok((compose.zigbee?.productId || []).includes('TS0043'));
  });
});
