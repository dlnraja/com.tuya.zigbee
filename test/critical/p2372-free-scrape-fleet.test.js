'use strict';

/**
 * P2372 — free scrape budget + driver-class enrich gates
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..', '..');

describe('P2372 free scrape + driver classes', () => {
  it('free-scrape-budget.json has daily caps and free_first mode', () => {
    const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/enrichment/free-scrape-budget.json'), 'utf8'));
    assert.equal(cfg.mode, 'free_first');
    assert.ok(cfg.dailyCaps.jina >= 40);
    assert.ok(cfg.dailyCaps.firecrawl <= 5);
    assert.equal(cfg.dailyCaps.browser, 0);
  });

  it('driver-class-coverage includes core classes', () => {
    const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/enrichment/driver-class-coverage.json'), 'utf8'));
    const ids = cfg.classes.map((c) => c.id);
    for (const need of ['button', 'socket', 'switch', 'sensor', 'curtain', 'thermostat', 'meter', 'light']) {
      assert.ok(ids.includes(need), `missing class ${need}`);
    }
    assert.equal(cfg.neverInventProductId, true);
  });

  it('free-scrape-budget preflight passes', () => {
    const { preflight } = require('../../tools/ci/free-scrape-budget');
    const p = preflight();
    assert.equal(p.ok, true);
  });

  it('fleet-intelligent-enrich workflow exists with forfait env (master)', () => {
    const ymlPath = path.join(ROOT, '.github/workflows/fleet-intelligent-enrich.yml');
    // WHY(P2372): workflow is MASTER_ONLY; stable soft-ports budget/heuristics without the cron file
    if (!fs.existsSync(ymlPath)) {
      assert.ok(fs.existsSync(path.join(ROOT, 'config/enrichment/free-scrape-budget.json')));
      return;
    }
    const yml = fs.readFileSync(ymlPath, 'utf8');
    assert.match(yml, /AI_PLAN_MODE: forfait/);
    assert.match(yml, /AI_ALLOW_PAID: 'false'/);
    assert.match(yml, /FIRECRAWL_DAILY_MAX: '3'/);
    assert.match(yml, /35 1,13/);
  });
});
