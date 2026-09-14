'use strict';

/**
 * P2502 — Fleet complementary methods Contre quoi
 * VicHY / Eduard / MIAMO / Peter / PresentSky — stack ALL failover layers.
 * Peter 375def7f + 8278ec79 = heap OOM MaxListeners (P2484), not invent pid.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2502 fleet complementary failover methods', () => {
  const ssot = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'config/architecture/fleet-complementary-methods-ssot.json'),
    'utf8',
  ));
  const forum = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'config/architecture/forum-complementary-failover-ssot.json'),
    'utf8',
  ));

  it('SSOT covers all five fleet users + method stack', () => {
    for (const u of ['VicHY', 'Eduard_Martirosyan', 'MIAMO_NISU', 'Peter_van_Werkhoven', 'PresentSky']) {
      assert.ok(ssot.users[u], `missing user ${u}`);
      assert.ok(Array.isArray(ssot.users[u].complementary) && ssot.users[u].complementary.length >= 1);
      assert.ok(Array.isArray(ssot.users[u].alternatives));
      assert.ok(Array.isArray(ssot.users[u].fallback));
    }
    assert.ok(ssot.methodStackOrder.includes('ef00_oom_idempotent'));
    assert.ok(ssot.methodStackOrder.includes('sacred_keep_compact'));
  });

  it('Peter crash diags classified as heap_oom_maxlisteners → P2484 tip-lag', () => {
    const p = ssot.users.Peter_van_Werkhoven.diags;
    assert.equal(p['375def7f'].class, 'heap_oom_maxlisteners');
    assert.equal(p['375def7f'].version, '9.0.895');
    assert.match(p['375def7f'].treat, /P2484/);
    assert.equal(p['8278ec79'].class, 'heap_oom_maxlisteners');
    assert.equal(p['8278ec79'].version, '9.0.908');
    assert.match(p['8278ec79'].treat, /P2484/);
    assert.ok(p.a5304ce8);
    assert.ok(p['77394256']);
  });

  it('local sanitized diags prove OOM not motionsensor for Peter crashes', () => {
    for (const [uuid, ver] of [
      ['375def7f-d73b-4078-9e87-3ff28e578805', '9.0.895'],
      ['8278ec79-cee4-44ea-8697-b3e448bed729', '9.0.908'],
    ]) {
      const p = path.join(ROOT, '.github/state/homey-app-diag', `${uuid}.sanitized.json`);
      if (!fs.existsSync(p)) {
        // Soft: CI may lack state — SSOT still locks classification
        continue;
      }
      const j = JSON.parse(fs.readFileSync(p, 'utf8'));
      assert.equal(j.version, ver);
      const log = j.logSanitized || '';
      assert.match(log, /heap out of memory/i);
      assert.match(log, /MaxListenersExceededWarning/i);
      assert.ok(!/Driver Not Initialized: motionsensor/i.test(log));
    }
  });

  it('PresentSky marked RESOLVED_re_add; MIAMO root gap is icka1clh compact', () => {
    assert.equal(ssot.users.PresentSky.status, 'RESOLVED_re_add');
    assert.match(ssot.users.MIAMO_NISU.couple, /icka1clh/);
    assert.ok(ssot.users.MIAMO_NISU.complementary.some((s) => /fodv6bkr|compact/i.test(s)));
  });

  it('forum complementary SSOT still lists Peter crash UUIDs', () => {
    const diags = forum.users.Peter_van_Werkhoven.diags;
    assert.ok(diags.includes('375def7f'));
    assert.ok(diags.includes('8278ec79'));
  });

  it('P2484 EF00 idempotent + P2481/P2490 runtime files exist', () => {
    const ef00 = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaEF00Manager.js'), 'utf8');
    assert.match(ef00, /P2484/);
    assert.match(ef00, /_ef00ListenersBound/);
    assert.ok(fs.existsSync(path.join(ROOT, 'lib/utils/safe-get-driver-patch.js')));
    assert.ok(fs.existsSync(path.join(ROOT, 'lib/performance/BootBudget.js')));
  });

  it('SMART ADAPT defers under BootBudget heap (Peter OOM complementary)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaZigbeeDevice.js'), 'utf8');
    assert.match(src, /P2502/);
    assert.match(src, /isHeapCritical\(\)/);
    assert.match(src, /shouldStartHeavyFeatures\(\)/);
    assert.match(src, /SMART ADAPT.*Deferred|Deferred \(heap/i);
  });
});
