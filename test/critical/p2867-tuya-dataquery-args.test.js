'use strict';
/**
 * Issue #560 diagnostic ("[DATA-QUERY] Completed: 0/12 queries sent") - root cause shared by every Tuya DP device:
 * tuya.dataQuery has no payload, but TuyaEF00Manager.requestDP and several base classes called it with {seq, dp}
 * which zigbee-clusters rejects ("unexpected property"), so no active DP query was ever sent. Rewritten in our words.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');

const frames = [];
const endpoint = { _endpointId: 1, sendFrame: async (id, buf) => { frames.push(buf.toString('hex')); return {}; } };

describe('P2867 tuya.dataQuery accepts any caller argument and does not wait for a ZCL response', () => {
  beforeEach(() => { frames.length = 0; });
  it('{seq, dp}, {dp}, {} and no argument all send the empty query-all frame (cmd 0x03)', async () => {
    const c = new TuyaSpecificCluster(endpoint);
    await c.dataQuery({ seq: 1, dp: 2 });
    await c.dataQuery({ dp: 4 });
    await c.dataQuery({});
    await c.dataQuery();
    assert.strictEqual(frames.length, 4);
    frames.forEach((f) => assert.ok(f.endsWith('03') && f.length === 6, `unexpected frame ${f}`));
  });
  it('resolves quickly (fire-and-forget) instead of timing out after 10 s', async () => {
    const c = new TuyaSpecificCluster(endpoint);
    const t = Date.now();
    await c.dataQuery({ seq: 7 });
    assert.ok(Date.now() - t < 1000);
  });
  it('requestDP no longer passes {seq, dp} and coalesces the init burst', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'lib/tuya/TuyaEF00Manager.js'), 'utf8');
    assert.ok(!/tuyaCluster\.dataQuery\(\{ seq: seq, dp: dp \}\)/.test(src));
    assert.ok(/_lastQueryAllAt/.test(src));
  });
});
