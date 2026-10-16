'use strict';

/**
 * P2842 Contre quoi: free GHA must automate hollow/payload/couple heal without paid AI.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const WF = path.join(ROOT, '.github', 'workflows');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('P2842 flow/publish self-heal automation (free)', () => {
  it('self-heal script covers hollow + backups + zo0cfekv + size gate', () => {
    const src = read('tools/ci/p2842-flow-publish-self-heal.js');
    assert.match(src, /hollowFor|scanHollowFleet/);
    assert.match(src, /ensureHomeyignoreBackups|backups/);
    assert.match(src, /healZo0cfekvTs0601|zo0cfekv/);
    assert.match(src, /publish-size-gate/);
    // P2842b/c: pre-build skip + purge validate-materialized .homeybuild/backups
    assert.match(src, /no \.homeybuild yet/);
    assert.match(src, /purgeHomeybuildBackups|Purged \.homeybuild\/backups/);
    assert.match(src, /AI_ALLOW_PAID|no paid|forfait/i);
    assert.ok(!/cursor-grok|openai\.com|anthropic/i.test(src), 'must stay local/free');
  });

  it('workflow flow-publish-self-heal.yml is free forfait + cron', () => {
    const y = fs.readFileSync(path.join(WF, 'flow-publish-self-heal.yml'), 'utf8');
    assert.match(y, /AI_FORCE_LOCAL:\s*'true'/);
    assert.match(y, /AI_ALLOW_PAID:\s*'false'/);
    assert.match(y, /FORUM_AUTO_POST:\s*'0'/);
    assert.match(y, /p2842-flow-publish-self-heal\.js/);
    assert.match(y, /cron:/);
    assert.match(y, /shell:\s*bash/);
    assert.match(y, /^permissions:/m);
    assert.match(y, /timeout-minutes:/);
  });

  it('hard CI wires P2842 check (auto-publish + unified-ci + syntax-check)', () => {
    for (const f of ['auto-publish-on-push.yml', 'unified-ci.yml', 'syntax-check.yml']) {
      const t = fs.readFileSync(path.join(WF, f), 'utf8');
      assert.ok(
        t.includes('p2842-flow-publish-self-heal.js') || t.includes('check:p2842'),
        `${f} must run P2842`,
      );
    }
  });

  it('package.json exposes check:p2842 + heal:flow-publish + p283x chain', () => {
    const pkg = JSON.parse(read('package.json'));
    assert.ok(pkg.scripts['check:p2842']);
    assert.ok(pkg.scripts['heal:flow-publish']);
    assert.ok(pkg.scripts['check:p283x'].includes('check:p2842'));
  });
});
