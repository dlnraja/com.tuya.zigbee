'use strict';
// P3249: regression for PR #558 (martinheie-ui) — _clusterSetData must send Buffers, never raw JS values.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const DeviceIOFacade = require('../../lib/io/DeviceIOFacade');
const Proto = (DeviceIOFacade.DeviceIOFacade || DeviceIOFacade).prototype;

function run(value, type, method = 'setData') {
  const sent = [];
  const cluster = { [method]: async (...a) => { sent.push(a); } };
  const self = { _log() {}, _compensation: null, device: { zclNode: { endpoints: { 1: { clusters: { tuya: cluster } } } } } };
  self._findTuyaClusterAny = Proto._findTuyaClusterAny.bind(self);
  return Proto._clusterSetData.call(self, 3, value, type).then((ok) => ({ ok, sent }));
}
const arg = (r) => (r.sent[0][0].dp !== undefined ? r.sent[0][0] : r.sent[0][1]);

describe('P3249 PR#558 DeviceIOFacade EF00 Buffer encoding', () => {
  it('bool -> 1 byte', async () => { const r = await run(true, 'bool'); assert.ok(r.ok); assert.deepStrictEqual([...arg(r).data], [1]); });
  it('value 1000 (MC101Z brightness) -> 4 bytes BE', async () => { const r = await run(1000, 'value'); assert.deepStrictEqual([...arg(r).data], [0, 0, 3, 0xE8]); assert.strictEqual(arg(r).datatype, 2); });
  it('negative value -> two complement', async () => { const r = await run(-1, 2); assert.deepStrictEqual([...arg(r).data], [255, 255, 255, 255]); });
  it('enum -> 1 byte', async () => { const r = await run(2, 'enum'); assert.deepStrictEqual([...arg(r).data], [2]); });
  it('string -> utf8', async () => { const r = await run('ab', 'string'); assert.strictEqual(arg(r).data.toString(), 'ab'); });
  it('Buffer passthrough', async () => { const b = Buffer.from([9, 8]); const r = await run(b, 'raw'); assert.strictEqual(arg(r).data, b); });
  it('numeric bitmap -> BE bytes, not ASCII', async () => { const r = await run(0x0102, 'bitmap'); assert.deepStrictEqual([...arg(r).data], [1, 2]); });
  it('fallback writeData / dataRequest also get a Buffer', async () => {
    for (const m of ['writeData', 'datapoint']) { const r = await run(5, 'value', m); assert.ok(Buffer.isBuffer(arg(r).data)); }
    const r = await run(5, 'value', 'command'); assert.strictEqual(r.sent[0][0], 'dataRequest'); assert.ok(Buffer.isBuffer(r.sent[0][1].data));
  });
});
