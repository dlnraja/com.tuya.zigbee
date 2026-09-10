'use strict';
const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const { resolveCoupleCandidates } = require('../../lib/enrichment/NeedActionInvestigator');
const { resolveUnknownCouple } = require('../../lib/enrichment/HeuristicUnknownResolver');

describe('P2447 forum soft-hypothesis prefers mfs/registry over compose junk', () => {
  it('xabckq1v ranks TS004F not 01MINIZB', () => {
    const composeIndex = new Map([
      ['_tz3000_xabckq1v', [{
        driver: 'button_wireless_4',
        pids: ['01MINIZB', 'BASICZBR3', 'TS0001', 'TS0044', 'TS004F'],
      }]],
    ]);
    const candidates = resolveCoupleCandidates('_TZ3000_xabckq1v', {}, {
      composeIndex,
      truthIndex: new Map(),
      postsByUser: new Map(),
      diagExcerpts: [],
      username: 'SteampunkLolcat',
    });
    assert.ok(candidates.length);
    assert.strictEqual(String(candidates[0].pid).toUpperCase(), 'TS004F');
    assert.notStrictEqual(String(candidates[0].pid).toUpperCase(), '01MINIZB');
    const ranked = resolveUnknownCouple({
      mfr: '_TZ3000_xabckq1v',
      candidates,
      postText: '4 button scene',
      issues: ['button', 'battery'],
    });
    const top = ranked.preferred || ranked.softHypothesis;
    assert.ok(top);
    assert.strictEqual(String(top.pid).toUpperCase(), 'TS004F');
  });
});
