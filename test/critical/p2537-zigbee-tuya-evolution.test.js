'use strict';

/**
 * P2537 — Zigbee/Tuya evolution SSOT Contre quoi.
 * Locks lineage (3.0 → PRO 2023 → 4.0), Suzi ≠ replace 2.4 GHz, Tuya EF00 + MCU v3.x.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const evo = require(path.join(ROOT, 'lib', 'utils', 'zigbee-tuya-evolution.js'));
const rf = require(path.join(ROOT, 'lib', 'utils', 'rf-channel-coexistence.js'));

describe('P2537 Zigbee + Tuya evolution SSOT', () => {
  it('SSOT JSON has Zigbee 4.0 current + Suzi derivative', () => {
    const ssot = evo.loadEvolutionSsot();
    assert.equal(ssot.patch, 'P2537');
    assert.ok(ssot.zigbeeLineage.some((e) => e.id === 'zigbee-3.0'));
    assert.ok(ssot.zigbeeLineage.some((e) => e.id === 'zigbee-pro-2023'));
    const z40 = ssot.zigbeeLineage.find((e) => e.id === 'zigbee-4.0');
    assert.ok(z40);
    assert.equal(z40.status, 'current_generation');
    assert.equal(z40.year, 2025);
    const suzi = ssot.derivatives.find((d) => d.id === 'suzi');
    assert.ok(suzi);
    assert.equal(suzi.replaces24ghz, false);
    assert.equal(suzi.bands.EU, '800 MHz');
    assert.ok(ssot.derivatives.some((d) => d.id === 'green-power'));
    assert.ok(ssot.derivatives.some((d) => d.id === 'zigbee-direct'));
  });

  it('Tuya stack locks EF00 + MCU v3.1–v3.5 + common prefixes', () => {
    const brief = evo.zigbeeTuyaEvolutionBrief();
    assert.equal(brief.ef00Cluster, '0xEF00');
    assert.deepEqual(brief.mcuUartVersions, ['v3.1', 'v3.2', 'v3.3', 'v3.4', 'v3.5']);
    assert.ok(brief.tuyaMfrPrefixes.includes('_TZE200_'));
    assert.ok(brief.tuyaMfrPrefixes.includes('_TZE284_'));
    assert.ok(brief.tuyaMfrPrefixes.includes('_TZ3000_'));
    assert.equal(brief.suziReplaces24ghz, false);
    assert.match(brief.homeyDefaultRadio, /2\.4 GHz/);
  });

  it('docs + RF guide point at evolution SSOT; no invent pid pattern in SSOT doctrine', () => {
    const md = fs.readFileSync(
      path.join(ROOT, 'docs', 'architecture', 'ZIGBEE_TUYA_EVOLUTION_SSOT.md'),
      'utf8'
    );
    assert.match(md, /Zigbee 4\.0/);
    assert.match(md, /Suzi/);
    assert.match(md, /0xEF00/);
    const rfMd = fs.readFileSync(
      path.join(ROOT, 'docs', 'guides', 'RF_CHANNEL_COEXISTENCE.md'),
      'utf8'
    );
    assert.match(rfMd, /P2537|ZIGBEE_TUYA_EVOLUTION/);
    const ssot = evo.loadEvolutionSsot();
    assert.equal(ssot.doctrine.noInventPid, true);
    assert.equal(ssot.doctrine.suziNotDropInOnExistingHomey, true);
  });

  it('protocolSelectionBrief mentions Zigbee 4.0 / Suzi coexistence tip', () => {
    const tips = rf.protocolSelectionBrief().tips;
    assert.ok(tips.some((t) => /Zigbee 4\.0|Suzi/i.test(t)));
  });

  it('enforces the four Homey implications (RF / no invent / MCU guess / no compose awareness tags)', () => {
    const brief = evo.zigbeeTuyaEvolutionBrief();
    assert.ok(brief.implications.some((t) => /1\/6\/11/.test(t) && /15\/20\/25/.test(t)));
    assert.ok(brief.implications.some((t) => /Suzi|Green Power/i.test(t)));
    assert.ok(brief.implications.some((t) => /MCU time format/i.test(t)));
    assert.ok(brief.implications.some((t) => /compose clusters|interview/i.test(t)));

    const result = evo.assertHomeyImplications({ scanDrivers: true });
    assert.equal(result.ok, true, result.failures.join(' | '));
  });

  it('diagnostics RF brief prefers 15/20/25 and DiagnosticAPI wires soft hook', () => {
    const brief = evo.getDiagnosticsRfBrief();
    assert.deepEqual(brief.preferredZigbee.slice(0, 3), [15, 20, 25]);
    assert.equal(brief.suziReplaces24ghz, false);
    assert.match(brief.suziNote || '', /2\.4 GHz/i);
    const diagSrc = fs.readFileSync(
      path.join(ROOT, 'lib', 'diagnostics', 'DiagnosticAPI.js'),
      'utf8'
    );
    assert.match(diagSrc, /getDiagnosticsRfBrief|getRfCoexistenceBrief/);
    assert.match(diagSrc, /RF_COEXISTENCE/);
  });
});
