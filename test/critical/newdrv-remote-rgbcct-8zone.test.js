'use strict';
// WHY(2026-10-11): new driver remote_rgbcct_8zone for the MiBoxer FUT089Z (exact couple _TZ3000_xwh1e22x + TS1002;
// Z2M miboxer.ts, u236/homed-service-zigbee, JohanBendz#1361, zigpy#1829). Native ZCL commands → zone triggers.
// The legacy bulb_rgbw entry stays until this driver is published and soaked (user decision), then W4 move.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const D = 'remote_rgbcct_8zone';
const dir = path.join(ROOT, 'drivers', D);
const compose = JSON.parse(fs.readFileSync(path.join(dir, 'driver.compose.json'), 'utf8'));
const flow = JSON.parse(fs.readFileSync(path.join(dir, 'driver.flow.compose.json'), 'utf8'));
const z = require('../../drivers/remote_rgbcct_8zone/zone-commands');

test('exact couple, native clusters: powerCfg in, onOff/level/color bound', () => {
  assert.deepEqual(compose.zigbee.productId, ['TS1002']);
  assert.deepEqual([...new Set(compose.zigbee.manufacturerName.map((m) => m.toLowerCase()))], ['_tz3000_xwh1e22x']);
  assert.ok(compose.zigbee.endpoints['1'].clusters.includes(1));
  for (const c of [6, 8, 768]) {assert.ok(compose.zigbee.endpoints['1'].bindings.includes(c), `binding ${c}`);}
});

test('group cast → zone (base 100 → groups 101..108), unicast → 0', () => {
  assert.equal(z.zoneFromMeta({ groupId: 101 }), 1);
  assert.equal(z.zoneFromMeta({ groupId: 108 }), 8);
  assert.equal(z.zoneFromMeta({ groupId: 109 }), 0);
  assert.equal(z.zoneFromMeta({ groupId: 205 }, 200), 5);
  assert.equal(z.zoneFromMeta({}), 0);
});

test('value conversions', () => {
  assert.equal(z.levelPct(254), 100);
  assert.equal(z.levelPct(0), 0);
  assert.equal(z.huePct(254), 360);
  assert.equal(z.warmthPct(153), 0);
  assert.equal(z.warmthPct(370), 100);
  assert.equal(z.sceneFromData(Buffer.from([3])), 3);
});

test('bound clusters emit events with meta (zone) and catch the Tuya 0xFD scene', async () => {
  const got = [];
  const { OnOff, Level, Color } = z.makeBound((ev, data, meta) => got.push([ev, data, z.zoneFromMeta(meta)]));
  new OnOff().on({}, { groupId: 102 });
  new Level().moveToLevelWithOnOff({ level: 127 }, { groupId: 103 });
  new Color().moveToHueAndSaturation({ hue: 127, saturation: 254 }, { groupId: 104 });
  new Color().moveToColorTemperature({ colorTemperature: 370 }, {});
  await new OnOff().handleFrame({ cmdId: 0xFD, data: Buffer.from([2]) }, { groupId: 101 });
  assert.deepEqual(got.map((g) => [g[0], g[2]]), [['on', 2], ['brightness', 3], ['color', 4], ['color_temperature', 0], ['scene', 1]]);
  assert.equal(got[1][1].brightness, 50);
  assert.equal(got[4][1].scene, 2);
});

test('one trigger per command, zone arg + zone token, 4 locales; driver filters on zone', () => {
  const ids = flow.triggers.map((c) => c.id);
  for (const ev of ['on', 'off', 'brightness', 'color_temperature', 'color', 'scene']) {assert.ok(ids.includes(`${D}_${ev}`), ev);}
  for (const c of flow.triggers) {
    assert.ok(c.args.some((a) => a.name === 'zone') && c.tokens.some((t) => t.name === 'zone'), c.id);
    for (const l of ['en', 'fr', 'nl', 'de']) {assert.ok(c.title[l], `${c.id} ${l}`);}
  }
  assert.match(fs.readFileSync(path.join(dir, 'driver.js'), 'utf8'), /args\.zone === 'any'/);
  for (const f of ['assets/images/small.png', 'assets/images/large.png', 'assets/icon.svg']) {assert.ok(fs.existsSync(path.join(dir, f)), f);}
});

test('legacy bulb_rgbw entry kept until soak (user decision)', () => {
  const b = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/bulb_rgbw/driver.compose.json'), 'utf8')).zigbee;
  assert.ok(b.manufacturerName.includes('_TZ3000_xwh1e22x'));
});
