'use strict';

/**
 * P2253 — TS0043/TS0044 hybrid RX/TX + scene mode + no 0x8004 + LED doctrine
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function compose(id) {
  return JSON.parse(read(`drivers/${id}/driver.compose.json`));
}

describe('P2253 TS004x hybrid scene remotes', () => {
  it('DeviceOperatingMode: TS0043/44 and sacred mfrs never writeSceneAttr', () => {
    const DOM = require('../../lib/zigbee/DeviceOperatingMode');
    const cases = [
      { model: 'TS0044', mfr: '_TZ3000_zgyzgdua', driver: 'scene_switch_4' },
      { model: 'TS0043', mfr: '_TZ3000_a7ouggvs', driver: 'button_wireless_3' },
      { model: '', mfr: '_TZ3400_key8kk7r', driver: 'button_wireless_3' },
      { model: 'TS004F', mfr: '_TZ3000_zgyzgdua', driver: 'scene_switch_4' }, // mfr lock wins
    ];
    for (const c of cases) {
      const fake = {
        getSetting: (k) => (k === 'zb_model_id' ? c.model : k === 'zb_manufacturer_name' ? c.mfr : null),
        getData: () => ({ modelId: c.model, manufacturerName: c.mfr }),
        driver: { id: c.driver },
      };
      const f = DOM.classifyOperatingFamily(fake);
      assert.equal(f.writeSceneAttr, false, JSON.stringify(c));
    }
    const ts004f = {
      getSetting: (k) => (k === 'zb_model_id' ? 'TS004F' : k === 'zb_manufacturer_name' ? '_TZ3000_oteubstp' : null),
      getData: () => ({ modelId: 'TS004F', manufacturerName: '_TZ3000_oteubstp' }),
      driver: { id: 'button_wireless_4' },
    };
    assert.equal(DOM.classifyOperatingFamily(ts004f).writeSceneAttr, true);
  });

  it('mixin profiles mark skip8004 for Moes/Zemismart TS0043/44', () => {
    const mixin = read('lib/mixins/PhysicalButtonMixin.js');
    assert.match(mixin, /'_TZ3000_zgyzgdua'[\s\S]*?skip8004:\s*true/);
    assert.match(mixin, /'_TZ3000_wkai4ga5'[\s\S]*?skip8004:\s*true/);
    assert.match(mixin, /'_TZ3000_a7ouggvs'[\s\S]*?skip8004:\s*true/);
    assert.match(mixin, /'_TZ3400_key8kk7r'[\s\S]*?skip8004:\s*true/);
  });

  it('HomeyCompensationLayer: TS0041-44 magic without ts004f_scene_mode', () => {
    const src = read('lib/io/HomeyCompensationLayer.js');
    assert.match(src, /TS004\[1-4\]/);
    assert.match(src, /Never queue ts004f_scene_mode/);
  });

  it('scene_switch_4 defaults to scene + reverse_button_order', () => {
    const c = compose('scene_switch_4');
    const settings = c.settings || [];
    const mode = settings.find((s) => s.id === 'button_mode');
    assert.ok(mode);
    assert.equal(mode.value, 'scene');
    assert.match(String(mode.hint?.en || ''), /0x8004|Blue LED/i);
    const rev = settings.find((s) => s.id === 'reverse_button_order');
    assert.ok(rev);
    assert.equal(rev.value, false);
  });

  it('knowledge doc covers hybrid + LED + 5.x path', () => {
    const doc = read('docs/knowledge/TS004X_BATTERY_REMOTES.md');
    assert.match(doc, /P2253/);
    assert.match(doc, /Blue LED/i);
    assert.match(doc, /5\.x/);
    assert.match(doc, /writeSceneAttr:\s*false/);
  });

  it('BIDIRECTIONAL_BUTTONS no longer teaches 0x8004 for TS0044', () => {
    const doc = read('docs/BIDIRECTIONAL_BUTTONS.md');
    assert.match(doc, /NOT TS0044/);
    assert.doesNotMatch(doc, /### TS004F\/TS0044 Scene Mode/);
  });

  it('skip8004 profile is an active gate (not metadata-only)', () => {
    const mixin = read('lib/mixins/PhysicalButtonMixin.js');
    assert.match(mixin, /profileSkip|profile\?\.skip8004/);
    const btn = read('lib/devices/ButtonDevice.js');
    assert.match(btn, /profileSkip|profile\?\.skip8004/);
    assert.doesNotMatch(btn, /Some TS0044 devices also need this/);
  });
});
