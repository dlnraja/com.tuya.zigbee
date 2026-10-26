'use strict';
// P3072 step B: LanRebindRouter follows a Wi-Fi device to its new IP, bounded and rate-limited.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { LanRebindRouter, isUsableIpv4 } = require('../../lib/wifi/LanRebindRouter');

function fakeDevice(settings) {
  const dev = {
    _s: { ...settings },
    calls: [],
    updated: [],
    getSettings() { return this._s; },
    async setSettings(p) { this.calls.push(p); Object.assign(this._s, p); },
    _client: { updateIP(ip) { dev.updated.push(ip); } },
  };
  return dev;
}

describe('P3072b LanRebindRouter', () => {
  it('rebinds a device whose IP changed: every IP key + live client', async () => {
    let t = 0;
    const d = fakeDevice({ device_id: 'bf01', ip: '192.168.1.10', ip_address: '192.168.1.10' });
    const r = new LanRebindRouter({ listDevices: () => [d], now: () => t });
    assert.strictEqual(await r.handle({ deviceId: 'bf01', ip: '192.168.1.42' }), 'rebound');
    assert.deepStrictEqual(d.calls[0], { ip: '192.168.1.42', ip_address: '192.168.1.42' });
    assert.deepStrictEqual(d.updated, ['192.168.1.42']);
  });
  it('prefers device.onLanIpChanged when the device has it', async () => {
    const d = fakeDevice({ device_id: 'x', device_ip: '10.0.0.2' });
    const seen = [];
    d.onLanIpChanged = async (ip) => { seen.push(ip); };
    const r = new LanRebindRouter({ listDevices: () => [d] });
    await r.handle({ deviceId: 'x', ip: '10.0.0.3' });
    assert.deepStrictEqual(d.calls[0], { ip: '10.0.0.3', device_ip: '10.0.0.3' });
    assert.deepStrictEqual(seen, ['10.0.0.3']);
    assert.deepStrictEqual(d.updated, []);
  });
  it('no-op when the IP is the same, unknown device, or not a usable IPv4', async () => {
    const d = fakeDevice({ device_id: 'a', ip: '10.0.0.2' });
    const r = new LanRebindRouter({ listDevices: () => [d] });
    assert.strictEqual(await r.handle({ deviceId: 'a', ip: '10.0.0.2' }), 'same');
    assert.strictEqual(await r.handle({ deviceId: 'zz', ip: '10.0.0.9' }), 'ignored');
    for (const bad of ['', '0.0.0.0', '127.0.0.1', '169.254.3.4', '300.1.1.1', 'fe80::1', null]) {
      assert.strictEqual(await r.handle({ deviceId: 'a', ip: bad }), 'ignored', String(bad));
    }
    assert.strictEqual(d.calls.length, 0);
    assert.ok(isUsableIpv4('192.168.0.1') && !isUsableIpv4('192.168.0'));
  });
  it('rate-limits a flapping device to one rebind per interval', async () => {
    let t = 0;
    const d = fakeDevice({ device_id: 'f', ip: '10.0.0.1' });
    const r = new LanRebindRouter({ listDevices: () => [d], now: () => t, minIntervalMs: 60000 });
    for (let i = 0; i < 50; i++) { t += 1000; await r.handle({ deviceId: 'f', ip: i % 2 ? '10.0.0.1' : '10.0.0.2' }); }
    assert.strictEqual(d.calls.length, 1);
    t += 61000;
    await r.handle({ deviceId: 'f', ip: '10.0.0.7' });
    assert.strictEqual(d.calls.length, 2);
  });
  it('never throws when a device fails or the list throws', async () => {
    const d = fakeDevice({ device_id: 'e', ip: '10.0.0.1' });
    d.setSettings = async () => { throw new Error('boom'); };
    const r = new LanRebindRouter({ listDevices: () => [d] });
    assert.strictEqual(await r.handle({ deviceId: 'e', ip: '10.0.0.5' }), 'failed');
    const r2 = new LanRebindRouter({ listDevices: () => { throw new Error('x'); } });
    assert.strictEqual(await r2.handle({ deviceId: 'e', ip: '10.0.0.5' }), 'ignored');
  });
  it('soak: 20k announcements over 2000 ids keep the table bounded', async () => {
    let t = 0;
    const devs = [];
    for (let i = 0; i < 2000; i++) {devs.push(fakeDevice({ device_id: 'd' + i, ip: '10.1.0.1' }));}
    const byId = new Map(devs.map((x) => [x._s.device_id, x]));
    const r = new LanRebindRouter({ listDevices: () => [byId.get(cur)], now: () => t, maxEntries: 256 });
    let cur;
    for (let n = 0; n < 20000; n++) {
      t += 50;
      cur = 'd' + (n * 7919 % 2000);
      await r.handle({ deviceId: cur, ip: '10.1.' + (n % 3) + '.' + (1 + (n % 200)) });
    }
    assert.ok(r.size() <= 256, 'size ' + r.size());
    const total = devs.reduce((a, x) => a + x.calls.length, 0);
    assert.ok(total > 0 && total <= 20000);
    assert.strictEqual(r.stats.failed, 0);
  });
  it('app.js routes UDP IP changes through the router (old loop kept as fallback)', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../app.js'), 'utf8');
    assert.ok(src.includes("require('./lib/wifi/LanRebindRouter')"));
    assert.ok(src.includes('[SMART-HEAL] IP change'), 'historical fallback kept');
  });
});
