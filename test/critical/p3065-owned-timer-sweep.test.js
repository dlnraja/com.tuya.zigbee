'use strict';
// P3065: owned-timer sweep on delete/uninit + lifecycle leak regression (devices freed, no armed intervals).
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '../..');
const { sweepOwnedTimers, isTimer } = require('../../lib/utils/OwnedTimerSweep');

function fakeHomey() {
  const live = new Set();
  return {
    live,
    setInterval(fn, ms) { const t = setInterval(fn, ms); t.unref(); live.add(t); return t; },
    setTimeout(fn, ms) { const t = setTimeout(fn, ms); t.unref(); live.add(t); return t; },
    clearInterval(t) { live.delete(t); clearInterval(t); },
    clearTimeout(t) { live.delete(t); clearTimeout(t); },
  };
}

test('sweep clears timers on the device and on managers it owns, nothing else', () => {
  const homey = fakeHomey();
  const appTimer = homey.setInterval(() => {}, 1000); // app-level, must survive
  homey.appTimer = appTimer;
  const driver = { tick: homey.setInterval(() => {}, 1000) }; // driver-level, must survive
  const device = { homey, driver };
  device._poll = homey.setInterval(() => {}, 1000);
  device.list = [homey.setTimeout(() => {}, 1000)];
  device.battery = { device, _iv: homey.setInterval(() => {}, 1000), sub: null };
  device.battery.sub = { device, t: homey.setInterval(() => {}, 1000) };
  device.shared = { notOwned: true, t: homey.setInterval(() => {}, 1000) }; // not owned -> untouched
  const r = sweepOwnedTimers(device);
  assert.strictEqual(r.cleared, 4);
  assert.strictEqual(device._poll, null);
  assert.strictEqual(device.battery._iv, null);
  assert.ok(homey.live.has(appTimer));
  assert.ok(homey.live.has(driver.tick));
  assert.ok(homey.live.has(device.shared.t));
  for (const t of homey.live) {clearInterval(t);}
});

test('sweep never throws on odd input and detects Node timers only', () => {
  assert.deepStrictEqual(sweepOwnedTimers(null), { cleared: 0 });
  const o = {}; Object.defineProperty(o, 'boom', { enumerable: true, get() { throw new Error('x'); } });
  assert.doesNotThrow(() => sweepOwnedTimers(o));
  const t = setTimeout(() => {}, 1); clearTimeout(t);
  assert.ok(isTimer(t));
  assert.ok(!isTimer({ hasRef() {}, refresh() {} }));
});

test('TuyaZigbeeDevice exposes warn() (Homey has no warn)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaZigbeeDevice.js'), 'utf8');
  assert.match(src, /\n {2}warn\(\.\.\.args\) \{/);
  assert.match(src, /OwnedTimerSweep'\)\.sweepOwnedTimers\(this/);
});

test('lifecycle harness: 3 delete/re-pair cycles leave no armed interval and no growing device count', { timeout: 240000 }, () => {
  const out = path.join(os.tmpdir(), `p3065-harness-${process.pid}.json`);
  execFileSync(process.execPath, ['--expose-gc', '--max-old-space-size=256', path.join(ROOT, 'scripts/perf/p3065-lifecycle-leak-harness.js'), ROOT, '40', '40', '3'], {
    cwd: ROOT, stdio: 'ignore', timeout: 230000,
    env: { ...process.env, OUT: out, DRV: 'switch_1gang,switch_2gang,button_wireless_4,climate_sensor,plug_energy_monitor,water_leak_sensor,motion_sensor' },
  });
  const r = JSON.parse(fs.readFileSync(out, 'utf8'));
  fs.unlinkSync(out);
  const last = r.cycles[r.cycles.length - 1];
  const first = r.cycles[0];
  assert.ok(last.timersLeft <= 2, `intervals still armed after delete: ${last.timersLeft} ${JSON.stringify(r.timerSrc)}`);
  const alive = (c) => Object.values(c.aliveDevices).reduce((a, b) => a + b, 0);
  assert.ok(alive(last) - alive(first) <= 4, `dead devices accumulate: ${alive(first)} -> ${alive(last)}`);
  assert.ok(last.afterDelete - first.afterDelete < 3, `heap after delete grows per cycle: ${first.afterDelete} -> ${last.afterDelete} MB`);
});
