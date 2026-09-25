'use strict';
/**
 * P2734 — Bastien bidirectional UX + complementary soft paths
 *
 * Contre quoi:
 *  1) skipUiPulse left Homey tiles dead (no physical→UI)
 *  2) Soft pulse missing → bi-dir broken for TS0042/43
 *  3) bw2/bw3 missing HomeyButtonUiCharter / softArm complementary
 *  4) UI virtual press awaited Flow storm on snappy
 *
 * Couples: axpdxqgu+TS0041, dzwgk7e2+TS0042, vsxvaj9i+TS0043
 * Dual-app: BOTH (+ Bastien tip priority)
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2734 Bastien bi-dir soft UI + complementary', () => {
  it('HomeyButtonUiCharter exports softPulsePhysicalUi', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/utils/HomeyButtonUiCharter.js'), 'utf8');
    assert.ok(src.includes('function softPulsePhysicalUi'), 'softPulse helper');
    assert.ok(src.includes('P2734'), 'documents P2734');
    assert.ok(/softPulsePhysicalUi,/.test(src) || /softPulsePhysicalUi\s*,/.test(src), 'exported');
    assert.ok(src.includes('snappyRelayFlow'), 'UI virtual snappy void-fire');
  });

  it('bw1/bw2/bw3 soft-arm complementary + charter', () => {
    for (const id of ['button_wireless_1', 'button_wireless_2', 'button_wireless_3']) {
      const src = fs.readFileSync(path.join(ROOT, 'drivers', id, 'device.js'), 'utf8');
      assert.ok(src.includes('softArmComplementaryIo') || src.includes('applyHomeyButtonUiCharter'),
        `${id} must arm charter or complementary`);
      assert.ok(src.includes('applyHomeyButtonUiCharter'), `${id} must apply Homey charter`);
    }
  });

  it('PhysicalButtonMixin + Wall hybrid use softPulse for skipUiPulse', () => {
    const mix = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    const wall = fs.readFileSync(path.join(ROOT, 'lib/devices/WallSceneRemoteHybridInit.js'), 'utf8');
    const btn = fs.readFileSync(path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
    assert.ok(mix.includes('softPulsePhysicalUi'));
    assert.ok(wall.includes('softPulsePhysicalUi'));
    assert.ok(btn.includes('softPulsePhysicalUi'));
  });

  it('P2733 wake listen-only still locked', () => {
    const btn = fs.readFileSync(path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
    assert.ok(btn.includes('P2733'));
    assert.ok(/snappySleepy[\s\S]{0,200}listen-only/.test(btn));
  });
});
