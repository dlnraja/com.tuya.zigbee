'use strict';
// Mail routine 01/11: every line of the Athom publish outcomes ledger must be valid JSON
// and the processing_failed build #3688 (9.0.1606) must be recorded once.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('athom-publish-outcomes.jsonl', () => {
  const file = path.join(__dirname, '..', '..', 'docs', 'knowledge', 'athom-publish-outcomes.jsonl');
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim());
  it('every line parses as JSON', () => {
    lines.forEach((l, i) => assert.doesNotThrow(() => JSON.parse(l), `line ${i + 1}`));
  });
  it('records build 3688 exactly once', () => {
    const hits = lines.map((l) => JSON.parse(l)).filter((o) => o.build === 3688 || o.buildId === 3688);
    assert.strictEqual(hits.length, 1);
    assert.strictEqual(hits[0].version, '9.0.1606');
  });
});
