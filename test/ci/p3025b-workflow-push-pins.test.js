'use strict';
// P3025b: publish.yml / auto-publish-on-push.yml / monthly-* push only through git-push-retry.sh,
// no Node 20 action remains pinned, and the ratchet baseline holds no entry for them any more.
const { describe, it } = require('../_support/dual-runner'); // P3020
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { scan, NODE20_SHAS } = require('../../scripts/ci/workflow-hygiene-gate');

const ROOT = path.resolve(__dirname, '../..');
const WF = path.join(ROOT, '.github/workflows');
const targets = fs.readdirSync(WF).filter((f) => /^(publish|auto-publish-on-push|monthly-.*)\.ya?ml$/.test(f));

describe('P3025b push helper + node24 pins', function () {
  it('covers publish.yml and auto-publish-on-push.yml', () => {
    assert.ok(targets.includes('publish.yml'));
    assert.ok(targets.includes('auto-publish-on-push.yml'));
  });

  it('no raw git push left in the publish/monthly workflows (helper only)', () => {
    const raw = scan(ROOT).filter((f) => f.rule === 'raw-push' && targets.includes(path.basename(f.file)));
    assert.deepStrictEqual(raw, []);
    for (const f of targets) {
      const t = fs.readFileSync(path.join(WF, f), 'utf8');
      assert.ok(!/git\s+push\b[^\n]*\s-f\b/.test(t), `${f}: forced push`);
      assert.ok(!/git\s+push\b[^\n]*--force/.test(t), `${f}: forced push`);
    }
    assert.match(fs.readFileSync(path.join(WF, 'publish.yml'), 'utf8'), /git-push-retry\.sh --branch "\$BRANCH" --prefer-local --tag "v\$\{\{ steps\.bump\.outputs\.version \}\}"/);
  });

  it('no node20 action anywhere, upload-artifact v5.0.0 (node20) is now detected', () => {
    assert.ok(NODE20_SHAS.has('330a01c490aca151604b8cf639adc76d48f6c5d4'));
    assert.deepStrictEqual(scan(ROOT).filter((f) => f.rule === 'node20-action'), []);
  });

  it('baseline no longer lists node20 actions nor the publish/monthly raw pushes', () => {
    const b = JSON.parse(fs.readFileSync(path.join(ROOT, '.github/workflow-hygiene-baseline.json'), 'utf8'));
    const list = b.findings || b;
    assert.ok(!list.some((f) => f.rule === 'node20-action'));
    assert.ok(!list.some((f) => f.rule === 'raw-push' && targets.includes(path.basename(f.file))));
  });
});
