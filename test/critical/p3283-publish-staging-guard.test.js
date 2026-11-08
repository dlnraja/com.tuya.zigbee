'use strict';
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('P3283 publish staging excludes compose and follows the prepared dir', () => {
  const root = path.join(__dirname, '..', '..');
  it('the copy filter drops .homeycompose and .homeybuild', () => {
    const src = fs.readFileSync(path.join(root, 'scripts/prepare-publish.js'), 'utf8');
    assert.ok(src.includes("path.resolve(src) !== path.resolve(srcDir) && (name === '.homeycompose' || name === '.homeybuild')"));
  });
  it('the publish action uses the directory prepare-publish exported', () => {
    const src = fs.readFileSync(path.join(root, '.github/actions/homey-app-publish/action.yml'), 'utf8');
    assert.ok(src.includes('HOMEY_PUBLISH_DIR'));
    assert.ok(src.includes('homey-publish-temp'));
  });
});