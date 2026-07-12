#!/usr/bin/env node
/**
 * johan-enrichment.js — cross-reference Johan dump with our drivers + mfs_db
 *
 * NO writes to Johan. Writes ONLY to our local mfs_db.json + drivers.
 *
 * For each device mentioned in Johan:
 *   1. Find the right driver (via canonical DB + PID heuristics)
 *   2. Check if the mfr is already in the driver
 *   3. If not, propose to add it (DRY-RUN by default)
 *   4. Update mfs_db.devices + mfs_db.driverMapping
 *
 * Output:
 *   - .github/state/johan-enrichment-proposals.json
 *   - .github/state/johan-enrichment-report.md
 *
 * Usage:
 *   node tools/ci/johan-enrichment.js                  # DRY-RUN
 *   node tools/ci/johan-enrichment.js --apply         # actually update mfs_db
 *
 * @author Mavis P12 — autonomous enrichment
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DUMP_DIR = path.join(ROOT, '.github', 'state', 'johan-dump');
const MFS_DB = path.join(ROOT, 'data', 'mfs_db.json');
const CANONICAL = path.join(ROOT, 'lib', 'tuya', 'fingerprints.json');
const PROPOSALS = path.join(ROOT, '.github', 'state', 'johan-enrichment-proposals.json');
const REPORT = path.join(ROOT, '.github', 'state', 'johan-enrichment-report.md');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');

const PID_TO_DRIVER = {
  TS0201: 'climate_sensor', TS0202: 'motion_sensor', TS0203: 'door_sensor',
  TS0204: 'motion_sensor', TS0205: 'smoke_detector_advanced', TS0207: 'water_leak_sensor',
  TS0210: 'vibration_sensor', TS0222: 'climate_sensor', TS0601: 'generic_tuya',
  TS0001: 'switch_1gang', TS0002: 'switch_2gang', TS0003: 'switch_3gang', TS0004: 'switch_4gang',
  TS0011: 'switch_1gang', TS0012: 'switch_1gang', TS0013: 'switch_3gang', TS0014: 'switch_1gang',
  TS0016: 'switch_3gang', TS0017: 'switch_4gang', TS0018: 'switch_6gang',
  TS0041: 'button_wireless_1', TS0042: 'button_wireless_2', TS0043: 'button_wireless_3',
  TS0044: 'button_wireless_4', TS0045: 'button_wireless_5', TS0046: 'button_wireless_6',
  TS004F: 'button_wireless_scene',
  TS011F: 'plug', TS0121: 'plug', TS1101: 'plug_energy_monitor',
  TS0501B: 'bulb_dimmable', TS0502B: 'bulb_tunable_white', TS0503B: 'bulb_rgb',
  TS0504B: 'bulb_rgbw', TS0505B: 'bulb_rgbw',
  TS110E: 'dimmer_1_gang', TS110F: 'dimmer_2_gang_tuya', TS130F: 'curtain_motor',
  TS1002: 'smart_irrigation_valve',
};

function loadJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function inferDriver(mfr, fp) {
  if (fp[mfr]?.driverId) return { driver: fp[mfr].driverId, reason: 'canonical' };
  return { driver: 'generic_tuya', reason: 'fallback' };
}

function main() {
  console.log('Johan Enrichment v1.0.0\n');
  console.log('Mode:', APPLY ? 'APPLY' : 'DRY-RUN (default)');
  console.log('');

  // Check dumps exist
  const devicesFile = path.join(DUMP_DIR, 'devices.json');
  if (!fs.existsSync(devicesFile)) {
    console.error('ERROR: ' + devicesFile + ' not found.');
    console.error('Run: node tools/ci/johan-dump.js first.');
    process.exit(1);
  }

  const devices = loadJSON(devicesFile);
  const canonical = loadJSON(CANONICAL);
  const mfs = loadJSON(MFS_DB);

  console.log('Loaded ' + devices.length + ' devices from dump');
  console.log('Loaded ' + Object.keys(canonical).length + ' FPs from canonical');
  console.log('Loaded ' + Object.keys(mfs.devices).length + ' devices from mfs_db');
  console.log('');

  // For each device, infer driver
  const proposals = [];
  let totalMfrs = 0;
  let totalNew = 0;
  for (const d of devices) {
    if (!d.mfrs || d.mfrs.length === 0) continue;
    totalMfrs += d.mfrs.length;
    for (const mfr of d.mfrs) {
      // Check canonical
      const existsInCanonical = !!canonical[mfr];
      if (existsInCanonical) continue; // already known

      // Infer driver from PIDs
      let driver = 'generic_tuya';
      let reason = 'fallback';
      if (d.pids && d.pids.length) {
        for (const p of d.pids) {
          if (PID_TO_DRIVER[p]) {
            driver = PID_TO_DRIVER[p];
            reason = 'pid-' + p;
            break;
          }
        }
      }

      // Check if already in mfs_db.devices
      const inMfs = !!mfs.devices[mfr];
      if (inMfs) continue;

      proposals.push({
        mfr,
        proposedDriver: driver,
        reason,
        sourceIssue: d.issue,
        issueTitle: d.title,
        pids: d.pids,
      });
      totalNew++;
    }
  }

  console.log('=== ANALYSIS ===');
  console.log('Total mfrs in Johan dump: ' + totalMfrs);
  console.log('Already in canonical: ' + (totalMfrs - totalNew - (proposals.length - totalNew)));
  console.log('New (to add): ' + totalNew);
  console.log('');

  // Group by proposed driver
  const byDriver = {};
  for (const p of proposals) {
    byDriver[p.proposedDriver] = (byDriver[p.proposedDriver] || 0) + 1;
  }
  console.log('=== PROPOSALS BY DRIVER ===');
  for (const [d, c] of Object.entries(byDriver).sort((a, b) => b[1] - a[1])) {
    console.log('  ' + d + ': ' + c);
  }
  console.log('');

  // Save proposals
  fs.writeFileSync(PROPOSALS, JSON.stringify({
    timestamp: new Date().toISOString(),
    source: 'johan-dump',
    mode: APPLY ? 'apply' : 'dry-run',
    summary: {
      totalMfrs,
      newMfrs: totalNew,
      byDriver,
    },
    proposals,
  }, null, 2));
  console.log('✓ Proposals:', PROPOSALS);

  // Apply if requested
  if (APPLY && proposals.length > 0) {
    console.log('\n=== APPLYING ===');
    let applied = 0;
    for (const p of proposals) {
      // Add to mfs_db.devices
      if (!mfs.devices[p.mfr]) {
        mfs.devices[p.mfr] = {
          manufacturerId: p.mfr,
          modelIds: p.pids || [],
          variants: [],
          deviceType: 'unknown',
          driverHint: p.proposedDriver,
          capabilities: [],
          powerSource: 'unknown',
          sources: ['johan-enrichment'],
          sourceDetails: { 'johan-enrichment': 1 },
          confidence: 0.6,
          lastSeen: new Date().toISOString(),
        };
        // Add to driverMapping
        if (!mfs.driverMapping[p.proposedDriver]) {
          mfs.driverMapping[p.proposedDriver] = {
            manufacturerIds: [],
            modelIds: [],
            deviceType: 'unknown',
          };
        }
        if (!mfs.driverMapping[p.proposedDriver].manufacturerIds.includes(p.mfr)) {
          mfs.driverMapping[p.proposedDriver].manufacturerIds.push(p.mfr);
        }
        applied++;
      }
    }
    // Update stats
    mfs.stats = mfs.stats || {};
    mfs.stats.totalEntries = Object.keys(mfs.devices).length;
    mfs.stats.lastEnrichment = new Date().toISOString();
    mfs._meta = mfs._meta || {};
    mfs._meta.lastUpdated = new Date().toISOString();

    fs.writeFileSync(MFS_DB, JSON.stringify(mfs, null, 2));
    console.log('✓ Applied ' + applied + ' mfrs to ' + MFS_DB);
  } else if (proposals.length > 0) {
    console.log('\nTo apply these proposals, run:');
    console.log('  node tools/ci/johan-enrichment.js --apply');
  }

  // Save markdown report
  const md = [
    '# Johan Enrichment Report',
    '**Date**: ' + new Date().toISOString(),
    '**Mode**: ' + (APPLY ? 'APPLY' : 'DRY-RUN'),
    '',
    '## Summary',
    '- Mfrs in Johan dump: ' + totalMfrs,
    '- New (not in canonical): ' + totalNew,
    '- Already in mfs_db: ' + (totalMfrs - totalNew),
    '',
    '## By driver',
    '| Driver | Count |',
    '| --- | --- |',
    ...Object.entries(byDriver).sort((a, b) => b[1] - a[1]).map(([d, c]) => '| ' + d + ' | ' + c + ' |'),
    '',
    '## First 20 proposals',
    '| Mfr | Driver | Reason | Source issue |',
    '| --- | --- | --- | --- |',
    ...proposals.slice(0, 20).map(p => '| `' + p.mfr + '` | ' + p.proposedDriver + ' | ' + p.reason + ' | #' + p.sourceIssue + ' |'),
    '',
    proposals.length > 20 ? '\n... and ' + (proposals.length - 20) + ' more\n' : '',
  ].join('\n');
  fs.writeFileSync(REPORT, md);
  console.log('✓ Report:', REPORT);
}

if (require.main === module) main();
