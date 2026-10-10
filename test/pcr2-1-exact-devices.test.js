'use strict';
/* eslint-env mocha */
// PCr2-1: non-Tuya devices from zigbee-herdsman-converters placed in drivers that already speak their clusters.
// WHY(bisect A2): HEIMAN / SONOFF MINI-ZBRBS couples were temporarily dropped from compose while isolating
// Athom AggregateError (9.0.1331). Fold #3499 proved spi/whd02 toxic — these brand couples stay out of
// the published payload until a dedicated restore bisect. Tests assert the hold + cluster readiness.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const zb = (d) => JSON.parse(fs.readFileSync(path.join(root, 'drivers', d, 'driver.compose.json'), 'utf8')).zigbee;

describe('PCr2-1 exact devices', () => {
  it('curtain_module keeps Window Covering 0x0102 (SONOFF MINI-ZBRBS restore pending A2)', () => {
    const z = zb('curtain_module');
    assert.ok(z.endpoints['1'].clusters.includes(258));
    assert.equal(z.manufacturerName.includes('SONOFF'), false, 'SONOFF still held out after A2 bisect');
    assert.equal(z.productId.includes('MINI-ZBRBS'), false);
  });
  it('button_emergency_sos keeps IAS ACE 0x0501 (HEIMAN RC-EF-3.0 restore pending A2)', () => {
    const z = zb('button_emergency_sos');
    assert.ok(z.endpoints['1'].clusters.includes(1281));
    assert.equal(z.manufacturerName.includes('HEIMAN'), false, 'HEIMAN still held out after A2 bisect');
    assert.equal(z.productId.includes('RC-EF-3.0'), false);
  });
  it('universal_zigbee still carries HEIMAN brand (cartesian fallback intact)', () => {
    assert.ok(zb('universal_zigbee').manufacturerName.includes('HEIMAN'));
  });
});
