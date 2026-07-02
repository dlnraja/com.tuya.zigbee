'use strict';

const assert = require('assert');
const {
  isDraft,
  selectPromotionTarget,
  summarizeBuild,
  textHasVersion,
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

  it('treats empty and none build states as draft candidates', function() {
    assert.strictEqual(isDraft({ id: 2520, version: '9.0.151', state: '' }), true);
    assert.strictEqual(isDraft({ id: 2521, version: '9.0.151', channel: 'none' }), true);
    assert.strictEqual(isDraft({ id: 2522, version: '9.0.151', status: 'test' }), false);
  });

  it('matches versions exactly in dashboard text', function() {
    assert.strictEqual(textHasVersion('Build #2519 v9.0.150 test', '9.0.150'), true);
    assert.strictEqual(textHasVersion('Build #2519 v9.0.150 test', '9.0.15'), false);
    assert.strictEqual(textHasVersion('Build #2520 v9.0.1500 draft', '9.0.150'), false);
  });

  it('selects a current version draft when Athom reports an empty state', function() {
    const result = selectPromotionTarget([
      { id: 2520, version: '9.0.151', state: '' },
      { id: 2519, version: '9.0.150', state: 'test' },
    ], '9.0.151');

    assert.strictEqual(result.status, 'promote');
    assert.strictEqual(result.build.id, 2520);
  });
});
