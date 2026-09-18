'use strict';

/**
 * P2586 — Homey RAM/RSS + lazy/dynamic load harden
 *
 * Contre quoi:
 * - BootBudget ignores RSS (Peter 93.8MB grey Flows)
 * - LiveDataUpdater JSON.parse(utf8 string) double allocation
 * - IntelligentLazyLoad has no size cap / LRU / pressure trim
 * - LIVE_RSS gates fire on fat IDE hosts during unit tests
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const BootBudget = require('../../lib/performance/BootBudget');
const Lazy = require('../../lib/performance/IntelligentLazyLoad');

describe('P2586 Homey RAM/RSS lazy-dynamic harden', () => {
  it('BootBudget exposes RSS thresholds + summary', () => {
    assert.ok(BootBudget.RSS_HEAVY_MAX_BYTES >= 50 * 1024 * 1024);
    assert.ok(BootBudget.RSS_CRITICAL_BYTES > BootBudget.RSS_HEAVY_MAX_BYTES);
    assert.equal(typeof BootBudget.rssUsedBytes, 'function');
    assert.equal(typeof BootBudget.memoryPressureSummary, 'function');
    assert.equal(typeof BootBudget.shouldApplyLiveRss, 'function');
    // Unit tests: LIVE_RSS off by default
    assert.strictEqual(BootBudget.shouldApplyLiveRss(), false);
    assert.strictEqual(BootBudget.shouldStartHeavyFeatures(10 * 1024 * 1024), true);
    assert.strictEqual(
      BootBudget.shouldStartHeavyFeatures(10 * 1024 * 1024, { _bootBudgetRssBytes: 70 * 1024 * 1024 }),
      false,
    );
  });

  it('IntelligentLazyLoad Buffer parse + size cap + LRU trim', () => {
    const pkg = Lazy.loadJsonBuffer(path.join(ROOT, 'package.json'));
    assert.ok(pkg && pkg.name);
    assert.strictEqual(Lazy.parseJsonBuffer(Buffer.from('{"a":1}')).a, 1);
    assert.strictEqual(Lazy.loadJsonBuffer(path.join(ROOT, 'package.json'), { maxBytes: 10 }), null);
    Lazy.clearLazyCache();
    Lazy.setLazyCacheMax(4);
    for (let i = 0; i < 6; i++) {
      Lazy.lazyRequire(`p2586-${i}`, () => ({ i }), { heapBytes: 1 * 1024 * 1024 });
    }
    assert.ok(Lazy.lazyCacheSize() <= 4);
    Lazy.clearLazyCache();
  });

  it('app.js enables LIVE_RSS and logs rss; LiveDataUpdater uses Buffer JSON', () => {
    const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    assert.ok(appJs.includes('BOOTBUDGET_LIVE_RSS'));
    assert.ok(appJs.includes('rssUsedMb'));
    assert.ok(appJs.includes('trimLazyCacheUnderPressure'));
    const live = fs.readFileSync(path.join(ROOT, 'lib/dynamic/LiveDataUpdater.js'), 'utf8');
    assert.ok(live.includes('JSON.parse(buf)'));
    assert.ok(live.includes('BootBudget.isHeapCritical'));
    assert.ok(!live.includes("toString('utf8')"));
  });

  it('DriverMappingLoader + HeuristicUnknownResolver use Buffer/lazy path', () => {
    const dml = fs.readFileSync(path.join(ROOT, 'lib/utils/DriverMappingLoader.js'), 'utf8');
    assert.ok(dml.includes('parseJsonBuffer') || dml.includes('IntelligentLazyLoad'));
    const heur = fs.readFileSync(path.join(ROOT, 'lib/enrichment/HeuristicUnknownResolver.js'), 'utf8');
    assert.ok(heur.includes('loadJsonBuffer'));
  });

  it('npm check:p2586 wired; prune collision green after P2585 heal', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2586']);
    assert.ok(String(pkg.scripts['check:p258x']).includes('check:p2586'));
  });
});
