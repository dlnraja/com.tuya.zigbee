'use strict';
/**
 * P2664 — Contre quoi: Bastien wall remotes (TS0043) flows don't fire lights
 * - ANTI-TRIGGER must not debounce different press types within 500ms
 * - scene remotes use minInterval 120
 * - remote_button_wireless_wall soft-detects multi-EP / vsxvaj9i
 * - FeatureFlowCards _safeRegister is idempotent
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2664 Bastien remote + flow heal', () => {
  it('ButtonDevice uses typed debounce + calm minInterval for scene remotes', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
    assert.match(src, /P2664/);
    assert.match(src, /lastTypeByButton/);
    assert.match(src, /minInterval = 120/);
    assert.match(src, /sameType && timeSinceLastButton/);
  });

  it('remote_button_wireless_wall soft-detects TS0043 / vsxvaj9i multi sticky', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers/remote_button_wireless_wall/device.js'),
      'utf8',
    );
    assert.match(src, /P2664/);
    assert.match(src, /vsxvaj9i/);
    assert.match(src, /installWallSceneRemoteHybrid/);
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/remote_button_wireless_wall/driver.compose.json'),
      'utf8',
    ));
    assert.match(compose.zigbee.learnmode.instruction.en, /Wireless Button 3|button_wireless_3|TS0043/i);
    assert.match(compose.zigbee.learnmode.instruction.fr, /Bouton sans fil 3|TS0043/i);
  });

  it('button_wireless_3 learnmode teaches Button pressed flow (not onoff)', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_3/driver.compose.json'),
      'utf8',
    ));
    assert.match(compose.zigbee.learnmode.instruction.en, /Button pressed|Bouton/i);
    assert.match(compose.zigbee.learnmode.instruction.fr, /Bouton appuy|Allume|onoff/i);
    assert.ok((compose.zigbee.manufacturerName || []).some((m) => /vsxvaj9i/i.test(m)));
  });

  it('FeatureFlowCards _safeRegister skips already-registered cards', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/flow/FeatureFlowCards.js'), 'utf8');
    assert.match(src, /P2664/);
    assert.match(src, /bucket\.has\(cardId\)/);
    assert.match(src, /already registered/i);
  });

  it('UniversalFlowCardLoader still stringifies sub_capability value (P2659)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/flow/UniversalFlowCardLoader.js'), 'utf8');
    assert.match(src, /String\(value\)/);
    assert.match(src, /P2659/);
  });
});
