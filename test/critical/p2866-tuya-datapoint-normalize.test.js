'use strict';
/**
 * Root cause behind the TRV/LCD "time sync does nothing" family (issue #560 follow-up, forum P2823b):
 * ~50 drivers call tuya.datapoint({ dp, datatype, data }) without status/transid/length. The cluster used to
 * serialise that as length=0 + payload (a frame the MCU ignores). Missing fields are now filled in; calls that
 * already carry every field stay byte-identical. Rewritten in our own words.
 */
const assert = require('assert');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');

const frames = [];
const endpoint = { _endpointId: 1, sendFrame: async (id, buf) => { frames.push(buf.toString('hex')); return {}; } };
const opts = { waitForResponse: false };

describe('P2866 tuya.datapoint fills status/transid/length when the caller omits them', () => {
  beforeEach(() => { frames.length = 0; });

  it('bare {dp,datatype,data} carries the real payload length', async () => {
    const c = new TuyaSpecificCluster(endpoint);
    await c.datapoint({ dp: 36, datatype: 4, data: Buffer.from([1, 2, 3]) }, opts);
    // header(3) status transid dp datatype length(2) data
    const body = frames[0].slice(6);
    assert.strictEqual(body.slice(0, 2), '00', 'status 0');
    assert.strictEqual(body.slice(4, 8), '2404', 'dp 36, datatype 4');
    assert.strictEqual(body.slice(8, 12), '0003', 'length = 3, not 0');
    assert.strictEqual(body.slice(12), '010203');
  });

  it('transaction id advances between bare calls', async () => {
    const c = new TuyaSpecificCluster(endpoint);
    await c.datapoint({ dp: 1, datatype: 1, data: Buffer.from([1]) }, opts);
    await c.datapoint({ dp: 1, datatype: 1, data: Buffer.from([0]) }, opts);
    assert.notStrictEqual(frames[0].slice(8, 10), frames[1].slice(8, 10));
  });

  it('fully specified calls are not modified', () => {
    const full = { status: 0, transid: 5, dp: 1, datatype: 1, length: 1, data: Buffer.from([1]) };
    assert.deepStrictEqual(TuyaSpecificCluster.normalizeDatapointArgs(full), full);
  });

  it('array payloads become buffers and junk input is passed through', () => {
    const n = TuyaSpecificCluster.normalizeDatapointArgs({ dp: 2, datatype: 2, data: [0, 0, 0, 9] });
    assert.ok(Buffer.isBuffer(n.data));
    assert.strictEqual(n.length, 4);
    assert.strictEqual(TuyaSpecificCluster.normalizeDatapointArgs(undefined), undefined);
  });
});
