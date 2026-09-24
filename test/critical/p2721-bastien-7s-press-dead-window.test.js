'use strict';
/**
 * P2721 — Bastien Instagram harvest 2026-09-24: ~7s dead window between presses
 * (TS0042/43 slow; TS0041 also lags when blacks fire; rapid off→on waits ~7s).
 *
 * Contre quoi:
 *  1) TSN dedup 5s swallows legitimate rapid presses on snappy remotes
 *  2) Snappy path still awaited Flow heuristic (Homey queue stalls next press)
 *  3) Report debounce inherits fat profile.debounceMs on snappy
 *
 * Dual-app: BOTH (+ Bastien). Couples: axpdxqgu+TS0041, dzwgk7e2+TS0042, vsxvaj9i+TS0043.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2721 Bastien ~7s press dead-window harden', () => {
  it('PhysicalButtonMixin snappy TSN window ≤400ms', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'mixins', 'PhysicalButtonMixin.js'), 'utf8');
    assert.ok(src.includes('P2721'), 'must document P2721');
    assert.ok(/tsnWin\s*=\s*400/.test(src), 'snappy TSN window must be 400ms');
    assert.ok(src.includes('snappyRelayFlow'), 'must gate on snappyRelayFlow');
  });

  it('ButtonDevice snappy Flow fire-and-forget (no await heuristic)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'devices', 'ButtonDevice.js'), 'utf8');
    assert.ok(src.includes('P2721'), 'must document P2721');
    const snappyBlock = src.slice(src.indexOf('if (snappy)'), src.indexOf('await runCardCascade()'));
    assert.ok(snappyBlock.includes('void triggerFlowCardHeuristic'), 'must void-fire heuristic');
    assert.ok(!/await\s+triggerFlowCardHeuristic/.test(snappyBlock), 'must not await heuristic');
  });

  it('snappy report debounce capped (not fat Hubitat ms)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'mixins', 'PhysicalButtonMixin.js'), 'utf8');
    assert.ok(/snappyRelayFlow[\s\S]{0,200}Math\.min/.test(src), 'snappy must Math.min report debounce');
  });
});
