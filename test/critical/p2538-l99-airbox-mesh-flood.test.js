'use strict';

/**
 * P2538 — L99 airbox sacred couples + Z2M DP map Contre quoi.
 * BOTH reliability. Never invent pid; complementary only.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function loadJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

describe('P2538 L99 airbox + mesh flood enrich', () => {
  it('locks _TZE284_8b9zpaav + TS0601 on air_quality_co2 (not climate)', () => {
    const aq = loadJson('drivers/air_quality_co2/driver.compose.json');
    const cl = loadJson('drivers/climate_sensor/driver.compose.json');
    const aqMfr = (aq.zigbee.manufacturerName || []).map((m) => String(m).toLowerCase());
    const clMfr = (cl.zigbee.manufacturerName || []).map((m) => String(m).toLowerCase());
    assert.ok(aqMfr.includes('_tze284_8b9zpaav'));
    assert.ok(aqMfr.includes('_tze284_it9utkro'));
    assert.ok(aq.zigbee.productId.includes('TS0601'));
    assert.ok(!clMfr.includes('_tze284_8b9zpaav'), 'climate must not claim 8b9zpaav');
    assert.ok(!clMfr.includes('_tze284_it9utkro'), 'climate must not claim it9utkro');
  });

  it('device.js DP map matches Z2M airbox (DP2 CO2 — not DP1–4 layout)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/air_quality_co2/device.js'), 'utf8');
    assert.match(src, /8B9ZPAAV\|IT9UTKRO/);
    assert.match(src, /P2538/);
    assert.ok(!/DP1=CO2, DP2=HCHO, DP3=temp, DP4=humidity/.test(src));
    // Explicit airbox return must map DP2→co2
    assert.match(src, /isAirboxZ2m[\s\S]*2:\s*\{\s*capability:\s*'measure_co2'/);
  });

  it('mains CO2 helper includes airbox mfrs; EnrichedDPMappings AIRBOX profile resolves', () => {
    const { isMainsCo2Mfr } = require(path.join(ROOT, 'lib/helpers/batteryPowerSource.js'));
    assert.equal(isMainsCo2Mfr('_TZE284_8b9zpaav'), true);
    assert.equal(isMainsCo2Mfr('_TZE284_it9utkro'), true);
    const { AIR_QUALITY_DPS, MANUFACTURER_DP_PROFILES } = require(
      path.join(ROOT, 'lib/tuya/EnrichedDPMappings.js')
    );
    assert.ok(AIR_QUALITY_DPS.AIRBOX);
    assert.equal(AIR_QUALITY_DPS.COMPREHENSIVE, AIR_QUALITY_DPS.AIRBOX);
    assert.equal(AIR_QUALITY_DPS.AIRBOX[2].capability, 'measure_co2');
    assert.equal(AIR_QUALITY_DPS.AIRBOX[21].capability, 'measure_voc');
    assert.equal(MANUFACTURER_DP_PROFILES['_TZE284_8b9zpaav'].profile, AIR_QUALITY_DPS.AIRBOX);
  });

  it('misattribution registry forbids climate for airbox couples', () => {
    const reg = loadJson('data/user-misattribution-registry.json');
    const c8 = reg.cases.find((c) => c.id === 'p2538-tze284-8b9zpaav-airbox');
    const c9 = reg.cases.find((c) => c.id === 'p2538-tze284-it9utkro-pm25-airbox');
    assert.ok(c8);
    assert.equal(c8.canonicalDriver, 'air_quality_co2');
    assert.ok(c8.forbiddenDrivers.includes('climate_sensor'));
    assert.ok(c9);
    assert.equal(c9.canonicalDriver, 'air_quality_co2');
  });

  it('evolution SSOT documents mesh flood risk; diagnostics expose tip', () => {
    const evo = require(path.join(ROOT, 'lib/utils/zigbee-tuya-evolution.js'));
    const ssot = evo.loadEvolutionSsot();
    assert.equal(ssot.patch, 'P2538');
    assert.ok((ssot.operationalRisks || []).some((r) => r.id === 'tuya-tx-mesh-flood'));
    assert.ok((ssot.homeyAppImplications || []).some((t) => /mesh|0x10|BootBudget/i.test(t)));
    const brief = evo.getDiagnosticsRfBrief();
    assert.ok(Array.isArray(brief.meshFloodNote));
    assert.ok(brief.tips.some((t) => /Mesh TX|15\/20\/25|Zigbee/i.test(t)));
  });
});
