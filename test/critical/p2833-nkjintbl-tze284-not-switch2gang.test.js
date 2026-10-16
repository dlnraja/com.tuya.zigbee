'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
describe('P2833 nkjintbl TZE284 ambiguous not on switch_2gang', () => {
  it('P2605b: _TZE284_nkjintbl|TS0601 forbidden on switch_2gang (anti-bot)', () => {
    const z = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/switch_2gang/driver.compose.json'), 'utf8')).zigbee;
    assert.ok(!(z.manufacturerName || []).some((m) => /_TZE284_nkjintbl/i.test(m)));
    // TZE200 sacred keep
    assert.ok((z.manufacturerName || []).some((m) => /_TZE200_nkjintbl/i.test(m)));
    assert.ok((z.productId || []).some((p) => String(p).toUpperCase() === 'TS0601'));
  });
  it('registry p2605b still forbids TZE284 on switch_2gang', () => {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8'));
    const e = (reg.cases || []).find((c) => c.id === 'p2605b-nkjintbl-tze284-ambiguous');
    assert.ok(e);
    assert.ok((e.forbiddenDrivers || []).includes('switch_2gang'));
  });
});
