'use strict';
// Forum ingestion must catch symptom-only posts and white-label models (forum 140352 #2238–#2258).
const test = require('node:test');
const assert = require('node:assert');
const { extractSymptoms, extractModels, quirkCandidates } = require('../../scripts/progress/lib/forum-symptoms');
const { extractForumSignals } = require('../../tools/ci/forum-signal-extract');

test('symptom families from paraphrased reports', () => {
  assert.ok(extractSymptoms('target write fails: value is an unexpected property').includes('dp-write-args'));
  assert.ok(extractSymptoms('the advanced flow is very slow and cards keep reloading').includes('options-churn'));
  assert.ok(extractSymptoms('my button has no history tab').includes('insights-missing'));
  assert.deepStrictEqual(extractSymptoms('thanks, works great'), []);
});

test('white-label models and brands, never TS ids', () => {
  const r = extractModels('HOBEIAN ZG-106Z and AOYAN AY-303Z plus MTG075 on TS0601');
  assert.deepStrictEqual(r.models, ['ZG-106Z', 'AY-303Z', 'MTG075']);
  assert.deepStrictEqual(r.brands, ['HOBEIAN', 'AOYAN']);
});

test('quirk candidates pair identity with family', () => {
  assert.deepStrictEqual(quirkCandidates({ mfrs: ['_TZE284_ogx8u5z6'], pids: ['TS0601'] }, ['dp-write-args']), ['_TZE284_ogx8u5z6|TS0601:dp-write-args']);
  assert.deepStrictEqual(quirkCandidates({ mfrs: ['_X'] }, []), []);
});

test('forum-signal-extract exposes families and models', () => {
  const s = extractForumSignals('<p>MTG075 _TZE204_dtzziy1e TS0601: flow lag</p>');
  assert.ok(s.families.includes('options-churn'));
  assert.ok(s.models.includes('MTG075'));
});
