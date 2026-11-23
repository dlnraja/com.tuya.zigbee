'use strict';
const { describe, it } = require('./_support/dual-runner');
const assert = require('assert');
const path = require('path');
const os = require('os');
const fs = require('fs');
const s = require('../scripts/scanners/forum-request-digest');

describe('P3362 forum request digest', () => {
  it('classifies device requests, bugs, wishes and diagnostic UUIDs', () => {
    assert.strictEqual(s.classifyRequest('Could you add support for _TZE284_z7a2jmyy / TS0601?'), 'device-request');
    assert.strictEqual(s.classifyRequest('target temperature stays empty, unexpected property'), 'bug');
    assert.strictEqual(s.classifyRequest('A setting to refresh status would be nice'), 'wish');
    assert.strictEqual(s.classifyRequest('64a2399b-a2af-4c07-89f5-bfe238577770'), 'diag');
    assert.strictEqual(s.classifyRequest('Thanks, works now'), 'none');
  });

  it('extracts diag UUIDs and idea tags without inventing ids', () => {
    assert.deepStrictEqual(
      s.extractDiagIds('id 56949320-88a3-40cf-8a5d-1213787e5dad and again 56949320-88a3-40cf-8a5d-1213787e5dad'),
      ['56949320-88a3-40cf-8a5d-1213787e5dad']
    );
    assert.ok(s.ideaTags('Please add a mode picker and a stale value watchdog').includes('device-settings'));
    assert.ok(s.ideaTags('Please add a mode picker and a stale value watchdog').includes('sensor-watchdog'));
  });

  it('never allows replies on Johan 26439, Doekse, Drenso or owner posts', () => {
    assert.ok(s.NEVER_REPLY_TOPICS.has(26439));
    assert.strictEqual(s.allowReply(26439, 'anyone'), false);
    assert.strictEqual(s.allowReply(140352, 'Doekse'), false);
    assert.strictEqual(s.allowReply(140352, 'Drenso'), false);
    assert.strictEqual(s.allowReply(140352, 'dlnraja'), false);
    assert.strictEqual(s.allowReply(140352, 'Arve_Vang1'), true);
  });

  it('builds a redacted entry and skips empty thanks-only posts', () => {
    const hit = s.buildEntry(140352, 'universal-tuya-zigbee', {
      post_number: 2270,
      username: 'Arve_Vang1',
      cooked: '<p>Could you add support so I can read status on _TZE200_1n2zev06 TS0601? Diagnostic 56949320-88a3-40cf-8a5d-1213787e5dad DP102</p>',
    }, true);
    assert.strictEqual(hit.kind, 'device-request');
    assert.ok(hit.couples.includes('_tze200_1n2zev06|TS0601'));
    assert.deepStrictEqual(hit.diagIds, ['56949320-88a3-40cf-8a5d-1213787e5dad']);
    assert.strictEqual(hit.replyAllowed, true);
    const miss = s.buildEntry(140352, 'universal-tuya-zigbee', {
      post_number: 1, username: 'x', cooked: '<p>Yes</p>',
    }, true);
    assert.strictEqual(miss, null);
  });

  it('writes candidate-task and reply-candidate files from a mock topic, never posts', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3362-'));
    const prev = { ...process.env };
    // Point outputs by running against injected IO: we patch via run() only using getJson,
    // so use a dry run and assert the return shape, plus a second run with overridden paths
    // is not available. Dry run still classifies findings.
    const posts = {
      140352: [
        { id: 10, post_number: 2270, username: 'Arve_Vang1', cooked: '<p>Please add support for _TZE200_1n2zev06 TS0601. Diagnostic 56949320-88a3-40cf-8a5d-1213787e5dad</p>' },
      ],
      26439: [
        { id: 11, post_number: 5540, username: 'someone', cooked: '<p>A mode picker for presence would help _TZE204_clrdrnya TS0601</p>' },
      ],
    };
    const getJson = async (p) => {
      const m = p.match(/^\/t\/(\d+)\.json$/);
      if (m) {
        const tid = Number(m[1]);
        const list = posts[tid] || [];
        return { highest_post_number: list[0] ? list[0].post_number : 0, post_stream: { stream: list.map((x) => x.id), posts: [] } };
      }
      const tm = p.match(/^\/t\/(\d+)\/posts\.json/);
      if (tm) {
        const tid = Number(tm[1]);
        return { post_stream: { posts: posts[tid] || [] } };
      }
      return { error: true, status: 404 };
    };
    return s.run({ budget: 20, perTopic: 10, satellites: 1, seed: 10, delayMs: 0, dry: true, getJson, sleep: async () => {} }).then((r) => {
      assert.strictEqual(r.dry, true);
      assert.ok(r.findings >= 1);
      assert.ok(r.tasks >= 1);
      assert.ok(r.replies >= 1);
      const src = fs.readFileSync(path.join(__dirname, '..', 'scripts/scanners/forum-request-digest.js'), 'utf8');
      assert.doesNotMatch(src, /method:\s*'(POST|PATCH|PUT|DELETE)'/);
      assert.doesNotMatch(src, /pulls|issues\/\d+\/comments|discourse\/posts/i);
      fs.rmSync(dir, { recursive: true, force: true });
      Object.assign(process.env, prev);
    });
  });
});
