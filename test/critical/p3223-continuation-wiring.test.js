'use strict';
// P3223: writers and the dual-couple audit go through lib/drivers/DriverContinuations (chain = one logical driver).
const test = require('node:test');
const assert = require('node:assert');
const DC = require('../../lib/drivers/DriverContinuations');
const { decide, decideAuditBackport } = require('../../scripts/leads/strict-apply');
const { dualCouples } = require('../../scripts/leads/dual-couples');
const { plan } = require('../../scripts/kb/apply-batch');

const dc = DC.fromObject({ drivers: { plug: { full: true, continuation: 'plug_2' }, plug_2: { continuationOf: 'plug', index: 2 } } });
const z = (mfrs, pids) => ({ mfrs: new Set(mfrs), pids: new Set(pids) });

test('decide(): a chain counts once and the couple goes to the first non-full driver', () => {
  const byDriver = new Map([['plug', z(['_tz3000_aaaaaaaa'], ['TS011F'])], ['plug_2', z([], ['TS011F'])]]);
  const idx = { dc, byMfr: new Map(), byPid: new Map([['TS011F', new Set(['plug', 'plug_2'])]]), byDriver };
  assert.deepStrictEqual(decide(idx, '_TZ3000_bbbbbbbb', 'TS011F'), { status: 'apply', driver: 'plug_2' });
  assert.deepStrictEqual(decide(idx, '_TZ3000_bbbbbbbb', 'TS011F', 'plug'), { status: 'apply', driver: 'plug_2' });
});

test('decideAuditBackport(): same-chain pid overlap is not a dual couple', () => {
  const byDriver = new Map([['plug', z([], ['TS011F'])], ['plug_2', z(['_tz3000_cccccccc'], ['TS011F'])]]);
  const idx = { dc, byMfr: new Map([['_tz3000_cccccccc', new Set(['plug_2'])]]), byPid: new Map(), byDriver };
  assert.strictEqual(decideAuditBackport(idx, '_TZ3000_cccccccc', 'TS011F', 'plug').status, 'already');
});

test('dualCouples(): root + continuation is not reported, two roots are', () => {
  const drivers = new Map([
    ['plug', { id: 'plug', mfrs: ['_tz3000_x'], pids: ['TS011F'] }],
    ['plug_2', { id: 'plug_2', mfrs: ['_tz3000_x'], pids: ['TS011F'] }],
  ]);
  assert.strictEqual(dualCouples(drivers, dc).length, 0);
  drivers.set('socket', { id: 'socket', mfrs: ['_tz3000_x'], pids: ['TS011F'] });
  assert.strictEqual(dualCouples(drivers, dc).length, 1);
});

test('apply-batch plan() and empty registry keep the old behaviour', () => {
  const empty = DC.fromObject({ drivers: {} });
  assert.strictEqual(empty.firstNonFull('plug'), 'plug');
  assert.strictEqual(typeof plan, 'function');
});
