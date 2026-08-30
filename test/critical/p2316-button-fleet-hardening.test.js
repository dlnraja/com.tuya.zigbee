'use strict';

/**
 * P2316 — Peter / meter91 / Nobø button fleet hardening
 * Couples: mrpevh8p+TS0041, zgyzgdua+TS0044, xffhmvhv+TS004F
 * Web: Z2M SH-SC07 / TS0044 first-press magic 0xFFDE; never 0x8004 on TS0041–44
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
  } catch (e) {
    console.error(`  ❌ ${name}: ${e.message}`);
    throw e;
  }
}

console.log('P2316 button fleet hardening');

test('DeviceOperatingMode skips 0x8004 for Peter/meter91/Nobø mfrs', () => {
  const DOM = require(path.join(ROOT, 'lib/zigbee/DeviceOperatingMode'));
  for (const mfr of ['_TZ3000_mrpevh8p', '_TZ3000_zgyzgdua', '_TZ3000_xffhmvhv', '_TZ3000_kfu8zapd']) {
    const fam = DOM.classifyOperatingFamily({
      getSetting: (k) => (k === 'zb_manufacturer_name' ? mfr : k === 'zb_model_id' ? 'TS004F' : null),
      getData: () => ({ manufacturerName: mfr, modelId: 'TS004F' }),
    });
    assert.strictEqual(fam.writeSceneAttr, false, `${mfr} must not write 0x8004`);
  }
});

test('PhysicalButtonMixin profile locks mrpevh8p map1 + skip8004', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
  assert.ok(/_TZ3000_mrpevh8p/.test(src));
  assert.ok(/mapAllEndpointsToButton1:\s*true/.test(src));
  assert.ok(/skipBatteryReporting:\s*true/.test(src));
  assert.ok(/P2312 wake bind EP1/.test(src) || /P2312 wake rebind/.test(src));
  assert.ok(/zgyzgdua|xffhmvhv/.test(src), 'P2298 rearm includes meter91/Nobø mfrs');
});

test('ButtonCaptureCascade prefers mfr override for mrpevh8p', () => {
  const { preferredLevels, loadCascade } = require(path.join(ROOT, 'lib/mixins/ButtonCaptureCascade'));
  const cascade = loadCascade();
  assert.ok(cascade.manufacturerPreferredLevels?.mrpevh8p);
  const levels = preferredLevels({
    getSetting: (k) => (k === 'zb_manufacturer_name' ? '_TZ3000_mrpevh8p'
      : k === 'zb_model_id' ? 'TS0041' : null),
  }, cascade);
  assert.deepStrictEqual(levels.slice(0, 3), [1, 2, 5]);
});

test('button_wireless_1 compose locks mrpevh8p+TS0041', () => {
  const compose = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'drivers/button_wireless_1/driver.compose.json'), 'utf8'));
  const mfrs = (compose.zigbee?.manufacturerName || []).map((m) => String(m).toLowerCase());
  const pids = (compose.zigbee?.productId || []).map((p) => String(p).toUpperCase());
  assert.ok(mfrs.includes('_tz3000_mrpevh8p'));
  assert.ok(pids.includes('TS0041'));
});

test('scene_switch_4 compose locks zgyzgdua+TS0044', () => {
  const compose = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'drivers/scene_switch_4/driver.compose.json'), 'utf8'));
  const mfrs = (compose.zigbee?.manufacturerName || []).map((m) => String(m).toLowerCase());
  const pids = (compose.zigbee?.productId || []).map((p) => String(p).toUpperCase());
  assert.ok(mfrs.includes('_tz3000_zgyzgdua'));
  assert.ok(pids.includes('TS0044'));
});

test('button_wireless_4 compose locks xffhmvhv', () => {
  const compose = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'drivers/button_wireless_4/driver.compose.json'), 'utf8'));
  const mfrs = (compose.zigbee?.manufacturerName || []).map((m) => String(m).toLowerCase());
  assert.ok(mfrs.includes('_tz3000_xffhmvhv'));
});

test('button_wireless_1 flow cards declared for single/double/long', () => {
  const flow = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'drivers/button_wireless_1/driver.flow.compose.json'), 'utf8'));
  const ids = (flow.triggers || []).map((t) => t.id);
  assert.ok(ids.includes('button_wireless_1_button_1gang_button_pressed'));
  assert.ok(ids.includes('button_wireless_1_button_1gang_button_double_press'));
  assert.ok(ids.includes('button_wireless_1_button_1gang_button_long_press'));
});

test('ButtonDevice wake path has P2316 skip 0x8004 guard', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
  assert.ok(/P2316 skip wake 0x8004/.test(src));
  assert.ok(/profile\?\.skip8004/.test(src));
});

test('button_wireless_1 sends magic packet on init (first-press)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_1/device.js'), 'utf8');
  assert.ok(/sendTuyaMagicPacket/.test(src));
  assert.ok(/0xFFDE|P2316/.test(src));
});

console.log('P2316 OK');
