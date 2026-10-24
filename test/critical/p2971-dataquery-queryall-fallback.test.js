'use strict';
/**
 * P2971 — Issue #560 (TRV06 _TZE200_rxq4iti9, reported by artisare): diag showed
 * "No active query method available" then "[DATA-QUERY] Completed: 0/12 queries sent".
 * requestDP returned false for "no method" and TuyaDataQuery treated every false as a sleepy
 * skip, so no fallback ran. Now the skip reason is recorded, and one Tuya 0x03 dataQuery
 * (no payload = report all DPs) is sent when every per-DP path failed. Own wording.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { tuyaDataQuery, sendQueryAllFallback } = require('../../lib/tuya/TuyaDataQuery');

function dev(manager, cluster) {
  const logs = [];
  return {
    logs,
    log: (...a) => logs.push(a.join(' ')),
    error: (...a) => logs.push(a.join(' ')),
    getName: () => 'TRV06',
    tuyaEF00Manager: manager,
    zclNode: { endpoints: { 1: { clusters: { tuya: cluster } } } },
  };
}

describe('P2971 query-all 0x03 fallback (#560)', () => {
  it('no_method on every DP -> exactly ONE cluster.dataQuery({}) and a non-zero count', async () => {
    const calls = [];
    const mgr = { _lastRequestSkipReason: null, requestDP: async function () { this._lastRequestSkipReason = 'no_method'; return false; } };
    const cluster = {
      dataQuery: async (a) => { calls.push(['dq', a]); },
      command: async (cmd, args) => { calls.push([cmd, args]); throw new Error('unexpected property'); },
    };
    const d = dev(mgr, cluster);
    const ok = await tuyaDataQuery(d, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], { delayBetweenQueries: 0 });
    assert.strictEqual(ok, true);
    assert.strictEqual(calls.filter((c) => c[0] === 'dq').length, 1);
    assert.deepStrictEqual(calls.find((c) => c[0] === 'dq')[1], {});
    const joined = d.logs.join('\n');
    assert.ok(/query-all 0x03/.test(joined), joined);
    assert.ok(!/0\/12 queries sent/.test(joined), joined);
  });

  it('sleepy skip -> NO fallback (no query storm on battery devices)', async () => {
    let dq = 0;
    const mgr = { requestDP: async function () { this._lastRequestSkipReason = 'sleepy'; return false; } };
    const d = dev(mgr, { dataQuery: async () => { dq++; }, command: async () => { dq++; } });
    const ok = await tuyaDataQuery(d, [1, 2], { delayBetweenQueries: 0 });
    assert.strictEqual(ok, false);
    assert.strictEqual(dq, 0);
  });

  it('unknown reason (legacy manager) keeps the old safe behaviour', async () => {
    let dq = 0;
    const d = dev({ requestDP: async () => false }, { dataQuery: async () => { dq++; } });
    assert.strictEqual(await tuyaDataQuery(d, [1], { delayBetweenQueries: 0 }), false);
    assert.strictEqual(dq, 0);
  });

  it('queryAllFallback:false disables it', async () => {
    let dq = 0;
    const mgr = { requestDP: async function () { this._lastRequestSkipReason = 'no_method'; return false; } };
    const d = dev(mgr, { dataQuery: async () => { dq++; } });
    await tuyaDataQuery(d, [1], { delayBetweenQueries: 0, queryAllFallback: false });
    assert.strictEqual(dq, 0);
  });

  it('sendQueryAllFallback order: dataQuery -> command(dataQuery,{}) -> sendRaw(0x03, empty)', async () => {
    assert.strictEqual(await sendQueryAllFallback({ dataQuery: async () => {} }, null), 'cluster.dataQuery');
    const seen = [];
    assert.strictEqual(await sendQueryAllFallback({ command: async (c, a) => { seen.push([c, a]); } }, null), 'cluster.command');
    assert.deepStrictEqual(seen[0], ['dataQuery', {}]);
    const raw = [];
    assert.strictEqual(await sendQueryAllFallback({ dataQuery: async () => { throw new Error('x'); } }, { sendRaw: async (c, b) => raw.push([c, b.length]) }), 'manager.sendRaw');
    assert.deepStrictEqual(raw[0], [0x03, 0]);
    assert.strictEqual(await sendQueryAllFallback(null, null), false);
  });

  it('TuyaEF00Manager.requestDP records skip reasons and tries command(dataQuery, {}) first', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'lib/tuya/TuyaEF00Manager.js'), 'utf8');
    for (const r of ['sleepy', 'no_method', 'no_cluster', 'no_endpoint']) {
      assert.ok(src.includes(`this._lastRequestSkipReason = '${r}'`), r);
    }
    assert.ok(/command\('dataQuery', \{\}, \{ disableDefaultResponse: true \}\)/.test(src));
  });

  it('credits artisare for #560', () => {
    const credits = fs.readFileSync(path.join(__dirname, '..', '..', 'CREDITS.md'), 'utf8');
    assert.ok(/P2971/.test(credits) && /artisare/.test(credits));
  });
});
