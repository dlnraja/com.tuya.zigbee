'use strict';

/**
 * P2910 — #423/#424 (_TZ3000_rco1yzb1 / TS004F): the click window is auto-enabled only when
 * needed (quirk couple + a double/triple Flow on that button + no native multi-press frames);
 * default single press stays immediate; the live raw L1 On/Off path honours the window.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const { ClickWindowAuto, effectiveWindow, multiCardIds, buttonsFromArgs, AUTO_WINDOW_MS } = require('../../lib/utils/ClickWindowAuto');

function fakeDevice(cards) {
  const listeners = [];
  return {
    listeners,
    driver: { id: 'button_wireless_4' },
    homey: {
      flow: {
        getDeviceTriggerCard(id) {
          if (!(id in cards)) {throw new Error('unknown card');}
          return {
            on(evt, fn) { listeners.push([id, evt, fn]); },
            removeListener(evt, fn) { const i = listeners.findIndex((l) => l[2] === fn); if (i >= 0) {listeners.splice(i, 1);} },
            async getArgumentValues() { return cards[id]; },
          };
        },
      },
    },
  };
}

describe('P2910 effectiveWindow decision', () => {
  it('explicit setting always wins', () => {
    assert.equal(effectiveWindow({ explicitMs: 800 }), 800);
    assert.equal(effectiveWindow({ explicitMs: 50, quirk: false }), 150);
  });
  it('auto only for quirk + needed + no native multi-press', () => {
    assert.equal(effectiveWindow({ explicitMs: 0, quirk: true, needed: true, nativeMulti: false }), AUTO_WINDOW_MS);
    assert.equal(effectiveWindow({ explicitMs: 0, quirk: true, needed: false }), 0, 'no double/triple Flow -> immediate single');
    assert.equal(effectiveWindow({ explicitMs: 0, quirk: false, needed: true }), 0, 'other couples unchanged');
    assert.equal(effectiveWindow({ explicitMs: 0, quirk: true, needed: true, nativeMulti: true }), 0, 'firmware counts itself');
  });
});

describe('P2910 Flow usage detection', () => {
  it('card ids and button args', () => {
    const ids = multiCardIds('button_wireless_4', 4);
    assert.deepEqual(ids.generic, ['button_wireless_4_button_4gang_button_double_press', 'button_wireless_4_button_4gang_button_multi_press']);
    assert.deepEqual(ids.perButton[2], ['button_wireless_4_button_4gang_button_2_double', 'button_wireless_4_button_4gang_button_2_triple']);
    assert.deepEqual([...buttonsFromArgs([{ button: '3' }, { button: { id: '1' } }], 4)].sort(), [1, 3]);
    assert.deepEqual([...buttonsFromArgs([{}], 2)].sort(), [1, 2], 'no usable arg -> all buttons');
  });
  it('declared card ids exist in the driver flow compose', () => {
    const flow = JSON.parse(fs.readFileSync(path.join(root, 'drivers/button_wireless_4/driver.flow.compose.json'), 'utf8'));
    const declared = new Set(flow.triggers.map((t) => t.id));
    const ids = multiCardIds('button_wireless_4', 4);
    for (const id of [...ids.generic, ...Object.values(ids.perButton).flat()]) {assert.ok(declared.has(id), id);}
  });
  it('per-button need from Flows, cached and invalidated on card update', async () => {
    const cards = {
      button_wireless_4_button_4gang_button_double_press: [],
      button_wireless_4_button_4gang_button_multi_press: [{ button: '4' }],
      button_wireless_4_button_4gang_button_1_double: [{}],
      button_wireless_4_button_4gang_button_1_triple: [],
      button_wireless_4_button_4gang_button_2_double: [],
      button_wireless_4_button_4gang_button_2_triple: [],
      button_wireless_4_button_4gang_button_3_double: [],
      button_wireless_4_button_4gang_button_3_triple: [],
      button_wireless_4_button_4gang_button_4_double: [],
      button_wireless_4_button_4gang_button_4_triple: [],
    };
    const dev = fakeDevice(cards);
    const a = new ClickWindowAuto(dev, { gangs: 4 });
    const set = await a.refresh();
    assert.deepEqual([...set].sort(), [1, 4]);
    assert.equal(a.isNeeded(1), true);
    assert.equal(a.isNeeded(2), false);
    assert.ok(dev.listeners.length > 0);
    dev.listeners[0][2]();
    assert.equal(a.at, 0, 'update event invalidates cache');
    a.destroy();
    assert.equal(dev.listeners.length, 0, 'hooks released');
  });
  it('never throws without a Flow API', async () => {
    const a = new ClickWindowAuto({ driver: { id: 'x' } }, { gangs: 1 });
    const set = await a.refresh();
    assert.equal(set.size, 0);
    assert.equal(a.isNeeded(1), false);
  });
});

describe('P2910 button_wireless_4 wiring', () => {
  const src = fs.readFileSync(path.join(root, 'drivers/button_wireless_4/device.js'), 'utf8');
  it('auto window armed only for the quirk couple', () => {
    assert.match(src, /_setupClickWindowAuto\(\) \{\n\s+try \{\n\s+if \(!require\('..\/..\/lib\/quirks\/FirmwareQuirks'\)\.onOffCommandsAreSingle\(this\)\) \{return;\}/);
  });
  it('live raw L1 On/Off path aggregates only when a window is in effect, else parent path', () => {
    assert.match(src, /onZigBeeMessage\(endpointId, clusterId, frame, meta\) \{/);
    assert.match(src, /if \(this\._clickWindowMs\(ep\) > 0\) \{/);
    assert.match(src, /super\.onZigBeeMessage\(endpointId, clusterId, frame, meta\)/);
    assert.match(src, /_nativeMultiPressSeen = true/);
  });
  it('quirk record still scoped to the exact couple', () => {
    const q = JSON.parse(fs.readFileSync(path.join(root, 'lib/data/firmware-quirks.json'), 'utf8'));
    const list = Array.isArray(q) ? q : (q.quirks || []);
    const r = list.find((x) => x.id === 'rco1yzb1_single_click_missing');
    assert.ok(r);
    assert.deepEqual(r.mfr, ['_TZ3000_rco1yzb1']);
    assert.deepEqual(r.pid, ['TS004F']);
  });
});
