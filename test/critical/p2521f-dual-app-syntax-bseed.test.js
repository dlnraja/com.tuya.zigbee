'use strict';

/**
 * P2521f — Dual-app Syntax Contre quoi
 * - Auto-Fix / Syntax must skip missing npm family scripts (stable lacks p246x/p248x)
 * - Stable IntelligentProtocolRouter must NOT force BSEED onto Tuya DP
 * - P214 test + gate assets present
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2521f dual-app workflow + BSEED zcl_only', () => {
  it('auto-fix family gates skip missing npm scripts', () => {
    const yml = fs.readFileSync(path.join(ROOT, '.github/workflows/auto-fix-and-publish.yml'), 'utf8');
    assert.ok(yml.includes('skip missing'));
    assert.ok(yml.includes('P2521e') || yml.includes('P2521d'));
  });

  it('IntelligentProtocolRouter does not force BSEED onto Tuya DP', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/protocol/IntelligentProtocolRouter.js'), 'utf8');
    assert.ok(!/BSEED device detected - REQUIRES Tuya DP/.test(src), 'old BSEED force-DP must be gone');
    assert.ok(/isSacredZclOnlyManufacturer/.test(src), 'must respect sacred zcl_only');
  });

  it('P214 gate + critical test exist', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'tools/ci/p214-intelligent-protocol-gate.js')));
    assert.ok(fs.existsSync(path.join(ROOT, 'test/critical/p214-intelligent-protocol-detect.test.js')));
  });
});
