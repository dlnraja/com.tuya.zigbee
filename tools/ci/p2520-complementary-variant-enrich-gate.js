#!/usr/bin/env node
'use strict';
/**
 * P2520 — Complementary variant enrich gate
 * Contre quoi: missing doctrine SSOT/helper, or merge helper that allows shrink.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '../..');
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(ROOT, rel))) fails.push(`missing ${rel}`);
}

mustExist('config/architecture/complementary-variant-enrich-ssot.json');
mustExist('docs/rules/COMPLEMENTARY_VARIANT_ENRICH.md');
mustExist('lib/enrichment/ComplementaryMerge.js');
mustExist('.cursor/rules/complementary-variant-enrich-always.mdc');

const ssot = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'config/architecture/complementary-variant-enrich-ssot.json'), 'utf8')
);
if (ssot._meta?.id !== 'P2520') fails.push('SSOT id not P2520');
if (!ssot.mandate?.always) fails.push('SSOT mandate.always missing');
if (!(ssot.vision?.enrichmentsAre || []).includes('variants')) fails.push('SSOT vision missing variants');

const merge = require('../../lib/enrichment/ComplementaryMerge');

// Union preserves prior mfr
{
  const u = merge.unionStrings(['_TZ3000_aaa', '_TZE200_bbb'], ['_tz3000_aaa', '_TZE284_ccc']);
  if (u.length < 3) fails.push('unionStrings lost entries');
  if (!u.some((m) => /ccc/i.test(m))) fails.push('unionStrings missed incoming');
}

// Settings append never wipe
{
  const before = [{ id: 'keep_me', type: 'text', value: 'x' }];
  const after = merge.appendSettingsById(before, [{ id: 'power_scale', type: 'dropdown', value: '1' }]);
  if (!after.some((s) => s.id === 'keep_me')) fails.push('appendSettings wiped keep_me');
  if (!after.some((s) => s.id === 'power_scale')) fails.push('appendSettings missed power_scale');
}

// wouldDegrade detects shrink
{
  const before = {
    zigbee: { manufacturerName: ['A', 'B'], productId: ['TS0601'] },
    capabilities: ['onoff', 'dim'],
    settings: [{ id: 'x' }],
  };
  const after = {
    zigbee: { manufacturerName: ['A'], productId: ['TS0601'] },
    capabilities: ['onoff'],
    settings: [],
  };
  if (!merge.wouldDegradeCompose(before, after)) fails.push('wouldDegradeCompose false negative');
}

// enrich-driver-settings must not wholesale assign settings = [group] for fleet
{
  const src = fs.readFileSync(path.join(ROOT, 'tools/ci/enrich-driver-settings-intelligent.js'), 'utf8');
  if (/data\.settings\s*=\s*\[\s*JSON\.parse/.test(src) && /device_din_rail_meter/.test(src)) {
    // allowed only if ComplementaryMerge / append path — flag old wipe pattern without appendSettingsById
    if (!src.includes('ComplementaryMerge') && !src.includes('appendSettingsById')) {
      fails.push('enrich-driver-settings still wipes settings without ComplementaryMerge');
    }
  }
}

// Cursor alwaysApply rule present
{
  const rule = fs.readFileSync(
    path.join(ROOT, '.cursor/rules/complementary-variant-enrich-always.mdc'),
    'utf8'
  );
  if (!/alwaysApply:\s*true/.test(rule)) fails.push('cursor rule not alwaysApply');
  if (!/P2520/.test(rule)) fails.push('cursor rule missing P2520');
}

if (fails.length) {
  console.error('P2520 FAIL');
  for (const f of fails) console.error(' -', f);
  process.exit(1);
}
console.log('P2520 PASS — complementary variant enrich doctrine locked');
process.exit(0);
