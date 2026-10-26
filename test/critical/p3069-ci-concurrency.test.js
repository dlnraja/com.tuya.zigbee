'use strict';
// P3069: Node 22 tests on a pushed branch let the running job finish (only PRs cancel), so a burst
// of pushes from several workers still ends in a verdict; documented in docs/knowledge.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

test('node22-tests cancels in-progress runs only for pull requests, with bounded job time', () => {
  const s = fs.readFileSync(path.join(ROOT, '.github/workflows/node22-tests.yml'), 'utf8');
  const block = /^concurrency:\n((?: {2}.*\n)+)/m.exec(s);
  assert.ok(block, 'concurrency block present');
  assert.match(block[1], /group: node22-tests-\$\{\{ github\.ref \}\}/);
  assert.match(block[1], /cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/);
  const jobs = (s.split(/^jobs:\n/m)[1] || '').match(/^ {2}[A-Za-z0-9_-]+:\s*$/gm) || [];
  assert.ok(jobs.length >= 1 && (s.match(/timeout-minutes: \d+/g) || []).length >= jobs.length, 'each job keeps a timeout');
  assert.ok(fs.existsSync(path.join(ROOT, 'docs/knowledge/CI_CONCURRENCY.md')));
});
