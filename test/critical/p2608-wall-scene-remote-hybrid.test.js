'use strict';

/**
 * P2608 — Wall scene remotes 3/4 btn hybrid RX Contre quoi
 * Bastien house priority + AliExpress stick-on TS0043/TS0044 class
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2608 wall scene remote hybrid (TS0043/44)', () => {
  it('WallSceneRemoteHybridInit exports installer', () => {
    const mod = require('../../lib/devices/WallSceneRemoteHybridInit.js');
    assert.equal(typeof mod.installWallSceneRemoteHybrid, 'function');
  });

  it('button_wireless_3 uses hybrid installer (not E000-only)', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_3/device.js'),
      'utf8',
    );
    assert.ok(src.includes('installWallSceneRemoteHybrid'));
    assert.ok(src.includes('maxButtons: 3'));
    assert.ok(src.includes('wall-hybrid-3') || src.includes('BUTTON_WIRELESS_3'));
  });

  it('button_wireless_3 compose is battery + TS0043 + OnOff + E000 clusters', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_3/driver.compose.json'),
      'utf8',
    ));
    assert.ok((compose.energy?.batteries || []).length >= 1);
    assert.ok((compose.zigbee?.productId || []).includes('TS0043'));
    const clusters = compose.zigbee?.endpoints?.['1']?.clusters || [];
    assert.ok(clusters.map(Number).includes(6), 'need genOnOff for 0xFD');
    assert.ok(clusters.map(Number).includes(57344) || clusters.map(Number).includes(0xE000), 'need E000');
    const mfrs = compose.zigbee?.manufacturerName || [];
    assert.ok(mfrs.some((m) => /a7ouggvs/i.test(m)), 'Zemismart sticky couple');
    assert.ok(mfrs.some((m) => /dziaict4/i.test(m)), 'Moes/Tuya TS0043 family');
  });

  it('scene_switch_4 / button_wireless_4 keep hybrid stacks for 4-btn walls', () => {
    const s4 = fs.readFileSync(path.join(ROOT, 'drivers/scene_switch_4/device.js'), 'utf8');
    const b4 = fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_4/device.js'), 'utf8');
    assert.ok(/0xFD|OnOffBound|_setupTuyaDP|_setupRawFrame/i.test(s4));
    assert.ok(/E000|_setupTuyaDP|_setupRawFrame/i.test(b4));
  });

  it('never force 0x8004 on TS0043 docs in compose settings', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_3/driver.compose.json'),
      'utf8',
    ));
    const blob = JSON.stringify(compose.settings || []);
    assert.ok(/0x8004|TS0043|Scene/i.test(blob));
  });
});
