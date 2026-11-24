'use strict';
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const { build } = require('../../scripts/data/build-unknown-dp-catalog');

// P3405: regenerating the DP catalogue must never drop a couple or a DP that the previous
// catalogue had (upstream refresh 2026-11-24 dropped _TZE204_zxkwaztm DP68 schedule_holiday).
const decode = (c, key) => {
  const p = c.profiles[c.idx[key]] || [];
  const o = {};
  for (let i = 0; i < p.length; i += 2) {o[p[i]] = c.names[p[i + 1]];}
  return o;
};

describe('P3405 unknown-dp-catalog zero-loss regeneration', () => {
  const tuyaDps = { couples: { '_TZE204_aaaa|TS0601': [[1, 'state', 'onOff']] } };
  const previous = build({ tuyaDps: { couples: {
    '_TZE204_aaaa|TS0601': [[1, 'state', 'onOff'], [68, 'schedule_holiday', 'raw']],
    '_TZE200_gone|TS0601': [[2, 'temperature', 'div:10']],
  } } });

  it('keeps a DP the current sources no longer list, with its converter', () => {
    const out = build({ tuyaDps, previous });
    assert.deepStrictEqual(decode(out, '_tze204_aaaa|TS0601'), { 1: 'state', 68: 'schedule_holiday' });
  });

  it('keeps a whole couple the current sources no longer list', () => {
    const out = build({ tuyaDps, previous });
    assert.deepStrictEqual(decode(out, '_tze200_gone|TS0601'), { 2: 'temperature' });
    const pi = out.idx['_tze200_gone|TS0601'];
    assert.strictEqual(out.convs[out.cv[pi][0]], 'div:10');
  });

  it('current sources still win on a DP both know (fill-only)', () => {
    const out = build({ tuyaDps: { couples: { '_TZE204_aaaa|TS0601': [[1, 'onoff_renamed', 'onOff']] } }, previous });
    assert.strictEqual(decode(out, '_tze204_aaaa|TS0601')[1], 'onoff_renamed');
  });

  it('without a previous catalogue the build is unchanged', () => {
    const out = build({ tuyaDps });
    assert.deepStrictEqual(decode(out, '_tze204_aaaa|TS0601'), { 1: 'state' });
    assert.strictEqual(out.idx['_tze200_gone|TS0601'], undefined);
  });
});
