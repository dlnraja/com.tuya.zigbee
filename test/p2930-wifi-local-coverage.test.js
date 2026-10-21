'use strict';
const assert = require('assert');
const gate = require('../lib/tuya-local/LocalConnectionGate');
const plan = require('../lib/tuya-local/TuyaCommandPlan');
const { parseImport } = require('../lib/tuya-local/TinyTuyaImport');
const auto = require('../lib/tuya-local/GenericDpAutoMapper');
const reg = require('../lib/tuya-local/WiFiDPRegistry');
const cat = require('../data/wifi/tuya-local-product-schemas.json');

describe('P2930 WiFi/local coverage', () => {
  afterEach(() => gate._reset());

  it('gate allows one live owner per device and reclaims destroyed owners', () => {
    const a = {}; const b = {};
    assert.ok(gate.acquire('dev1', a));
    assert.ok(!gate.acquire('dev1', b));
    a._destroyed = true;
    assert.ok(gate.acquire('dev1', b));
    gate.release('dev1', a); assert.strictEqual(gate.holder('dev1'), b);
    gate.release('dev1', b); assert.strictEqual(gate.size(), 0);
  });

  it('command plan: control vs control_new, query, refresh 18, cid', () => {
    assert.strictEqual(plan.setCommand('3.3'), 7);
    assert.strictEqual(plan.setCommand('3.4'), 13);
    assert.strictEqual(plan.setCommand('3.5'), 13);
    assert.strictEqual(plan.queryCommand('3.3', 'a'.repeat(22)), 13);
    assert.strictEqual(plan.queryCommand('3.3', 'a'.repeat(20)), 10);
    assert.strictEqual(plan.queryCommand('3.5', 'x'), 16);
    assert.deepStrictEqual(plan.refreshPayload([19, '20', 19, 999, -1]), { dpId: [19, 20] });
    assert.deepStrictEqual(plan.refreshPayload([]), { dpId: [18, 19, 20] });
    assert.deepStrictEqual(plan.setPayload({ 1: true }, { cid: 'abc' }), { dps: { 1: true }, cid: 'abc' });
  });

  it('imports a tinytuya wizard export with gateway sub-devices', () => {
    const r = parseImport(JSON.stringify([
      { name: 'Hub', id: 'gw1', key: '0123456789abcdef', ip: '192.168.1.5', version: '3.4' },
      { name: 'Plug', id: 'p1', key: 'short' },
      { name: 'Sub', id: 's1', node_id: 'a4c1', parent: 'gw1', key: '' },
      { id: 'p1' }, { nope: 1 },
    ]));
    assert.strictEqual(r.devices.length, 3);
    const sub = r.devices.find((d) => d.id === 's1');
    assert.ok(sub.subDevice); assert.strictEqual(sub.gateway.key, '0123456789abcdef');
    assert.ok(r.devices.find((d) => d.id === 'p1').needsKey);
    assert.strictEqual(parseImport('{bad').error, 'invalid_json');
  });

  it('generic auto-mapper proposes only standard layouts', () => {
    const g = auto.highConfidence({ 1: true, 2: false, 18: 120, 19: 455, 20: 2301 });
    assert.strictEqual(g['1'].capability, 'onoff');
    assert.ok(!g['2']); // medium confidence only
    assert.strictEqual(g['20'].divisor, 10);
    assert.deepStrictEqual(auto.highConfidence({ 20: 5 }), {});
  });

  it('tuya-local catalog has exact sourced product ids and feeds enrichment', () => {
    assert.ok(cat._meta.commit && cat._meta.source.includes('make-all/tuya-local'));
    assert.ok(Object.keys(cat.p).length > 1000);
    for (const [id, fi] of Object.entries(cat.p)) {
      assert.ok(/^[a-z0-9]{8,32}$/.test(id), id);
      assert.ok(cat.f[fi] && cat.s[cat.f[fi][1]], id);
    }
    reg._resetCommunityCacheForTests();
    const [pid, fi] = Object.entries(cat.p)[0]; const src = cat.f[fi][0];
    const dev = { dpMappings: {}, getSettings: () => ({ product_id: pid }), log() {} };
    assert.ok(reg.enrichWiFiDpMappings(dev) > 0);
    assert.strictEqual(reg.lookupTuyaLocalSchema(pid).source, `make-all/tuya-local devices/${src}.yaml`);
  });

  it('client bounds its live queue and retries socket hang up', async () => {
    const C = require('../lib/tuya-local/TuyaLocalClient');
    const fs = require('fs');
    const srcTxt = fs.readFileSync(require.resolve('../lib/tuya-local/TuyaLocalClient'), 'utf8');
    assert.ok(/socket hang up/.test(srcTxt));
    const c = Object.create(C.prototype);
    c._commandQueue = new Array(64).fill({}); c._commandBusy = true; c._commandQueueLimit = 64;
    await assert.rejects(c._enqueue(() => 1), /queue full/);
  });
});
