'use strict';
// 2026-10-11 fold: MiBoxer FUT089Z (_TZ3000_xwh1e22x + TS1002) ships via button_wireless_4 with its own
// zone profile (remote_rgbcct_8zone reverted: new driver ids rejected by Athom processing).
const assert = require('assert');
const fut = require('../../lib/devices/MiBoxerFut089zZones');
const comp = require('../../drivers/button_wireless_4/driver.compose.json');
const flow = require('../../drivers/button_wireless_4/driver.flow.compose.json');
const dev = (mfr, pid) => ({ getSetting: (k) => (k === 'zb_manufacturer_name' ? mfr : k === 'zb_model_id' ? pid : null) });
describe('fold FUT089Z -> button_wireless_4', () => {
  it('couple listed and pid present', () => {
    assert.ok(comp.zigbee.manufacturerName.includes('_TZ3000_xwh1e22x'));
    assert.ok(comp.zigbee.productId.includes('TS1002'));
  });
  it('profile fires only for the exact couple', () => {
    assert.strictEqual(fut.isFut089z(dev('_TZ3000_xwh1e22x', 'TS1002')), true);
    assert.strictEqual(fut.isFut089z(dev('_TZ3000_xwh1e22x', 'TS0044')), false);
    assert.strictEqual(fut.isFut089z(dev('_TZ3000_other', 'TS1002')), false);
  });
  it('zones from group ids (base 100)', () => {
    assert.strictEqual(fut.zoneFromMeta({ groupId: 103 }), 3);
    assert.strictEqual(fut.zoneFromMeta({ groupId: 50 }), 0);
    assert.strictEqual(fut.zoneFromMeta({}), 0);
  });
  it('one trigger card per event, filtered on this driver', () => {
    for (const ev of fut.EVENTS) {
      const c = flow.triggers.find((t) => t.id === `${fut.TRIGGER_PREFIX}${ev}`);
      assert.ok(c, ev);
      // WHY(P2874): homey app build adds the driver_id=button_wireless_4 device arg itself;
      // a hand-written one is built twice.
      assert.ok(!(c.args || []).some((a) => a.type === 'device'), `${ev} has no hand-written device arg`);
    }
  });
});
