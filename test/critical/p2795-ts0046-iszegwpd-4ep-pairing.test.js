'use strict';

/**
 * P2795 — GH #554 TS0046 / _TZ3000_iszegwpd 4-endpoint firmware pairing
 *
 * Contre quoi: Homey "Connection impossible" after Zigbee join+interview OK.
 * Root cause: compose declared EP5–6 but interview (and ZHA#2034 signature)
 * only exposes EP1–4. Buttons 5–6 stay as capabilities; hybrid soft-skips
 * missing EPs; no onOff configureReporting storm on sleepy EndDevice.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function readCompose(driverId) {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, 'drivers', driverId, 'driver.compose.json'), 'utf8'),
  );
}

describe('P2795 — #554 TS0046/_TZ3000_iszegwpd 4-EP pairing', () => {
  it('wall_remote_6_gang compose declares only EP1–4 (match interview)', () => {
    const c = readCompose('wall_remote_6_gang');
    const eps = Object.keys(c.zigbee.endpoints).sort();
    assert.deepStrictEqual(eps, ['1', '2', '3', '4']);
    assert.ok(!c.zigbee.endpoints['5'] && !c.zigbee.endpoints['6'], 'EP5/6 must not be required for pair');
    assert.deepStrictEqual(c.zigbee.endpoints['1'].clusters, [0, 6]);
    for (const ep of ['2', '3', '4']) {
      assert.deepStrictEqual(c.zigbee.endpoints[ep].clusters, [6]);
    }
    // Never bind/report onOff in compose (sleepy storm)
    for (const ep of Object.values(c.zigbee.endpoints)) {
      assert.ok(!ep.bindings || ep.bindings.length === 0, 'no compose bindings for sleepy remote');
    }
  });

  it('keeps button.1–6 + measure_battery capabilities', () => {
    const c = readCompose('wall_remote_6_gang');
    for (const b of ['button.1', 'button.2', 'button.3', 'button.4', 'button.5', 'button.6']) {
      assert.ok(c.capabilities.includes(b), `missing ${b}`);
    }
    assert.ok(c.capabilities.includes('measure_battery'));
  });

  it('couple _TZ3000_iszegwpd + TS0046 only on wall_remote_6_gang', () => {
    const driversDir = path.join(ROOT, 'drivers');
    const hits = [];
    for (const d of fs.readdirSync(driversDir)) {
      const p = path.join(driversDir, d, 'driver.compose.json');
      if (!fs.existsSync(p)) continue;
      let c;
      try { c = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_e) { continue; }
      const mfrs = c.zigbee?.manufacturerName || [];
      const pids = c.zigbee?.productId || [];
      const hasM = mfrs.some((m) => /iszegwpd/i.test(String(m)));
      const hasP = pids.some((pid) => String(pid).toUpperCase() === 'TS0046');
      if (hasM && hasP) hits.push(d);
    }
    assert.deepStrictEqual(hits, ['wall_remote_6_gang']);
  });

  it('scene_switch_6 does not claim TS0046 productId', () => {
    const c = readCompose('scene_switch_6');
    assert.ok(!(c.zigbee.productId || []).some((p) => String(p).toUpperCase() === 'TS0046'));
  });

  it('device.js soft-fails missing EP5–6 + skips EF00 TX (P2795 WHY)', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers/wall_remote_6_gang/device.js'),
      'utf8',
    );
    assert.ok(src.includes('P2795'));
    assert.ok(src.includes('#554'));
    assert.ok(src.includes('skipEf00Tx'));
    assert.ok(src.includes('_observedButtonEndpoints') || src.includes('observed EPs'));
    assert.ok(src.includes('sendTuyaMagicPacket'));
    assert.ok(src.includes('maxButtons: 6'));
  });

  it('iszegwpd profile is sleepy-safe (skip8004 / noEf00Tx / batteryEpOnly)', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'),
      'utf8',
    );
    const idx = src.indexOf("'_TZ3000_iszegwpd'");
    assert.ok(idx > 0);
    const block = src.slice(idx, idx + 600);
    assert.ok(/skip8004:\s*true/.test(block));
    assert.ok(/noEf00Tx:\s*true/.test(block));
    assert.ok(/batteryEpOnly:\s*1/.test(block));
    assert.ok(/P2795/.test(block));
  });

  it('app.json wall_remote_6_gang zigbee endpoints match compose', () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const d = app.drivers.find((x) => x.id === 'wall_remote_6_gang');
    assert.ok(d);
    assert.deepStrictEqual(Object.keys(d.zigbee.endpoints).sort(), ['1', '2', '3', '4']);
    assert.equal(app.id, 'com.dlnraja.tuya.zigbee');
  });

  it('WallSceneRemoteHybridInit soft-skips missing endpoints', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib/devices/WallSceneRemoteHybridInit.js'),
      'utf8',
    );
    assert.ok(src.includes('if (!endpoint) continue'));
  });
});
