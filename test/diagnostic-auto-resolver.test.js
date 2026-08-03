'use strict';

/**
 * Tests — diagnostic-auto-resolver anti-spam guard (commentGuard)
 * Regression: issue #513 received ~20 identical "Auto-resolved by Diagnostic
 * Resolver" comments even though nothing changed and the user reported the
 * device was still not pairing. The guard must:
 *   1. not repost an identical auto-resolved comment (same app version + same
 *      fingerprints already covered),
 *   2. escalate to needs-maintainer when a human replies after an auto-resolve,
 *   3. allow at most 1 resolver comment per issue per app version.
 */

const assert = require('assert');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const { commentGuard } = require('../.github/scripts/diagnostic-auto-resolver.js');

const TAG = '<!-- diag-resolver -->';
const OWNER = 'dlnraja';
const VER = '9.0.348';
const FP = '_TZE284_hodyryli';
const FP2 = '_TZE200_abcdefgh';

const c = (body, login, ts) => ({ body, user: { login }, created_at: ts });
const resolverComment = (ver, fps, ts) => c(
  TAG + '\n### Auto-resolved by Diagnostic Resolver\n\n'
  + 'All fingerprints in this issue found in **Tuya Unified Zigbee v' + ver + '**:\n- '
  + fps.map((f) => '`' + f + '` -> **climate_sensor**').join('\n- ') + '\n',
  'github-actions[bot]', ts);
const kbComment = (ver, ts) => c(
  TAG + '\n### KB fix\n\n**Action:** re-pair\n\n**Version:** v' + ver + '\n',
  'github-actions[bot]', ts);

const guard = (o) => commentGuard({ labels: [], fps: [FP], appVer: VER, ownerLogin: OWNER, ...o });

describe('diagnostic-auto-resolver — commentGuard anti-spam', () => {

  it('posts when the issue has no comments at all', () => {
    assert.strictEqual(guard({ comments: [] }).action, 'post');
  });

  it('fails closed when comments cannot be fetched (null)', () => {
    const r = guard({ comments: null });
    assert.strictEqual(r.action, 'skip');
    assert.ok(/fail-closed/.test(r.reason));
  });

  it('dedup: does not repost the same auto-resolved comment (same version, same fps)', () => {
    const r = guard({ comments: [resolverComment(VER, [FP], '2026-07-22T00:00:00Z')] });
    assert.strictEqual(r.action, 'skip');
    assert.ok(/already auto-resolved/.test(r.reason));
  });

  it('dedup also works for KB-style comments ("**Version:** vX")', () => {
    const r = guard({ comments: [kbComment(VER, '2026-07-22T00:00:00Z')] });
    assert.strictEqual(r.action, 'skip');
    assert.ok(/already auto-resolved/.test(r.reason));
  });

  it('reposts when the app version changed', () => {
    const r = guard({ comments: [resolverComment('9.0.341', [FP], '2026-07-22T00:00:00Z')] });
    assert.strictEqual(r.action, 'post');
  });

  it('reposts on the same version when a new fingerprint appeared', () => {
    const r = guard({
      fps: [FP, FP2],
      comments: [resolverComment(VER, [FP], '2026-07-22T00:00:00Z')],
    });
    assert.strictEqual(r.action, 'post');
  });

  it('dedup holds even if another bot commented after the resolver comment', () => {
    const r = guard({
      comments: [
        resolverComment(VER, [FP], '2026-07-22T00:00:00Z'),
        c('some other bot notice', 'dependabot[bot]', '2026-07-23T00:00:00Z'),
      ],
    });
    assert.strictEqual(r.action, 'skip');
  });

  it('escalates when a human replies after the auto-resolved comment', () => {
    const r = guard({
      comments: [
        resolverComment(VER, [FP], '2026-07-22T00:00:00Z'),
        c('Installed v9.0.348. Still installing as Unknown unit.', 'finnamu', '2026-07-23T00:00:00Z'),
      ],
    });
    assert.strictEqual(r.action, 'escalate');
  });

  it('escalates on any human reply after auto-resolve, even without "still" wording', () => {
    const r = guard({
      comments: [
        resolverComment(VER, [FP], '2026-07-22T00:00:00Z'),
        c('here is the interview you asked for', 'finnamu', '2026-07-23T00:00:00Z'),
      ],
    });
    assert.strictEqual(r.action, 'escalate');
  });

  it('skips silently when the issue is already labelled needs-maintainer', () => {
    const r = guard({
      labels: ['needs-maintainer'],
      comments: [
        resolverComment(VER, [FP], '2026-07-22T00:00:00Z'),
        c('still broken', 'finnamu', '2026-07-23T00:00:00Z'),
      ],
    });
    assert.strictEqual(r.action, 'skip');
    assert.ok(/needs-maintainer/.test(r.reason));
  });

  it('skips issues labelled reopened-by-user', () => {
    const r = guard({ labels: ['reopened-by-user'], comments: [] });
    assert.strictEqual(r.action, 'skip');
  });

  it('skips when the maintainer took over the conversation', () => {
    const r = guard({
      comments: [
        resolverComment(VER, [FP], '2026-07-22T00:00:00Z'),
        c('looking into this myself', OWNER, '2026-07-23T00:00:00Z'),
      ],
    });
    assert.strictEqual(r.action, 'skip');
    assert.ok(/maintainer/.test(r.reason));
  });

  it('skips when the last human word reports still broken before any auto-resolve', () => {
    const r = guard({
      comments: [c('updated and still not working', 'finnamu', '2026-07-23T00:00:00Z')],
    });
    assert.strictEqual(r.action, 'skip');
    assert.ok(/still broken/.test(r.reason));
  });
});
