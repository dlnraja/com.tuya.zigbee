'use strict';
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const assert = require('assert');
const { DeviceCoordinator, resolveProfile } = require('../../lib/coordinator/DeviceCoordinator');

const clock = () => { let t = 1000; const f = () => t; f.adv = (ms) => { t += ms; }; return f; };

describe('Spec 003: DeviceCoordinator', () => {
  it('leading edge passes, cross-channel duplicate dropped, change passes', () => {
    const now = clock(); const c = new DeviceCoordinator({ deviceClass: 'socket' }, { now });
    assert.strictEqual(c.ingest('zcl', 'onoff', true).apply, true);
    now.adv(20); assert.strictEqual(c.ingest('dp', 'onoff', true).apply, false);
    now.adv(20); assert.strictEqual(c.ingest('dp', 'onoff', false).apply, true);
  });
  it('same value after window passes again', () => {
    const now = clock(); const c = new DeviceCoordinator({}, { now, profile: { dedupeMs: 300, commandMs: 0 } });
    c.ingest('zcl', 'measure_power', 10); now.adv(400);
    assert.strictEqual(c.ingest('zcl', 'measure_power', 10).apply, true);
  });
  it('seq duplicate dropped even with different value representation', () => {
    const now = clock(); const c = new DeviceCoordinator({}, { now });
    assert.strictEqual(c.ingest('dp', 'k', 1, { seq: 7 }).apply, true);
    assert.strictEqual(c.ingest('dp', 'k', 2, { seq: 7 }).apply, false);
  });
  it('button press types stay distinct; repeat of same press dropped', () => {
    const now = clock(); const c = new DeviceCoordinator({ deviceClass: 'button' }, { now });
    assert.ok(c.ingest('zcl', 'btn1', 1, { pressType: 'single' }).apply);
    now.adv(5); assert.ok(!c.ingest('dp', 'btn1', 1, { pressType: 'single' }).apply);
    now.adv(5); assert.ok(c.ingest('dp', 'btn1', 1, { pressType: 'double' }).apply);
  });
  it('identical command collapsed; echo flagged', () => {
    const now = clock(); const c = new DeviceCoordinator({ deviceClass: 'light' }, { now });
    assert.ok(c.command('onoff', true)); now.adv(50);
    assert.ok(!c.command('onoff', true));
    assert.ok(c.command('onoff', false));
    const r = c.ingest('zcl', 'onoff', false); assert.ok(r.apply && r.echo);
  });
  it('profile resolution: mfrPid > driver > class > default, case-insensitive', () => {
    const p = { default: { dedupeMs: 1 }, deviceClass: { button: { dedupeMs: 2 } }, driver: { wall_remote_1_gang: { dedupeMs: 3 } }, mfrPid: { '_TZ3000_ABC|TS0041': { dedupeMs: 4 } } };
    assert.strictEqual(resolveProfile({ deviceClass: 'BUTTON' }, p).dedupeMs, 2);
    assert.strictEqual(resolveProfile({ deviceClass: 'button', driverId: 'wall_remote_1_gang' }, p).dedupeMs, 3);
    assert.strictEqual(resolveProfile({ deviceClass: 'button', driverId: 'wall_remote_1_gang', mfr: '_tz3000_abc', pid: 'ts0041' }, p).dedupeMs, 4);
  });
  it('T3 attach: button cross-channel copy dropped, same-channel double click kept, virtual untouched', () => {
    const { admitButtonPress, admitCommand, getCoordinator } = require('../../lib/coordinator/attach');
    const dev = (cls, setting) => ({ driver: { id: 'x', manifest: { class: cls } }, getSettings: () => ({}), getSetting: () => setting, getStoreValue: () => '' });
    const d = dev('button');
    assert.ok(admitButtonPress(d, 1, 'single', { source: 'physical' }));
    assert.ok(!admitButtonPress(d, 1, 'single', { source: 'e000-s4' }));
    assert.ok(admitButtonPress(d, 1, 'single', { source: 'physical' }));
    assert.ok(admitButtonPress(d, 1, 'single', { source: 'virtual' }));
    assert.ok(admitButtonPress(d, 1, 'double', { source: 'e000-s4' }));
    const off = dev('button', 'off'); assert.strictEqual(getCoordinator(off), null);
    assert.ok(admitButtonPress(off, 1, 'single', {})); assert.ok(admitButtonPress(off, 1, 'single', { source: 'dp' }));
    const sock = dev('socket'); assert.strictEqual(getCoordinator(sock), null);
    assert.ok(admitCommand(sock, 'dp1', true)); assert.ok(admitCommand(sock, 'dp1', true));
  });
});
