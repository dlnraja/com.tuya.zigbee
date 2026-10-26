'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const DeviceIOFacade = require(path.join(__dirname, '..', '..', 'lib/io/DeviceIOFacade'));

function mkDevice() {
  const armed = new Set();
  const homey = {
    setInterval: (f, ms) => { const t = setInterval(f, ms); t.unref(); armed.add(t); return t; },
    clearInterval: (t) => { armed.delete(t); clearInterval(t); },
    setTimeout, clearTimeout,
  };
  return { armed, dev: { homey, log() {}, error() {}, hasCapability: () => false, getSetting: () => null, getData: () => ({}), getStoreValue: () => null } };
}

test('P3065 report-poll fallback is never armed for a deleted device (async interview race)', () => {
  const { armed, dev } = mkDevice();
  const io = new DeviceIOFacade(dev);
  dev._destroyed = true;
  assert.strictEqual(io.startReportingPollFallback({ intervalMs: 1000 }), false);
  assert.strictEqual(armed.size, 0);
});

test('P3065 report-poll fallback self-clears on first tick after delete, and stop is idempotent', async () => {
  const { armed, dev } = mkDevice();
  const io = new DeviceIOFacade(dev);
  assert.strictEqual(io.startReportingPollFallback({ intervalMs: 20, capabilities: [] }), true);
  assert.strictEqual(armed.size, 1);
  dev._destroyed = true;
  await new Promise((r) => setTimeout(r, 80));
  assert.strictEqual(armed.size, 0);
  assert.strictEqual(io._reportPollTimer, null);
  io.stopReportingPollFallback(); io.stopReportingPollFallback();
});
