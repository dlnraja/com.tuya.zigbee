'use strict';
// P3072c: repair screen shows reachability (no secrets) and can re-probe UDP to adopt a new IP.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { buildRepairStatus, reprobe, MAX_WAIT_MS } = require('../../lib/tuya-local/LanRepairStatus');

const ROOT = path.resolve(__dirname, '../..');

function fakeDevice(settings, extra = {}) {
  const writes = [];
  const d = {
    _s: { ...settings }, writes,
    getSettings() { return { ...this._s }; },
    async setSettings(p) { writes.push(p); Object.assign(this._s, p); },
    ...extra,
  };
  return d;
}
function fakeDisc(map, onBurst) {
  return { getDevice: (id) => map[id] || null, burstProbe: async () => { if (onBurst) {onBurst();} return { probes: 1 }; } };
}
const noSleep = async () => {};

describe('P3072c LanRepairStatus', () => {
  it('status is secret-free and flags an IP mismatch', () => {
    const d = fakeDevice({ device_id: 'bf01', ip: '10.0.0.5', local_key: 'SECRETKEY1234567' }, {
      _connected: false, _client: { version: '3.4' },
      _connRecorder: { toJSON: () => [{ t: 'x', event: 'error', message: 'ECONNREFUSED' }] },
    });
    const s = buildRepairStatus(d, fakeDisc({ bf01: { ip: '10.0.0.9', version: '3.4', lastSeen: 1000 } }), 6000);
    assert.strictEqual(s.ip, '10.0.0.5'); assert.strictEqual(s.protocol, '3.4');
    assert.deepStrictEqual(s.udp, { ip: '10.0.0.9', version: '3.4', ageSec: 5 });
    assert.strictEqual(s.ipMismatch, true); assert.strictEqual(s.hasKey, true);
    assert.strictEqual(s.lastError.message, 'ECONNREFUSED');
    assert.ok(!JSON.stringify(s).includes('SECRETKEY'));
  });
  it('status works without UDP discovery', () => {
    const s = buildRepairStatus(fakeDevice({ ip_address: '10.0.0.7' }), null);
    assert.strictEqual(s.udpRunning, false); assert.strictEqual(s.udp, null); assert.strictEqual(s.ip, '10.0.0.7');
  });
  it('re-probe adopts a newly heard IP in every key and rebinds the client', async () => {
    const map = { bf01: { ip: '10.0.0.5', lastSeen: 1 } };
    const rebinds = [];
    const d = fakeDevice({ device_id: 'bf01', ip: '10.0.0.5', ip_address: '10.0.0.5' }, { _client: { updateIP: (ip) => rebinds.push(ip) } });
    const r = await reprobe(d, fakeDisc(map, () => { map.bf01 = { ip: '10.0.0.42', lastSeen: 2 }; }), { sleep: noSleep });
    assert.deepStrictEqual(r, { ok: true, ip: '10.0.0.42', changed: true });
    assert.deepStrictEqual(d.writes.pop(), { ip: '10.0.0.42', ip_address: '10.0.0.42' });
    assert.deepStrictEqual(rebinds, ['10.0.0.42']);
  });
  it('re-probe is bounded and reports not_heard / udp_unavailable without throwing', async () => {
    let sleeps = 0;
    const d = fakeDevice({ device_id: 'bf02', ip: '10.0.0.5' });
    const r = await reprobe(d, fakeDisc({}), { waitMs: 999999, pollMs: 100, sleep: async () => { sleeps++; } });
    assert.strictEqual(r.reason, 'not_heard');
    assert.ok(sleeps <= MAX_WAIT_MS / 100 + 1, String(sleeps));
    assert.strictEqual((await reprobe(d, null)).reason, 'udp_unavailable');
    assert.strictEqual((await reprobe(fakeDevice({}), fakeDisc({}))).reason, 'no_device_id');
    const bad = fakeDevice({ device_id: 'bf03', ip: '1.1.1.1' }, { setSettings: async () => { throw new Error('boom'); } });
    assert.strictEqual((await reprobe(bad, fakeDisc({ bf03: { ip: '10.0.0.8', lastSeen: 5 } }), { sleep: noSleep })).ok, false);
  });
  it('driver registers both handlers and every Tuya repair view uses them', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/tuya-local/TuyaLocalDriver.js'), 'utf8');
    assert.ok(src.includes("setHandler('repair_status'") && src.includes("setHandler('re_probe'"));
    let views = 0;
    for (const d of fs.readdirSync(path.join(ROOT, 'drivers')).filter((x) => x.startsWith('wifi_'))) {
      const f = path.join(ROOT, 'drivers', d, 'repair', 'configure.html');
      if (!fs.existsSync(f)) {continue;}
      const html = fs.readFileSync(f, 'utf8');
      if (!html.includes("emit('refresh_key'")) {continue;}
      assert.ok(html.includes("emit('repair_status'") && html.includes("emit('re_probe'"), d);
      views++;
    }
    assert.ok(views >= 32, String(views));
  });
});
