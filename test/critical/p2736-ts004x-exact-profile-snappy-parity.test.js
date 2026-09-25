'use strict';
/**
 * P2736 — TS004x exact-profile snappy parity (Bastien L99)
 *
 * Contre quoi: DEVICE_PROFILES exact mfr match returned raw slow profile
 * (no snappyRelayFlow) and skipped P2714 driver fallback — remotes stay laggy.
 * Knobs TS004F must NOT get skipUiPulse force.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2736 TS004x snappy parity on exact profile match', () => {
  it('PhysicalButtonMixin applies P2736 snappy parity after DEVICE_PROFILES match', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.ok(src.includes('applyTs004xSnappyParity'), 'helper present');
    assert.ok(src.includes('P2736'), 'documents P2736');
    assert.ok(src.includes('TS004F'), 'knob guard');
    // finish must wrap applyTs004xSnappyParity
    assert.match(src, /const finish = \(resolved\) => \{[\s\S]*?applyTs004xSnappyParity/);
  });

  it('does not force snappy on smart_knob / TS004F brand paths', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    const idx = src.indexOf('applyTs004xSnappyParity');
    const block = src.slice(idx, idx + 1200);
    assert.match(block, /TS004F/);
    assert.match(block, /knob\|rotary/);
  });
});
