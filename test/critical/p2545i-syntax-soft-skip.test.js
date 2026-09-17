'use strict';

/**
 * P2545i — Contre quoi: stable syntax-check must soft-skip missing MASTER_ONLY layer tests
 * (layer-coverage etc.) so LTS CI does not require master-only modules.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const YML = path.join(ROOT, '.github', 'workflows', 'syntax-check.yml');

describe('P2545i dual-app syntax soft-skip', () => {
  it('syntax-check soft-skips absent critical layer tests', () => {
    const yml = fs.readFileSync(YML, 'utf8');
    assert.ok(yml.includes('SKIP (absent on this track)'), 'missing soft-skip echo');
    assert.ok(yml.includes('layer-coverage.test.js'), 'must still list layer-coverage');
    assert.ok(/if \[ -f "\$f" \]/.test(yml), 'must guard with file existence');
  });
});
