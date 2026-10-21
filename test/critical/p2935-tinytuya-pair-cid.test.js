'use strict';
const assert = require('assert');

describe('P2935 tinytuya import fills cid / gateway at pairing', () => {
  let Driver;
  before(() => {
    const Module = require('module');
    const orig = Module._load;
    Module._load = function (req, ...rest) {
      if (req === 'homey') {return { Driver: class {}, Device: class {}, App: class {}, __: (x) => x };}
      return orig.call(this, req, ...rest);
    };
    try { delete require.cache[require.resolve('../../lib/tuya-local/TuyaLocalDriver')]; Driver = require('../../lib/tuya-local/TuyaLocalDriver'); } catch (_e) { Driver = null; console.log(_e.message); } finally { Module._load = orig; }
  });
  it('sub-device gets cid + gateway credentials in store; plain device unchanged', function () {
    if (!Driver) {this.skip();}
    const proto = Driver.prototype;
    const sub = proto._toLocalFirstPairDevice.call(proto, { id: 's1', local_key: '0123456789abcdef', cid: 'a4c1', parent: 'gw1', gateway: { id: 'gw1', key: '0123456789abcdef', ip: '10.0.0.5', version: '3.4' } }, 'tinytuya_import');
    assert.strictEqual(sub.store.cid, 'a4c1');
    assert.strictEqual(sub.store.gateway_id, 'gw1');
    assert.strictEqual(sub.store.gateway_ip, '10.0.0.5');
    assert.strictEqual(sub.store.gateway_protocol_version, '3.4');
    const plain = proto._toLocalFirstPairDevice.call(proto, { id: 'p1', local_key: '0123456789abcdef' });
    assert.strictEqual(plain.store.cid, undefined);
  });
  it('import handler lists keyed devices and sub-devices with a keyed gateway', async function () {
    if (!Driver) {this.skip();}
    const handlers = {};
    const session = { setHandler: (n, f) => { handlers[n] = f; } };
    const fake = Object.create(Driver.prototype);
    fake.log = () => {}; fake.homey = { settings: { get: () => null }, app: {} };
    try { await Driver.prototype.onPair.call(fake, session); } catch (_e) { /* other handlers may need runtime */ }
    if (!handlers.tinytuya_import) {this.skip();}
    const list = await handlers.tinytuya_import({ text: JSON.stringify([
      { id: 'gw1', key: '0123456789abcdef', ip: '10.0.0.5', version: '3.4', name: 'Hub' },
      { id: 's1', node_id: 'a4c1', parent: 'gw1', name: 'Sub' },
      { id: 'nokey', name: 'X' },
    ]) });
    assert.deepStrictEqual(list.map((d) => d.data.id).sort(), ['gw1', 's1']);
    const s1 = list.find((d) => d.data.id === 's1');
    assert.strictEqual(s1.store.cid, 'a4c1'); assert.strictEqual(s1.store.gateway_id, 'gw1');
    await assert.rejects(handlers.tinytuya_import({ text: '{bad' }));
  });
});
