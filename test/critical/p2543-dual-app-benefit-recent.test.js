'use strict';

/**
 * P2543 — Dual-app benefit Contre quoi.
 * BOTH: ProtocolFallbackChain full RX order on stable; AQ dual-case union;
 * local-intelligent-solver present; never shrink unique couples.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function loadCompose(driverId) {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, 'drivers', driverId, 'driver.compose.json'), 'utf8')
  );
}

describe('P2543 dual-app benefit recent advances', () => {
  it('SSOT + orchestrator exist', () => {
    for (const rel of [
      'config/architecture/dual-app-benefit-recent-ssot.json',
      'tools/ci/dual-app-benefit-recent.js',
    ]) {
      assert.ok(fs.existsSync(path.join(ROOT, rel)), rel);
    }
    const ssot = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/architecture/dual-app-benefit-recent-ssot.json'), 'utf8')
    );
    assert.equal(ssot._meta.patch, 'P2543');
    assert.equal(ssot._meta.dualApp, 'BOTH');
    assert.equal(ssot.doctrine.complementaryOnly, true);
    assert.equal(ssot.doctrine.neverCopyAppIdOrVersion, true);
    assert.ok(ssot.recentBothPacks.some((p) => /P2542/.test(p)));
  });

  it('ProtocolFallbackChain keeps complementary RX order (raw_cluster_fallback)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/io/ProtocolFallbackChain.js'), 'utf8');
    assert.match(src, /raw_cluster_fallback/);
    assert.match(src, /tuya_bound/);
    assert.match(src, /cluster_command|mcu_version_helper/);
    // Contre quoi: old short chain missing bound/mcu steps
    assert.ok(src.includes('DEFAULT_RX_ORDER'));
  });

  it('air_quality_co2 dual-case density stays complementary (unique ≥23, forms ≥62)', () => {
    const aq = loadCompose('air_quality_co2');
    const mfrs = aq.zigbee?.manufacturerName || [];
    const unique = new Set(mfrs.map((m) => String(m).toLowerCase()));
    assert.ok(unique.size >= 23, `unique couples shrank: ${unique.size}`);
    assert.ok(mfrs.length >= 72, `dual-case forms shrank: ${mfrs.length}`);
    assert.ok(mfrs.some((m) => /yvx5lh6k/i.test(m)));
    assert.ok(mfrs.some((m) => /8b9zpaav/i.test(m)));
  });

  it('local auto-improve + forfait artifacts present', () => {
    for (const rel of [
      'tools/ci/local-auto-improve-orchestrator.js',
      'tools/ci/local-intelligent-solver.js',
      'config/architecture/local-auto-improve-ssot.json',
      'lib/features/LocalSelfImproveCatalog.js',
    ]) {
      assert.ok(fs.existsSync(path.join(ROOT, rel)), rel);
    }
  });

  it('climate_sensor does not host AQ sacred couples', () => {
    const climate = loadCompose('climate_sensor');
    const bad = (climate.zigbee?.manufacturerName || []).filter((m) =>
      /yvx5lh6k|8ygsuhe1|mja3fuja|ryfmq5rl|c2fmom5z/i.test(m)
    );
    assert.equal(bad.length, 0, `climate still has ${bad.join(',')}`);
  });
});
