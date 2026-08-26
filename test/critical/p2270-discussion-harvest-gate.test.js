'use strict';

/**
 * P2270 — Discussion harvest gate
 * WHY: Ensure ≥50 discoveries recorded and PathFinder / lexicon basics stay wired.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { describe, it } = require('node:test');

const ROOT = path.join(__dirname, '..', '..');

describe('P2270 discussion harvest + pathfind', () => {
  it('DISCOVERIES.json has ≥50 items', () => {
    const p = path.join(ROOT, 'reports', 'discussion-harvest-2026-08-26', 'DISCOVERIES.json');
    assert.ok(fs.existsSync(p), 'missing DISCOVERIES.json');
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert.ok((j.discoveries || []).length >= 50, `expected ≥50 got ${(j.discoveries || []).length}`);
    assert.strictEqual(j.count, (j.discoveries || []).length, 'count field must match discoveries.length');
  });

  it('DISCOVERIES.md stays in sync with JSON', () => {
    const md = fs.readFileSync(path.join(ROOT, 'reports', 'discussion-harvest-2026-08-26', 'DISCOVERIES.md'), 'utf8');
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'reports', 'discussion-harvest-2026-08-26', 'DISCOVERIES.json'), 'utf8'));
    assert.ok(md.includes(`Count: **${j.discoveries.length}**`) || md.includes(`Count: ${j.discoveries.length}`));
    assert.ok(md.includes('D001'));
    assert.ok(md.includes('CommunicationPathFinder') || md.includes('ZclClusterLexicon') || md.includes('Keep'));
  });

  it('keeps PathFinder + lexicon WHY (plan previous)', () => {
    const pf = fs.readFileSync(path.join(ROOT, 'lib', 'protocol', 'CommunicationPathFinder.js'), 'utf8');
    const lex = fs.readFileSync(path.join(ROOT, 'lib', 'zigbee', 'ZclClusterLexicon.js'), 'utf8');
    assert.ok(pf.includes('rankPaths'));
    assert.ok(pf.includes('sacredZclOnly') || pf.includes('sacred'));
    assert.ok(/WHY|TIP IA|ORIGIN/i.test(pf));
    assert.ok(lex.includes('0xE002') || lex.includes('E002'));
    assert.ok(lex.includes('manuSpecificTuya2'));
    assert.ok(fs.existsSync(path.join(ROOT, 'docs', 'architecture', 'COMM_PATHFINDING.md')));
    assert.ok(fs.existsSync(path.join(ROOT, 'docs', 'architecture', 'SPAGHETTI_MAP.md')));
  });

  it('workflows wire harvest softFail (auto-enrich + forum-poll)', () => {
    const enrich = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'auto-enrich-closed-loop.yml'), 'utf8');
    const poll = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'forum-poll.yml'), 'utf8');
    assert.ok(enrich.includes('--phase=sync'), 'auto-enrich must run sync/harvest');
    assert.ok(poll.includes('--phase=sync'), 'forum-poll must run sync/harvest');
    assert.ok(enrich.includes('discovery-lineage-enrich-gate') || enrich.includes('discovery-lineage'), 'auto-enrich lineage');
    const phases = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'enrichment', 'phases.json'), 'utf8'));
    const syncIds = (phases.blocks.sync || []).map((s) => s.id);
    assert.ok(syncIds.includes('discover-discussions-p2270'));
    assert.ok(syncIds.includes('apply-parallel-couples-p2268'));
    assert.ok(syncIds.includes('remind-e002-taxonomy-p2267'));
    const lineage = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'enrichment', 'discovery-lineage.json'), 'utf8'));
    assert.ok((lineage.eras.recent.mustRemember || []).some((x) => x.id === 'P2267'));
    assert.ok((lineage.eras.recent.mustRemember || []).some((x) => x.id === 'P2268'));
    assert.ok((lineage.eras.past.mustRemember || []).some((x) => x.id === 'P102' || x.id === 'P2138'));
  });

  it('CommunicationPathFinder blocks tuya_dp for sacred zcl_only', () => {
    const { rankPaths, bestPath } = require('../../lib/protocol/CommunicationPathFinder');
    const ranked = rankPaths({
      sacredZclOnly: true,
      clustersPresent: [0x0006, 0xEF00],
      capability: 'onoff',
    });
    assert.ok(ranked.length > 0);
    const dp = ranked.find((r) => r.id === 'tuya_dp');
    assert.ok(dp && dp.score < 0, 'tuya_dp must be heavily penalized');
    const best = bestPath({ sacredZclOnly: true, clustersPresent: [0x0006], capability: 'onoff' });
    assert.ok(best && best.id !== 'tuya_dp');
  });

  it('ZclClusterLexicon resolves E002 as manuSpecificTuya2', () => {
    const { lookupCluster } = require('../../lib/zigbee/ZclClusterLexicon');
    const a = lookupCluster(0xE002);
    const b = lookupCluster('manuSpecificTuya2');
    assert.strictEqual(a.id, 0xE002);
    assert.strictEqual(b.id, 0xE002);
  });

  it('BatteryMasterEngine LowLevelBridge path is parent-relative', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'battery', 'BatteryMasterEngine.js'), 'utf8');
    assert.ok(!src.includes("require('./LowLevelBridge')"), 'broken ./LowLevelBridge must be gone');
    assert.ok(src.includes("require('../LowLevelBridge')"), 'expected ../LowLevelBridge');
  });

  it('compose locks P2270 couples', () => {
    const knob = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'smart_knob', 'driver.compose.json'), 'utf8'));
    assert.ok((knob.zigbee.manufacturerName || []).some((m) => /402vrq2i/i.test(m)));
    const metering = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'switch_4_gang_metering', 'driver.compose.json'), 'utf8'));
    assert.ok(!(metering.zigbee.manufacturerName || []).some((m) => /402vrq2i/i.test(m)));
    const sw1 = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'switch_1gang', 'driver.compose.json'), 'utf8'));
    assert.ok(!(sw1.zigbee.manufacturerName || []).some((m) => /hlx9tnzb/i.test(m)));
    const strip = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'socket_power_strip', 'driver.compose.json'), 'utf8'));
    assert.ok((strip.zigbee.manufacturerName || []).some((m) => /6cmeijtd/i.test(m)));
    const dongle = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'usb_dongle_triple', 'driver.compose.json'), 'utf8'));
    assert.ok(!(dongle.zigbee.manufacturerName || []).some((m) => /6cmeijtd/i.test(m)));
  });

  it('P2276 unsteals smoke + 3-phase from climate', () => {
    const climate = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'climate_sensor', 'driver.compose.json'), 'utf8'));
    assert.ok(!(climate.zigbee.manufacturerName || []).some((m) => /rccxox8p/i.test(m)));
    assert.ok(!(climate.zigbee.manufacturerName || []).some((m) => /dikb3dp6/i.test(m)));
    const smoke = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'smoke_sensor2', 'driver.compose.json'), 'utf8'));
    assert.ok((smoke.zigbee.manufacturerName || []).some((m) => /rccxox8p/i.test(m)));
    const meter = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'energy_meter_3phase', 'driver.compose.json'), 'utf8'));
    assert.ok((meter.zigbee.manufacturerName || []).some((m) => /dikb3dp6/i.test(m)));
  });
});
