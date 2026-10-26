'use strict';
// P3073 §2: device observations — exact couple only, scale votes, caps, re-read counted once.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const D = require(path.join(__dirname, '..', '..', 'scripts', 'learning', 'device-observations.cjs'));

const LOG = [
  'device _TZE200_abcdefgh / TS0601',
  '2026-10-26T10:00:00Z [TUYA-DP] DP1 raw=215',
  '2026-10-26T10:00:00Z [TUYA-DP] SmartDivisor measure_temperature: raw=215 → 21.5',
  '2026-10-26T10:05:00Z [TUYA-DP] DP1 raw=230',
  '2026-10-26T10:05:00Z [TUYA-DP] SmartDivisor measure_temperature: raw=230 → 23',
  '[TUYA-DP] DP9 unknown dp, value 3',
  'MEMWARN heapUsed 41.5 MB',
].join('\n');

test('one couple in the unit: DPs, votes, interval and memory are attributed', () => {
  const per = D.observeUnit(LOG);
  assert.deepStrictEqual([...per.keys()], ['_TZE200_abcdefgh|TS0601']);
  const o = per.get('_TZE200_abcdefgh|TS0601');
  assert.deepStrictEqual(o.dps['1'].v, [0, 2, 0, 0]);
  assert.strictEqual(o.dps['9'].unmapped, 1);
  assert.strictEqual(o.mem, 1); assert.strictEqual(o.heap, 41.5);
});

test('two manufacturers and no per-line couple: nothing is guessed', () => {
  const per = D.observeUnit('_TZE200_abcdefgh _TZE200_zzzzzzzz TS0601\nDP1 raw=1');
  assert.strictEqual(per.size, 0);
});

test('bounded (200 couples x 16 DPs) and a re-read report is counted once', () => {
  const out = D.emptyOut();
  for (let i = 0; i < 260; i++) {
    const m = `_TZE200_${String(i).padStart(8, 'a')}`;
    const dps = []; for (let k = 1; k <= 30; k++) {dps.push(`DP${k} raw=${k}`);}
    D.merge(out, D.observeUnit(`${m} TS0601\n${dps.join('\n')}`), 't', new Date(Date.now() + i).toISOString());
  }
  assert.ok(Object.keys(out.couples).length <= D.MAX_COUPLES);
  for (const c of Object.values(out.couples)) {assert.ok(Object.keys(c.dps).length <= D.MAX_DPS);}
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3073d-'));
  const f = path.join(dir, 'log.txt'); fs.writeFileSync(f, LOG);
  const o = path.join(dir, 'out.json');
  assert.strictEqual(D.run([f], { outFile: o }).units, 1);
  assert.strictEqual(D.run([f], { outFile: o }).units, 0);
  const j = JSON.parse(fs.readFileSync(o, 'utf8'));
  assert.strictEqual(j.couples['_TZE200_abcdefgh|TS0601'].status, 'candidate');
  assert.deepStrictEqual(j.couples['_TZE200_abcdefgh|TS0601'].sources, ['log.txt']);
});
