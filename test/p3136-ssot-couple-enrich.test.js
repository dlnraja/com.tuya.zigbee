'use strict';
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { parseZ2M } = require('../tools/ci/ssot-couple-enrich');

describe('P3136 SSOT couple-sources ledger', () => {
  const doc = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'ssot', 'couple-sources.json'), 'utf8'));
  it('has meta counts and exact-couple keys only', () => {
    assert.ok(doc._meta.counts.total > 0);
    for (const k of Object.keys(doc.couples)) assert.match(k, /^_t[a-z0-9]{2,5}_[a-z0-9]{4,16}\|[A-Za-z0-9_. +/\-]{2,40}$/);
  });
  it('verified entries always carry an external source', () => {
    for (const c of Object.values(doc.couples)) {
      if (c.status !== 'verified') continue;
      assert.ok(c.sources.some((s) => s.source === 'z2m' || s.source === 'zha' || s.external), c.mfr + '|' + c.pid);
    }
  });
  it('flags _TZ3000_dfgbtub0|TS0044 as unverified and TS0042 as verified (Z2M whitelabel)', () => {
    assert.strictEqual(doc.couples['_tz3000_dfgbtub0|TS0044'].status, 'unverified');
    assert.strictEqual(doc.couples['_tz3000_dfgbtub0|TS0042'].status, 'verified');
  });
  it('keeps no house/user data', () => {
    const raw = JSON.stringify(doc);
    assert.ok(!/@|ieee|0x[0-9a-f]{16}/i.test(raw));
  });
  it('parser extracts whitelabel couples with the enclosing model id, ignores junk', () => {
    const src = '\n    {\n        zigbeeModel: ["TS0042"],\n        whiteLabel: [tuya.whitelabel("V", "M", "d", ["_TZ3000_abcd1234", "evil();"])],\n    },\n';
    const m = parseZ2M(src);
    assert.ok(m.has('_tz3000_abcd1234|TS0042'));
    assert.strictEqual(m.size, 1);
  });
});

describe('P3136b ZHA #1746 facts (TS0042 remotes)', () => {
  const doc = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'ssot', 'couple-sources.json'), 'utf8'));
  it('both #1746 couples carry the curated source and stay on button_wireless_2', () => {
    for (const k of ['_tz3000_dfgbtub0|TS0042', '_tz3000_5e235jpa|TS0042']) {
      assert.ok(doc.couples[k].sources.some((s) => s.source === 'curated'), k);
      assert.ok(doc.couples[k].drivers.includes('button_wireless_2'), k);
    }
  });
  it('0xFD press_type map matches the ZHA quirk (0 single, 1 double, 2 long)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'buttons', 'ButtonEventRouter.js'), 'utf8');
    assert.match(src, /FD_PRESS = \{ 0: 'single', 1: 'double', 2: 'long' \}/);
  });
  it('TS0042 profile never configures battery reporting (ZHA PR #2288)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'drivers', 'button_wireless_2', 'device.js'), 'utf8');
    assert.match(src, /skipBatteryReporting: true/);
  });
});
