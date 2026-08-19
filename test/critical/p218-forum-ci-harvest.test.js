'use strict';

/**
 * P218 — forum silent harvest must stay automated AND never POST.
 * PM inbox + screenshot/media scan run on a schedule; replies stay blocked.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('P218 forum CI harvest (read-only)', () => {
  it('dedicated PM workflow has a staggered cron and never enables auto-post', () => {
    const yml = read('.github/workflows/forum-pm-read.yml');
    assert.match(yml, /cron:\s*'50 7,19 \* \* \*'/);
    assert.match(yml, /forum-pm-read-only\.js/);
    assert.match(yml, /FORUM_AUTO_POST:\s*'0'/);
    assert.match(yml, /forum-dispatch-diag-if-new\.js/);
    assert.doesNotMatch(yml, /FORUM_AUTO_POST:\s*'1'/);
  });

  it('forum-poll harvests PMs and media on the 4h cadence', () => {
    const yml = read('.github/workflows/forum-poll.yml');
    assert.match(yml, /forum-pm-read-only\.js/);
    assert.match(yml, /forum-media-deep-scan\.js/);
    assert.match(yml, /HOMEY_EMAIL/);
    assert.match(yml, /FORUM_AUTO_POST:\s*'0'/);
  });

  it('auto-enrich and fetch-diags also scan media / PMs silently', () => {
    const enrich = read('.github/workflows/auto-enrich-closed-loop.yml');
    const fetch = read('.github/workflows/fetch-diags.yml');
    assert.match(enrich, /forum-pm-read-only\.js/);
    assert.match(enrich, /forum-media-deep-scan\.js/);
    assert.match(fetch, /forum-media-deep-scan\.js/);
    assert.match(enrich, /FORUM_AUTO_POST:\s*['"]0['"]/);
  });

  it('PM harvest and diag dispatch scripts have no POST path', () => {
    const readOnly = read('tools/ci/forum-pm-read-only.js');
    const dispatch = read('tools/ci/forum-dispatch-diag-if-new.js');
    assert.doesNotMatch(readOnly, /method:\s*['"]POST['"]/);
    assert.doesNotMatch(dispatch, /forum-responder|post-forum-update|\/posts\.json/);
    assert.match(readOnly, /read-only-never-post/);
    assert.match(dispatch, /never posts/);
  });
});
