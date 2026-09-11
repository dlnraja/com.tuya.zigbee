'use strict';

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2466 — Cleverio SA100 _TZ3000_vdfwjopk / TS0219 → siren', () => {
  it('compose locks couple on siren with IAS Zone+WD clusters', () => {
    const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/siren/driver.compose.json'), 'utf8'));
    assert.ok(c.zigbee.manufacturerName.some((m) => /vdfwjopk/i.test(m)));
    assert.ok(c.zigbee.productId.includes('TS0219'));
    assert.deepStrictEqual(c.zigbee.endpoints['1'].clusters, [0, 1280, 1282]);
  });

  it('handheld_remote must not claim vdfwjopk or TS0219', () => {
    const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/handheld_remote_4_buttons/driver.compose.json'), 'utf8'));
    assert.ok(!c.zigbee.manufacturerName.some((m) => /vdfwjopk/i.test(m)));
    assert.ok(!c.zigbee.productId.some((p) => String(p).toUpperCase() === 'TS0219'));
  });

  it('FPDB + sacred-keep route to siren', () => {
    const { FINGERPRINT_DB } = require(path.join(ROOT, 'lib/DeviceFingerprintDB'));
    assert.strictEqual(FINGERPRINT_DB['_TZ3000_vdfwjopk|TS0219'].driver, 'siren');
    const keep = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/architecture/publish-sacred-keep-couples.json'), 'utf8'));
    const couples = keep.couples || keep;
    const hit = couples.find((c) => /vdfwjopk/i.test(c.mfr || '') && /TS0219/i.test(c.pid || ''));
    assert.ok(hit);
    assert.strictEqual(hit.driverId, 'siren');
  });
});
