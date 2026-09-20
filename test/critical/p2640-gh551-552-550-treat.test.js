'use strict';

/**
 * P2640 — GH#551/#552/#550 treat (2026-09-20)
 *
 * Contre quoi:
 * - #551: Athom compact near 17k budget drops `_TZ3000_famkxci2`+TS0043 → Generic Zigbee
 * - #551: button_wireless_3 EP1 must match interview [0,1,6,57344] (no IAS/EF00)
 * - #552: e3vhyirx+TS130F stays wall_curtain_switch (sacred-keep)
 * - #550: clearPresenceOnZeroDistance must not wipe presence before meaningful DP9
 * - CI: sanitize must rename duplicate hashed Flow card ids (…_d_59d9b)
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2640 GH#551/#552/#550 treat', () => {
  it('sacred-keep pins famkxci2+TS0043 and e3vhyirx+TS130F', () => {
    const keep = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/architecture/publish-sacred-keep-couples.json'), 'utf8'),
    );
    const couples = keep.couples || [];
    assert.ok(
      couples.some(
        (c) => /famkxci2/i.test(c.mfr) && c.pid === 'TS0043' && c.driverId === 'button_wireless_3',
      ),
      'famkxci2 sacred-keep',
    );
    assert.ok(
      couples.some(
        (c) => /e3vhyirx/i.test(c.mfr) && c.pid === 'TS130F' && c.driverId === 'wall_curtain_switch',
      ),
      'e3vhyirx sacred-keep',
    );
  });

  it('button_wireless_3 front-pins famkxci2 + interview clusters', () => {
    const compose = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_3/driver.compose.json'), 'utf8'),
    );
    const head = compose.zigbee.manufacturerName.slice(0, 4).map((s) => String(s).toLowerCase());
    assert.ok(head.every((m) => m.includes('famkxci2')), 'famkxci2 case forms front-pinned');
    assert.ok(compose.zigbee.productId.includes('TS0043'));
    const ep1 = compose.zigbee.endpoints['1'].clusters;
    assert.deepEqual(ep1.slice().sort((a, b) => a - b), [0, 1, 6, 57344]);
    assert.ok(!ep1.includes(1280) && !ep1.includes(61184));
  });

  it('gkfbdvyx zero-clear gated on meaningful distance', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/device.js'),
      'utf8',
    );
    assert.ok(src.includes('_distanceSeenMeaningful'));
    assert.ok(src.includes('clearPresenceOnZeroDistance && Number(distance) <= 0.05'));
    assert.ok(src.includes('if (this._distanceSeenMeaningful === true)'));
  });

  it('remote_button_wireless has no hashed 3gang stubs that collide with sanitize', () => {
    const flow = JSON.parse(
      fs.readFileSync(
        path.join(ROOT, 'drivers/remote_button_wireless/driver.flow.compose.json'),
        'utf8',
      ),
    );
    const ids = (flow.triggers || []).map((t) => t.id);
    assert.ok(!ids.includes('remote_button_wireless_button_3gang_button_d_59d9b'));
    assert.ok(!ids.includes('remote_button_wireless_button_3gang_button_l_a002e'));
    assert.ok(!ids.includes('remote_button_wireless_button_3gang_button_m_80c37'));
    assert.ok(ids.includes('remote_button_wireless_button_3gang_button_double_press'));
  });

  it('sanitize renames duplicate valid Flow ids', () => {
    const { normalizeFlowCardIds } = require(
      path.join(ROOT, 'scripts/maintenance/sanitize-manifest.cjs'),
    );
    const manifest = {
      flow: {
        triggers: [
          { id: 'remote_button_wireless_button_3gang_button_d_59d9b' },
          { id: 'remote_button_wireless_button_3gang_button_d_59d9b' },
        ],
      },
    };
    const n = normalizeFlowCardIds(manifest);
    assert.ok(n >= 1, 'renamed at least one duplicate');
    const ids = manifest.flow.triggers.map((t) => t.id);
    assert.equal(new Set(ids).size, ids.length, 'ids unique after sanitize');
  });
});
