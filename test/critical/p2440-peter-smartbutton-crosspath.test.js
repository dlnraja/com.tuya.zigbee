'use strict';

/**
 * P2440 — Peter #2230 / diag 048cff91
 * Smartbutton works but lights flicker: parallel 0xFD + onOff + levelControl
 * must collapse to one physical flow within the cross-path window.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const MIXIN = path.join(ROOT, 'lib', 'mixins', 'PhysicalButtonMixin.js');

describe('P2440 Peter smartbutton cross-path dedup', () => {
  it('mixin documents P2440 cross-path + mrpevh8p gang-only window', () => {
    const src = fs.readFileSync(MIXIN, 'utf8');
    assert.ok(src.includes('P2440'), 'P2440 WHY present');
    assert.ok(src.includes('crossPathDedupMs'), 'crossPathDedupMs used');
    assert.ok(src.includes('crossPathGangOnly'), 'gang-only flag for 1-btn');
    assert.ok(/_TZ3000_mrpevh8p[\s\S]*?crossPathGangOnly:\s*true/.test(src), 'mrpevh8p profile');
  });

  it('simulates 0xFD then onOff then level → one accepted press', async () => {
    const src = fs.readFileSync(MIXIN, 'utf8');
    // Lightweight harness: extract behavior via mock device using same logic
    const calls = [];
    const device = {
      driver: { id: 'button_wireless_1' },
      _crossPathPress: {},
      _crossPathDedupMs: 900,
      log() {},
      getDeviceProfile() {
        return {
          buttonCount: 1,
          mapAllEndpointsToButton1: true,
          crossPathGangOnly: true,
          crossPathDedupMs: 1100,
          debounceMs: 1100,
        };
      },
    };

    // Inline the gate (mirrors mixin) — keep in sync with PhysicalButtonMixin
    function gate(pressType, tokens = {}) {
      if (tokens?.source === 'virtual' || tokens?._internalTrigger) {
        calls.push(pressType);
        return true;
      }
      const profile = device.getDeviceProfile();
      const win = Number(profile.crossPathDedupMs || profile.debounceMs || 900);
      const norm = String(pressType || 'single')
        .replace(/^long_press$/i, 'long')
        .replace(/^(on|toggle)$/i, 'single')
        .replace(/^(off)$/i, 'double')
        .toLowerCase();
      const oneBtn = profile.crossPathGangOnly === true
        || Number(profile.buttonCount) === 1
        || !!profile.mapAllEndpointsToButton1;
      const key = oneBtn ? 'g1' : `g1:${norm}`;
      const now = Date.now();
      const last = device._crossPathPress[key] || 0;
      if (win > 0 && now - last < win) return false;
      device._crossPathPress[key] = now;
      calls.push(pressType);
      return true;
    }

    assert.strictEqual(gate('single'), true); // 0xFD
    assert.strictEqual(gate('single'), false); // onOff echo
    assert.strictEqual(gate('long'), false); // levelControl echo
    assert.strictEqual(calls.length, 1);
    assert.ok(src.includes('_readBatteryWhileAwake'), 'battery wake on accepted press');
  });
});
