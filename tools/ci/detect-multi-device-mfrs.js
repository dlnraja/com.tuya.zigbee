#!/usr/bin/env node
/**
 * detect-multi-device-mfrs.js
 *
 * For each of the 96 newly-integrated mfrs, detect if it could/should
 * be in MULTIPLE drivers (one mfr → multiple devices is valid per the
 * user's note "le mfrs peut avoir plusieurs devices et variants").
 *
 * Heuristics:
 *   1. TS0601 mfrs (Tuya generic) → already in generic_tuya, but may also
 *      be in climate_sensor, soil_sensor, air_purifier, etc.
 *   2. TS011F mfrs (smart plug) → in plug, but may also be in plug_smart
 *   3. mfr in `generic_tuya` only → check if it has specific capabilities
 *      that would match a more specific driver
 *
 * Output: a report with suggestions. NO auto-modification (needs human review).
 *
 * @author Mavis investigation 2026-07-12
 * @version 1.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PLAN_FILE = path.join(ROOT, '.github', 'state', 'new-mfrs-from-johan.json');
const CANONICAL = path.join(ROOT, 'lib', 'tuya', 'fingerprints.json');
const DRIVERS = path.join(ROOT, 'drivers');
const REPORT = path.join(ROOT, '.github', 'state', 'multi-device-detection.json');

// Map of mfrs that might need multi-device routing
const TS0601_MFR_PREFIXES = ['_TZE200_', '_TZE204_', '_TZE284_', '_TZ3000_', '_TYZB01_', '_TYST11_'];

const TS0601_SUBDRIVERS = {
  climate_sensor: ['T', 'H'], // temperature, humidity
  soil_sensor: ['soil', 'earth'],
  air_purifier: ['PM2.5', 'pm25'],
  valve_irrigation: ['valve', 'irrigation', 'water'],
  thermometer: ['temp'],
  hygrometer: ['humi'],
};

function loadJSON(f) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; }
}

function getDriverCapabilities(driverId) {
  const composePath = path.join(DRIVERS, driverId, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return [];
  try {
    const j = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    return j.capabilities || [];
  } catch { return []; }
}

function detectMultiDevice(plan, canonical) {
  const suggestions = [];

  for (const item of plan) {
    const { mfr, driver: primaryDriver, pids } = item;
    if (!pids.includes('TS0601') && !pids.includes('TS0201') && !pids.includes('TS011F')) {
      // Skip non-generic PIDs
      continue;
    }

    // Find which other drivers could also accept this mfr
    const candidates = [];
    if (pids.includes('TS0601') && primaryDriver !== 'generic_tuya') {
      candidates.push('generic_tuya (catch-all)');
    }
    if (pids.includes('TS0201')) {
      // Temperature/humidity sensor — could be climate_sensor or temphumidsensor*
      const c1 = getDriverCapabilities('climate_sensor');
      if (c1.includes('measure_temperature') && c1.includes('measure_humidity')) {
        candidates.push('climate_sensor (has temp+humi caps)');
      }
    }
    if (pids.includes('TS011F')) {
      // Smart plug — could be in plug, plug_smart, plug_energy_monitor
      if (primaryDriver === 'plug' || primaryDriver === 'plug_smart') {
        candidates.push('plug_energy_monitor (if has metering)');
      }
    }

    if (candidates.length > 0) {
      suggestions.push({
        mfr,
        primaryDriver,
        pids,
        candidatesForMultiDevice: candidates,
        issues: item.issues,
      });
    }
  }

  return suggestions;
}

function main() {
  console.log('Multi-device detection for new mfrs\n');

  const plan = loadJSON(PLAN_FILE);
  const canonical = loadJSON(CANONICAL);
  if (!plan || !canonical) {
    console.error('Missing plan or canonical file');
    process.exit(1);
  }

  const suggestions = detectMultiDevice(plan.integrationPlan || [], canonical);
  console.log(`Mfrs with multi-device potential: ${suggestions.length}`);

  // Group by primary driver
  const byDriver = {};
  for (const s of suggestions) {
    if (!byDriver[s.primaryDriver]) byDriver[s.primaryDriver] = [];
    byDriver[s.primaryDriver].push(s);
  }
  console.log('');
  for (const [d, items] of Object.entries(byDriver).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${d}: ${items.length} mfrs`);
  }
  console.log('');

  // Top 10 samples
  console.log('Top 10 multi-device candidates:');
  for (const s of suggestions.slice(0, 10)) {
    console.log(`  ${s.mfr}`);
    console.log(`    primary: ${s.primaryDriver}, pids: ${s.pids.join(', ')}`);
    console.log(`    → could also be: ${s.candidatesForMultiDevice.join(', ')}`);
  }
  console.log('');

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalPlan: (plan.integrationPlan || []).length,
      withMultiDevicePotential: suggestions.length,
      byDriver,
    },
    suggestions,
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2), 'utf8');
  console.log(`✓ Report: ${REPORT} (${(fs.statSync(REPORT).length / 1024).toFixed(1)} KB)`);
}

if (require.main === module) main();

module.exports = { detectMultiDevice };
