'use strict';
// P3065: ReceptionManager keeps its buffer ordered by timestamp via tail insertion
// (replaces sort-on-every-receive). Behaviour must equal the previous stable sort.
const test = require('node:test');
const assert = require('node:assert');
const { ReceptionManager } = require('../../lib/multichannel/ReceptionManager');

function mk() {
  return new ReceptionManager({ log() {}, error() {} }, { multiChannelManager: {} });
}

test('P3065 buffer stays timestamp-ordered even when the clock goes backwards', () => {
  const rm = mk();
  const realNow = Date.now;
  const times = [1000, 3000, 2000, 3000, 500, 4000];
  try {
    times.forEach((t, k) => { Date.now = () => t; rm.receive('cap' + k, k, 'zcl'); });
  } finally { Date.now = realNow; }
  const buf = rm.getBuffer();
  const expected = times.map((t, k) => ({ t, k })).sort((a, b) => a.t - b.t).map((x) => x.k);
  assert.deepStrictEqual(buf.map((e) => e.value), expected);
});

test('P3065 buffer remains capped at 100 and drops oldest', () => {
  const rm = mk();
  for (let k = 0; k < 150; k += 1) {rm.receive('c' + k, k, 'dp');}
  const buf = rm.getBuffer();
  assert.strictEqual(buf.length, 100);
  assert.strictEqual(buf[buf.length - 1].value, 149);
});

test('P3065 no full sort on receive (source pin)', () => {
  const src = require('fs').readFileSync(require.resolve('../../lib/multichannel/ReceptionManager'), 'utf8');
  assert.ok(!src.includes('this._buffer.sort('));
});
