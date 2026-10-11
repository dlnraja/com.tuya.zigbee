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
    // WHY(P2611 superseded the inline bash loop with tools/ci/run-critical-tests-track-adaptive.js,
    // which soft-skips missing files and MASTER_ONLY deps. Accept either form; aligned 2026-10-11.)
    const runnerPath = path.join(ROOT, 'tools', 'ci', 'run-critical-tests-track-adaptive.js');
    const usesRunner = yml.includes('run-critical-tests-track-adaptive.js') && fs.existsSync(runnerPath);
    const runner = usesRunner ? fs.readFileSync(runnerPath, 'utf8') : '';
    assert.ok(yml.includes('SKIP (absent on this track)') || /SKIP missing/.test(runner), 'missing soft-skip echo');
    assert.ok(yml.includes('layer-coverage.test.js'), 'must still list layer-coverage');
    assert.ok(/if \[ -f "\$f" \]/.test(yml) || /existsSync\(abs\)/.test(runner), 'must guard with file existence');
    assert.ok(yml.includes('SKIP MASTER_ONLY: p2437') || /MASTER_ONLY dep/.test(runner), 'must skip forfait IDE tests on LTS');
    assert.ok(!/node --test test\/critical\/p2437-ai-forfait/.test(yml), 'must not hard-run p2437 on stable');
  });
});
