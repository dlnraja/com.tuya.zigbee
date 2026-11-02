'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
describe('P3213 diag logIndex backfill + meter silence watchdog + t784u rule', () => {
  it('backfills Log ID from an already-processed diag body (CRLF, upper-case)', () => {
    process.env.FGD_NO_MAIN = '1';
    const { backfillLogIndexEntry } = require('../.github/scripts/fetch-gmail-diagnostics.js');
    const body = 'Log ID: FB5BE1FE-1111-2222-3333-444455556666\r\nApp Version\r\n\r\nv9.0.1604\r\nHomey Version\r\n\r\nv13.4.1\r\nUser Message:\r\nmeter paired\r\n[Driver:energy_meter_din] x';
    const r = backfillLogIndexEntry(body);
    assert.strictEqual(r.id, 'fb5be1fe-1111-2222-3333-444455556666');
    assert.strictEqual(r.entry.appVersion, 'v9.0.1604');
    assert.strictEqual(r.entry.hasUserMessage, true);
    assert.deepStrictEqual(r.entry.driversInLog, ['energy_meter_din']);
    assert.strictEqual(backfillLogIndexEntry('no id'), null);
  });
  it('meter watchdog wakes a silent meter, skips non-meters, never throws', async () => {
    const wd = require('../lib/helpers/MeterSilenceWatchdog');
    const calls = [];
    const em = { readAttributes: async (a) => calls.push('read:' + a[0]), configureReporting: async () => { throw new Error('unsup'); } };
    let cb;
    const dev = { hasCapability: (c) => c === 'measure_power', getCapabilityValue: () => null, log() {},
      homey: { setTimeout: (f) => { cb = f; return 1; } }, zclNode: { endpoints: { 1: { clusters: { electricalMeasurement: em } } } } };
    assert.strictEqual(wd.attach(dev), true);
    await cb();
    assert.deepStrictEqual(calls, ['read:activePower']);
    assert.strictEqual(wd.attach({ hasCapability: () => false, homey: { setTimeout() {} } }), false);
    assert.deepStrictEqual(await wd.wake({}), []);
  });
  it('reply gate flags replies that make the fix wait on the user (t784u)', () => {
    const { validateReply } = require('../.github/scripts/reply-quality-gate.js');
    const r = validateReply('Send me the interview and I will fix it.', 'meter not working');
    assert.ok(JSON.stringify(r).includes('DEPENDS-ON-USER'));
    assert.ok(fs.readFileSync(path.join(__dirname, '../docs/rules/USER_REPORTS_PRESUMED_TRUE.md'), 'utf8').includes('t784u'));
  });
});
