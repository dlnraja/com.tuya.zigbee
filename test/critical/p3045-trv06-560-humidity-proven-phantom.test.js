'use strict';
// P3045 — #560 (thanks artisare): TRV06 _TZE200_rxq4iti9 has no humidity sensor. Proof: Z2M
// TS0601_thermostat_3 exposes no humidity and maps no humidity DP; Z2M disc. #24659 agrees. So the
// capability is a proven phantom for this exact couple: removed even if a misrouted DP left a value,
// and forbidden so it is never re-added. Other TRVs of the driver keep measure_humidity.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
const src = fs.readFileSync(path.join(root, 'drivers', 'device_radiator_valve', 'device.js'), 'utf8');

function extract(name) {
  const start = src.indexOf(`  async ${name}() {`);
  assert.ok(start > 0, `${name} present`);
  const end = src.indexOf('\n  }\n', start);
  const body = src.slice(src.indexOf('{', start) + 1, end);
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
  return new AsyncFunction(body);
}

function fakeDevice(mfr, caps, values = {}) {
  const set = new Set(caps);
  return {
    logs: [],
    _forbiddenCapabilities: undefined,
    _isNoHumidityTrv() { return mfr.toLowerCase() === '_tze200_rxq4iti9'; },
    hasCapability: (c) => set.has(c),
    getCapabilityValue: (c) => c in values ? values[c] : null,
    removeCapability: async (c) => { set.delete(c); },
    log(...a) { this.logs.push(a.join(' ')); },
    caps: set,
  };
}

const strip = extract('_stripPhantomHumidity');

test('rxq4iti9: phantom humidity removed even with a misrouted value, and forbidden', async () => {
  const d = fakeDevice('_TZE200_rxq4iti9', ['measure_humidity', 'measure_temperature'], { measure_humidity: 47 });
  await strip.call(d);
  assert.strictEqual(d.caps.has('measure_humidity'), false);
  assert.ok(d._forbiddenCapabilities.includes('measure_humidity'));
  assert.ok(d.caps.has('measure_temperature'));
});

test('rxq4iti9 without the capability: only forbidden, no throw', async () => {
  const d = fakeDevice('_TZE200_rxq4iti9', ['measure_temperature']);
  await strip.call(d);
  assert.deepStrictEqual(d._forbiddenCapabilities, ['measure_humidity']);
});

test('other TRVs keep measure_humidity untouched', async () => {
  const d = fakeDevice('_TZE200_bvu2wnxz', ['measure_humidity'], { measure_humidity: 50 });
  await strip.call(d);
  assert.ok(d.caps.has('measure_humidity'));
  assert.strictEqual(d._forbiddenCapabilities, undefined);
});

test('driver-wide capability list unchanged (additive, no pairing impact)', () => {
  const c = JSON.parse(fs.readFileSync(path.join(root, 'drivers', 'device_radiator_valve', 'driver.compose.json'), 'utf8'));
  assert.ok(c.capabilities.includes('measure_humidity'));
});
