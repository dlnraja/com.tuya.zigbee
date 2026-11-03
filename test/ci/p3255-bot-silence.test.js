'use strict';
// P3255 (t823u/t824u): automation is invisible — no bot issue/PR/comment writes, no version-update PRs.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const S = require('../../scripts/ci/bot-silence');

describe('P3255 bot silence', () => {
  const saved = process.env.BOT_PUBLIC;
  afterEach(() => { if (saved === undefined) delete process.env.BOT_PUBLIC; else process.env.BOT_PUBLIC = saved; });

  it('diverts issue/PR writes, keeps reads and other endpoints', () => {
    delete process.env.BOT_PUBLIC;
    assert.strictEqual(S.isSilenced('POST', '/repos/o/r/issues/557/comments'), true);
    assert.strictEqual(S.isSilenced('PATCH', 'https://api.github.com/repos/o/r/issues/comments/1'), true);
    assert.strictEqual(S.isSilenced('POST', '/repos/o/r/pulls'), true);
    assert.strictEqual(S.isSilenced('GET', '/repos/o/r/issues/557/comments'), false);
    assert.strictEqual(S.isSilenced(undefined, '/repos/o/r/issues'), false);
    assert.strictEqual(S.isSilenced('POST', '/repos/o/r/actions/workflows/x/dispatches'), false);
    assert.deepStrictEqual(S.divert('POST', '/repos/o/r/issues', { body: 'x' }), {});
  });

  it('BOT_PUBLIC=1 re-enables writes', () => {
    process.env.BOT_PUBLIC = '1';
    assert.strictEqual(S.isSilenced('POST', '/repos/o/r/issues'), false);
  });

  it('shared GitHub clients are wired to the guard', () => {
    for (const f of ['scripts/digest/lib.js', 'scripts/automation/gh.cjs', '.github/scripts/retry-helper.js']) {
      if (!fs.existsSync(path.join(ROOT, f))) continue; // branch without this client
      assert.ok(fs.readFileSync(path.join(ROOT, f), 'utf8').includes('bot-silence'), f);
    }
  });

  it('workflows open no PR/issue unless BOT_PUBLIC=1, dependabot opens no version PRs', () => {
    const wf = path.join(ROOT, '.github', 'workflows');
    for (const f of fs.readdirSync(wf).filter((n) => n.endsWith('.yml'))) {
      const lines = fs.readFileSync(path.join(wf, f), 'utf8').split('\n');
      lines.forEach((l, i) => {
        if (/^\s*#/.test(l) || !/gh (pr|issue) create|create-pull-request@|github\.rest\.issues\.(create|createComment)\(/.test(l)) return;
        const before = lines.slice(0, i).reverse();
        const step = before.findIndex((x) => /^\s*- name:/.test(x));
        const block = before.slice(0, step + 1).join('\n');
        assert.ok(/BOT_PUBLIC == '1'/.test(block), `${f}:${i + 1} writes without the BOT_PUBLIC gate`);
      });
    }
    const dep = path.join(ROOT, '.github', 'dependabot.yml');
    if (fs.existsSync(dep)) {
      const limits = fs.readFileSync(dep, 'utf8').match(/open-pull-requests-limit:\s*\d+/g) || [];
      limits.forEach((m) => assert.match(m, /:\s*0$/));
    }
  });
});
