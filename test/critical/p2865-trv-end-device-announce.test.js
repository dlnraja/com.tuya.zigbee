'use strict';
/**
 * Issue #560 (artisare, TRV06 _TZE200_rxq4iti9): the radiator-valve driver declared onEndDeviceAnnounce()
 * twice. In a JS class the later definition wins, so the P2598 "re-query DPs when the sleepy valve wakes up"
 * path was dead code. Keep exactly one definition and make sure it still does both jobs.
 * (rewritten in our own words)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', '..', 'drivers/device_radiator_valve/device.js'), 'utf8');

describe('P2865 #560 TRV onEndDeviceAnnounce is defined once and does both jobs', () => {
  it('has a single onEndDeviceAnnounce definition', () => {
    const n = (src.match(/^\s*async onEndDeviceAnnounce\(/gm) || []).length;
    assert.strictEqual(n, 1);
  });
  it('that method refreshes the DPs (P2598) and keeps the rejoin bookkeeping', () => {
    const i = src.search(/^\s*async onEndDeviceAnnounce\(/m);
    const body = src.slice(i, i + 1400);
    assert.ok(/_scheduleTrvDpRefresh\(\)/.test(body));
    assert.ok(/_updateLastSeen/.test(body));
    assert.ok(/forceRecovery/.test(body));
  });
});
