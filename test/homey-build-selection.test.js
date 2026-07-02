'use strict';

const assert = require('assert');
const {
  selectPromotionTarget,
  summarizeBuild,
} = require('../.github/scripts/homey-build-selection');

describe('Homey build selection', function() {
  it('treats the current version on test as success even when old drafts exist', function() {
    const result = selectPromotionTarget([
      { id: 2471, version: '9.0.15', state: 'draft' },
      { id: 2519, version: '9.0.150', state: 'test' },
    ], '9.0.150');

    assert.strictEqual(result.status, 'already-test');
    assert.strictEqual(summarizeBuild(result.build), '#2519 v9.0.150 test');
  });

  it('selects the current version draft before newer-looking historical drafts', function() {
    const result = selectPromotionTarget([
      { id: 'build-2600', version: '9.0.12', state: 'draft' },
      { id: 'build-2519', version: 'v9.0.150', state: 'draft' },
    ], '9.0.150');

    assert.strictEqual(result.status, 'promote');
    assert.strictEqual(result.build.id, 'build-2519');
  });

  it('does not fall back to historical drafts when an expected version is known', function() {
    const result = selectPromotionTarget([
      { id: 2471, version: '9.0.15', state: 'draft' },
    ], '9.0.150');

    assert.strictEqual(result.status, 'current-not-found');
  });
});
