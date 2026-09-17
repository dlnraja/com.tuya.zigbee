#!/usr/bin/env node
'use strict';

/**
 * P2553 — Intelligent History fleet enable (compose complementary)
 *
 * WHY: Homey History/Insights needs getable:true + preventInsights:false on
 * sensor readables. 1000+ caps lacked explicit opts; runtime heal alone is slow
 * to discover. Compose lock + runtime (HomeyCapabilityUx) = BOTH.
 *
 * Intelligent silence:
 * - alarm_motion when alarm_human present (VicHY dual History)
 * - measure_luminance.distance* (mmWave flood)
 *
 * Usage:
 *   node tools/ci/p2553-history-fleet-enable.js --dry-run
 *   node tools/ci/p2553-history-fleet-enable.js --apply
 */

const fs = require('fs');
const path = require('path');
const {
  isSensorReadableCap,
  complementaryHistoryOptions,
  shouldSilenceInsights,
} = require('../../lib/utils/HomeyCapabilityUx');

const ROOT = path.join(__dirname, '..', '..');
const APPLY = process.argv.includes('--apply');
const DRY = !APPLY;

const PRIORITY_EXACT = new Set([
  'measure_battery',
  'measure_temperature',
  'measure_humidity',
  'measure_pressure',
  'measure_co2',
  'measure_pm25',
  'measure_luminance',
  'measure_noise',
  'measure_water',
  'measure_power',
  'measure_current',
  'measure_voltage',
  'meter_power',
  'alarm_motion',
  'alarm_human',
  'alarm_contact',
  'alarm_water',
  'alarm_smoke',
  'alarm_co',
  'alarm_gas',
  'alarm_heat',
  'alarm_tamper',
  'alarm_battery',
  'tuya_battery_low',
]);

function isPriorityCap(cap) {
  const id = String(cap || '');
  if (PRIORITY_EXACT.has(id)) return true;
  // subtypes like measure_temperature.outdoor, meter_power.imported
  const base = id.split('.')[0];
  if (PRIORITY_EXACT.has(base)) return true;
  if (/^alarm_/.test(id)) return true;
  if (/^measure_battery/.test(id)) return true;
  return false;
}

function main() {
  const driversDir = path.join(ROOT, 'drivers');
  let touched = 0;
  let capsSet = 0;
  let silenced = 0;
  const samples = [];

  for (const id of fs.readdirSync(driversDir)) {
    const composePath = path.join(driversDir, id, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;
    let j;
    try {
      j = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    } catch {
      continue;
    }
    const caps = Array.isArray(j.capabilities) ? j.capabilities : [];
    const opts = { ...(j.capabilitiesOptions || {}) };
    let changed = false;

    for (const cap of caps) {
      if (!isSensorReadableCap(cap) && cap !== 'tuya_battery_low') continue;
      // Priority compose lock — distance silence always; other sensors if priority
      const silence = shouldSilenceInsights(cap, caps);
      if (!silence && !isPriorityCap(cap)) continue;

      const next = complementaryHistoryOptions(cap, opts[cap], caps);
      const prev = opts[cap] || {};
      const prevG = prev.getable;
      const prevP = prev.preventInsights;
      if (prevG === next.getable && prevP === next.preventInsights
          && (silence ? prevP === true : prevP === false && prevG === true)) {
        continue;
      }
      // Complementary: keep titles/units/insightsTitle*
      opts[cap] = next;
      changed = true;
      capsSet += 1;
      if (silence) silenced += 1;
      if (samples.length < 30) {
        samples.push(`${id}:${cap}:getable=${next.getable}:preventInsights=${next.preventInsights}`);
      }
    }

    if (changed) {
      j.capabilitiesOptions = opts;
      touched += 1;
      if (APPLY) {
        fs.writeFileSync(composePath, `${JSON.stringify(j, null, 2)}\n`);
      }
    }
  }

  const summary = {
    mode: APPLY ? 'APPLY' : 'DRY-RUN',
    driversTouched: touched,
    capsSet,
    silenced,
    samples,
  };
  const outDir = path.join(ROOT, 'reports', 'history-fleet-p2553');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, APPLY ? 'APPLY.json' : 'DRY.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (DRY) {
    console.log('\nRe-run with --apply to write compose files.');
  }
}

main();
