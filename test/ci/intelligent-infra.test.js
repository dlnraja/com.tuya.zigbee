'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..', '..');

describe('intelligent-infra SSOT', () => {
  it('parses intelligent-infra.json with memory + cache tiers', () => {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/architecture/intelligent-infra.json')));
    assert.equal(j.canonicalCiHttp, 'lib/scraper/smart-fetch.js');
    assert.ok(j.memory.heapHeavyMaxMb >= 40);
    assert.ok(Array.isArray(j.memory.tiers));
    assert.ok(j.cacheTiers.ci_http.dirs.length >= 3);
  });

  it('lists verified sources with neverInventPid', () => {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/architecture/verified-sources.json')));
    assert.equal(j._meta.neverInventPid, true);
    assert.ok(j.sources.some((s) => s.id === 'z2m'));
    assert.ok(j.sources.some((s) => s.id === 'forum-140352' && s.mode === 'SHADOW_GET_ONLY'));
  });

  it('enrichment manifest has knowledgeWriteTargets', () => {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/enrichment/manifest.json')));
    assert.ok(j.knowledgeWriteTargets.deviceTruth);
    assert.equal(j.knowledgeWriteTargets.deviceKnowledgeBase.status, 'read-only');
  });
});

describe('IntelligentLazyLoad', () => {
  const Lazy = require('../../lib/performance/IntelligentLazyLoad');

  it('loadJsonBuffer reads package.json via Buffer', () => {
    const pkg = Lazy.loadJsonBuffer(path.join(ROOT, 'package.json'));
    assert.ok(pkg && pkg.name);
  });

  it('lazyRequire caches factory result', () => {
    Lazy.clearLazyCache('test-lazy');
    let n = 0;
    const a = Lazy.lazyRequire('test-lazy', () => {
      n += 1;
      return { n };
    }, { heapBytes: 1 * 1024 * 1024 });
    const b = Lazy.lazyRequire('test-lazy', () => {
      n += 1;
      return { n };
    }, { heapBytes: 1 * 1024 * 1024 });
    assert.strictEqual(a, b);
    assert.strictEqual(n, 1);
  });

  it('lazyRequire returns fallback under critical-like heap bytes', () => {
    Lazy.clearLazyCache('test-pressure');
    const v = Lazy.lazyRequire('test-pressure', () => ({ ok: true }), {
      heapBytes: 90 * 1024 * 1024,
      fallback: { skipped: true },
    });
    assert.deepStrictEqual(v, { skipped: true });
  });
});

describe('intelligent-logger smoke', () => {
  it('exports createLogger and scrub', () => {
    const { createLogger, scrub, smoke } = require('../../tools/ci/intelligent-logger');
    assert.equal(scrub('token ghp_abcdefghijklmnopqrstuv'), 'token [REDACTED_TOKEN]');
    assert.equal(smoke(), true);
    const log = createLogger('test');
    assert.equal(typeof log.info, 'function');
  });
});
