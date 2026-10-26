'use strict';
// P3065: scripts/diag/diag-triage.js groups errors, maps exact mfr+pid couples to drivers, redacts samples.
const { describe, it } = require('node:test');
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { triage, redact } = require('../../scripts/diag/diag-triage.js');

const ROOT = path.join(__dirname, '..', '..');

function realCouple() {
  const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'motion_sensor', 'driver.compose.json'), 'utf8'));
  const mfr = j.zigbee.manufacturerName.find((m) => /^_TZ/.test(m));
  const pid = j.zigbee.productId.find((p) => /^TS/.test(p));
  return { mfr, pid };
}

describe('P3065 diag-triage', () => {
  it('groups repeated errors under one signature and counts them', () => {
    const log = [
      '2026-10-26T10:00:01.123Z [motion_sensor] TypeError: Cannot read properties of undefined (reading \'get\') at 12',
      '2026-10-26T10:00:05.456Z [motion_sensor] TypeError: Cannot read properties of undefined (reading \'get\') at 98',
      '10:00:07 [plug] Error: Timeout after 5000 ms',
      'all good here',
    ].join('\n');
    const r = triage(log);
    assert.strictEqual(r.errorSignatures, 2);
    assert.strictEqual(r.errors[0].count, 2);
  });

  it('maps an exact mfr+pid couple to the driver that claims both', () => {
    const { mfr, pid } = realCouple();
    const r = triage(`joined ${mfr} model ${pid}\nunknown _TZE200_zzzzzzzz`);
    const c = r.couples.find((x) => x.mfr === mfr && x.pid === pid);
    assert.ok(c && c.drivers.includes('motion_sensor'), JSON.stringify(r.couples));
    assert.ok(r.unknownManufacturers.includes('_TZE200_zzzzzzzz'));
  });

  it('redacts IEEE, MAC, IPv4 and tokens in samples', () => {
    const s = redact('dev 00:12:4b:00:22:33:44:55 at 192.168.1.20 mac aa:bb:cc:dd:ee:ff key 0123456789abcdef0123');
    assert.ok(!/00:12:4b|192\.168|aa:bb|0123456789abcdef/.test(s), s);
  });

  it('reports the highest memory value seen', () => {
    const r = triage('heapUsed: 41.5 MB\nrss 88 MB\nheap 12 MB');
    assert.deepStrictEqual(r.memoryMaxMb, { mb: 88, kind: 'rss' });
  });
});
