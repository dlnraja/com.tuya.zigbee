'use strict';

/**
 * P2630 — `_TZ3000_axpdxqgu`+TS0041 Bastien interview Contre quoi
 * Clusters EP1 [0,1,6]; no EF00/E000; flow no args.device gate; hybrid 0xFD.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const COMPOSE = path.join(ROOT, 'drivers/button_wireless_1/driver.compose.json');
const DEVICE = path.join(ROOT, 'drivers/button_wireless_1/device.js');
const DRIVER = path.join(ROOT, 'drivers/button_wireless_1/driver.js');
const FLOW_HELPER = path.join(ROOT, 'lib/FlowCardHelper.js');

describe('P2630 axpdxqgu+TS0041 interview / flows / RX-TX', () => {
  it('compose EP1 matches interview [0,1,6] — no EF00/E000/IAS', () => {
    const c = JSON.parse(fs.readFileSync(COMPOSE, 'utf8'));
    const ep1 = c.zigbee.endpoints['1'];
    assert.deepEqual(ep1.clusters.slice().sort((a, b) => a - b), [0, 1, 6]);
    assert.deepEqual(ep1.bindings, [6]);
    const all = JSON.stringify(c.zigbee.endpoints);
    assert.ok(!all.includes('61184'), 'must not compose EF00');
    assert.ok(!all.includes('57344'), 'must not compose E000 for this sticky');
    assert.ok((c.zigbee.manufacturerName || []).some((x) => /axpdxqgu/i.test(String(x))));
    assert.ok((c.zigbee.productId || []).includes('TS0041'));
  });

  it('device.js locks noEf00 + skip 0x8004 + hybrid skipEf00Tx', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('P2630'));
    assert.ok(src.includes('batteryEpOnly: 1'));
    assert.ok(src.includes('writeSceneAttr: false'));
    assert.ok(src.includes('noEf00: true'));
    assert.ok(src.includes('skipEf00Tx: true'));
    assert.ok(src.includes('installWallSceneRemoteHybrid'));
  });

  it('driver.js flow listeners do not require args.device', () => {
    const src = fs.readFileSync(DRIVER, 'utf8');
    assert.ok(src.includes('shouldRunForDeviceAndButton'));
    assert.ok(!/if\s*\(\s*!args\.device\s*\)/.test(src), 'args.device gate blocks Flows');
  });

  it('FlowCardHelper per-button/battery/scene use shouldRunForDeviceAndButton', () => {
    const src = fs.readFileSync(FLOW_HELPER, 'utf8');
    assert.ok(!/async \(args = \{\}\) => !!args\.device/.test(src));
  });

  it('remote_wall must not steal axpdxqgu', () => {
    const remote = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/remote_button_wireless_wall/driver.compose.json'),
      'utf8',
    ));
    assert.ok(!(remote.zigbee?.manufacturerName || []).some((x) => /axpdxqgu/i.test(String(x))));
  });

  it('app.json zigbee matches compose interview endpoints', () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const d = (app.drivers || []).find((x) => x.id === 'button_wireless_1');
    assert.ok(d);
    assert.deepEqual(
      d.zigbee.endpoints['1'].clusters.slice().sort((a, b) => a - b),
      [0, 1, 6],
    );
  });

  it('npm check:p2630 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2630']);
  });
});
