'use strict';

/**
 * P3244 — #560 artisare (TRV06 `_TZE200_rxq4iti9` / TS0601), user report presumed true:
 *   "measured temp and set temp only in full degrees (19.0, 20.0…), should be 21.3 / 21.7".
 * Root cause: P3001 forced target_temperature step 1 / decimals 0 and rounded every TX to a whole
 * degree, on a guess (Z2M disc. #24659 = one other user). Z2M TS0601_thermostat_3 (EARU TRV06
 * whitelabel, this exact couple) declares setpoint step 0.5 with DP4/DP5 divideBy10; ZHA tuya_trv.py
 * uses tenths. Fix: default 0.5 °C / 1 decimal, TX in tenths, learn whole-degree firmware from the
 * DP4 echo per device (store), migrate existing devices at init (no re-pair).
 * Dual-app: BOTH · Forum: silent only
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'drivers/device_radiator_valve/device.js'), 'utf8');
function method(name, isAsync = false) {
  const head = `  ${isAsync ? 'async ' : ''}${name}(`;
  const start = SRC.indexOf(head);
  assert.ok(start > 0, name);
  let i = SRC.indexOf('{', start); let depth = 0; let j = i;
  for (; j < SRC.length; j++) {
    if (SRC[j] === '{') {depth++;} else if (SRC[j] === '}') { depth--; if (depth === 0) {break;} }
  }
  const params = SRC.slice(SRC.indexOf('(', start), i);
  // eslint-disable-next-line no-new-func
  return new Function(`return (${isAsync ? 'async ' : ''}function${params}${SRC.slice(i, j + 1)})`)();
}
const align = method('_alignTrv06WholeDegree', true);
const tx = method('_trv06SetpointTx');
const learn = method('_trv06LearnSetpointEcho');

function dev({ trv06 = true, opts = { step: 1, decimals: 0 }, store = {} } = {}) {
  const d = {
    store, opts, calls: [],
    _isNoHumidityTrv: () => trv06,
    hasCapability: () => true,
    getCapabilityOptions: () => d.opts,
    setCapabilityOptions: async (c, o) => { d.calls.push([c, o]); d.opts = o; },
    getStoreValue: (k) => d.store[k],
    setStoreValue: async (k, v) => { d.store[k] = v; },
    log: () => {},
  };
  d._alignTrv06WholeDegree = align.bind(d);
  return d;
}
const tick = () => new Promise((r) => setImmediate(r));

describe('P3244 #560 TRV06 half-degree setpoint + echo learning', () => {
  it('existing device stuck on P3001 step 1 is migrated to 0.5 / 1 decimal at init (no re-pair)', async () => {
    const d = dev();
    await align.call(d);
    assert.deepEqual(d.calls, [['target_temperature', { step: 0.5, decimals: 1 }]]);
    await align.call(d);
    assert.equal(d.calls.length, 1, 'idempotent');
  });

  it('user symptom: 21.5 requested is sent as 215 tenths, not 220 / 210', () => {
    const d = dev();
    assert.equal(Math.round(tx.call(d, 21.5) * 10), 215);
    assert.equal(tx.call(d, 21.3), 21.5, 'half-degree snap (Z2M step 0.5)');
  });

  it('device echoes the half degree -> stays at 0.5', async () => {
    const d = dev({ opts: { step: 0.5, decimals: 1 } });
    tx.call(d, 21.5); learn.call(d, 215); await tick();
    assert.equal(d.store.p3244_trv06_whole_degree, false);
    assert.equal(d.calls.length, 0);
  });

  it('device rounds the half degree -> whole degree learned, step 1, later TX rounded', async () => {
    const d = dev({ opts: { step: 0.5, decimals: 1 } });
    tx.call(d, 21.5); learn.call(d, 220); await tick();
    assert.equal(d.store.p3244_trv06_whole_degree, undefined, 'one rounded echo is not enough');
    tx.call(d, 19.5); learn.call(d, 190); await tick(); await tick();
    assert.equal(d.store.p3244_trv06_whole_degree, true);
    assert.deepEqual(d.calls.at(-1), ['target_temperature', { step: 1, decimals: 0 }]);
    assert.equal(tx.call(d, 21.5), 22);
  });

  it('unsolicited DP4 reports never teach anything', async () => {
    const d = dev();
    learn.call(d, 200); await tick();
    assert.equal(d.store.p3244_trv06_whole_degree, undefined);
  });

  it('other TRVs untouched', async () => {
    const d = dev({ trv06: false });
    await align.call(d);
    assert.equal(d.calls.length, 0);
    assert.equal(tx.call(d, 21.3), 21.3);
  });

  it('RX path: DP5 keeps tenths (213 -> 21.3), DP4 echo hooked before mapping, no rounding on RX', () => {
    assert.match(SRC, /5:\s*\{\s*capability:\s*'measure_temperature',\s*divisor:\s*10\s*\}/);
    assert.ok(SRC.includes("if (Number(dpId) === 4 && this.dpProfile === 'me167') { this._trv06LearnSetpointEcho(raw); }"));
    assert.equal(213 / 10, 21.3);
  });
});
