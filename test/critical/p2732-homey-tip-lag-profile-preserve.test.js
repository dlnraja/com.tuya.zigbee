'use strict';
/**
 * P2732 — Homey tip mails 2026-09-25 integral: tip-lag + fleet profile preserve
 *
 * Contre quoi (Gmail tip flood):
 *  - Universal #3365 (9.0.1245) + #3366 (9.0.1247) PF socket hang while Test tip stays #3364=9.0.1244
 *  - Stable #247 testing OK (5.12.339)
 *  - Fleet enrich renderCouplePage wiped clrdrnya "## Known bugs" → p2579 CI red / blocked Auto-Publish
 *
 * Dual-app: BOTH (publish soft-continue + enrich preserve)
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const { tipLagDecision, softExpectDecision } = require('../../scripts/lib/soft-expect-decision');
const {
  mergeCouplePagePreservingCurated,
  renderCouplePage,
} = require('../../tools/ci/render-enrichment-index');

describe('P2732 Homey tip-lag + couple profile preserve', () => {
  
  it('softExpectDecision skips tip-lag expected PF (no createBuild spam)', () => {
    const builds = [
      { id: 3367, version: '9.0.1248', state: 'processing_failed', stateMeta: 'socket hang up' },
      { id: 3364, version: '9.0.1244', state: 'test' },
    ];
    const d = softExpectDecision(builds, '9.0.1248');
    assert.strictEqual(d.skip, true);
    assert.strictEqual(d.reason, 'tip-lag-expected-pf');
  });

  it('tipLagDecision flags expected PF while older tip healthy', () => {
    const builds = [
      { id: 3366, version: '9.0.1247', state: 'processing_failed', stateMeta: 'socket hang up' },
      { id: 3365, version: '9.0.1245', state: 'processing_failed', stateMeta: 'socket hang up' },
      { id: 3364, version: '9.0.1244', state: 'test' },
    ];
    const lag = tipLagDecision(builds, '9.0.1247');
    assert.strictEqual(lag.tipLag, true);
    assert.strictEqual(lag.reason, 'expected-version-pf-tip-behind');
    assert.strictEqual(String(lag.tip.version), '9.0.1244');
    assert.ok(lag.failed && lag.failed.length >= 1);

    const ok = tipLagDecision(builds, '9.0.1244');
    assert.strictEqual(ok.tipLag, false);
  });

  it('mergeCouplePagePreservingCurated keeps Known bugs after fleet regenerate', () => {
    const existing = [
      '# Couple profile — `_TZE204_clrdrnya+TS0601`',
      '',
      '- Driver: **presence_sensor_radar**',
      '',
      '---',
      'See `docs/guides/DP_INTERPRETATION.md`',
      '',
      '## Known bugs (P2579 — MTG075 / MTG235)',
      '',
      '- **occupied** sensor mode can stick true',
      '- Distance is **quantized** (~2.8 m steps)',
      '',
    ].join('\n');
    const generated = renderCouplePage('_TZE204_clrdrnya|TS0601', {
      driver: 'presence_sensor_radar',
      caseId: 'presence-radar-clrdrnya',
      sources: ['registry'],
      dps: { 1: { name: 'presence', direction: 'rx' } },
    });
    const merged = mergeCouplePagePreservingCurated(existing, generated);
    assert.ok(merged.includes('occupied'), 'must preserve occupied Known bugs');
    assert.ok(merged.includes('quantized') || merged.includes('2.8'), 'must preserve quantized note');
    assert.ok(merged.includes('presence_sensor_radar'));
  });

  it('live clrdrnya profile still documents P2579 Known bugs', () => {
    const p = path.join(ROOT, 'docs/knowledge/profiles/couples/_TZE204_clrdrnya_TS0601.md');
    // Stable clone may omit profile pages — master MUST keep Contre quoi lock
    if (!fs.existsSync(p)) {
      const id = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8')).id || '';
      assert.ok(/\.stable$|\.bastien$/.test(id), 'master must ship clrdrnya couple profile');
      return;
    }
    const md = fs.readFileSync(p, 'utf8');
    assert.ok(md.includes('Known bugs'));
    assert.ok(md.includes('occupied'));
  });

  it('publish-ssot records 2026-09-25 tip flood + P2732', () => {
    const ssot = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/architecture/publish-ssot.json'), 'utf8'));
    const flood = ssot.p139?.gmailFlood2026_09_25;
    assert.ok(flood, 'must record gmailFlood2026_09_25');
    assert.ok((flood.universalFailed || []).some((x) => /3366|3365|3370/.test(String(x))));
    assert.ok(flood.liveTip && /3371|3364|9\.0\.(1252|1244)/.test(String(flood.liveTip)));
    assert.ok(ssot.p2732?.tipLagDecision && ssot.p2732?.preserveCoupleKnownBugs);
    assert.ok(ssot.p2738?.bastienPublish, 'must lock P2738 Bastien soft-expect-first');
  });

  it('Bastien #114 PF tip-lag soft-expects while #113 healthy (Gmail PM)', () => {
    const builds = [
      { id: 114, version: '1.0.105', state: 'processing_failed', stateMeta: 'socket hang up' },
      { id: 113, version: '1.0.103', state: 'test' },
    ];
    const lag = tipLagDecision(builds, '1.0.105');
    assert.strictEqual(lag.tipLag, true);
    assert.strictEqual(String(lag.tip.version), '1.0.103');
    const soft = softExpectDecision(builds, '1.0.105');
    assert.strictEqual(soft.skip, true);
    assert.strictEqual(soft.reason, 'tip-lag-expected-pf');
  });

  it('Universal #3370 PF while #3371 testing does not tip-lag expected 9.0.1252', () => {
    const builds = [
      { id: 3371, version: '9.0.1252', state: 'test' },
      { id: 3370, version: '9.0.1251', state: 'processing_failed', stateMeta: 'socket hang up' },
    ];
    const ok = tipLagDecision(builds, '9.0.1252');
    assert.strictEqual(ok.tipLag, false);
    assert.strictEqual(String(ok.tip.version), '9.0.1252');
  });

  it('bastien-publish.yml soft-expect-first + Wait Athom (P2738)', () => {
    const yml = fs.readFileSync(path.join(ROOT, '.github/workflows/bastien-publish.yml'), 'utf8');
    assert.ok(/P2738/.test(yml), 'must document P2738');
    assert.ok(/soft-expect/.test(yml) && /direct-api-publish/.test(yml));
    assert.ok(/no Homey CLI createBuild|no Homey CLI/.test(yml));
    assert.ok(/Wait Athom draft ready/.test(yml));
    assert.ok(/HOMEY_DRAFT_EARLY_FAIL_MS/.test(yml));
    assert.ok(/draft_ok == 'true'/.test(yml), 'promote must gate on draft_ok');
  });
});
