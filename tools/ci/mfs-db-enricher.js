#!/usr/bin/env node
/**
 * mfs-db-enricher.js
 *
 * Enriches data/mfs_db.json with new mfrs from Johan/forum/canonical integration.
 *
 * Strategy:
 *   1. Load current mfs_db (devices + driverMapping)
 *   2. Load integration proposals (from bidirectional-enrichment-report)
 *   3. For each new mfr, add to devices object + driverMapping
 *   4. Update stats
 *   5. Save (with backup)
 *
 * @author Mavis continuous flow 2026-07-12
 * @version 1.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MFS_DB = path.join(ROOT, 'data', 'mfs_db.json');
const INTEGRATION_REPORT = path.join(ROOT, '.github', 'state', 'bidirectional-enrichment-report.json');
const FORUM_REPORT = path.join(ROOT, '.github', 'state', 'forum-integration-report.json');
const CANONICAL_DB = path.join(ROOT, 'lib', 'tuya', 'fingerprints.json');
const BACKUP = MFS_DB + '.bak.' + Date.now();
const REPORT = path.join(ROOT, '.github', 'state', 'mfs-enrichment-report.json');

function loadMfrs() {
  const mfrs = new Set();
  // From integration report
  if (fs.existsSync(INTEGRATION_REPORT)) {
    const r = JSON.parse(fs.readFileSync(INTEGRATION_REPORT, 'utf8'));
    for (const p of r.proposals || []) {
      if (p.proposedDriver && p.proposedDriver !== 'generic_tuya') {
        mfrs.add(p.mfr);
      }
    }
  }
  // From forum report
  if (fs.existsSync(FORUM_REPORT)) {
    const f = JSON.parse(fs.readFileSync(FORUM_REPORT, 'utf8'));
    for (const p of f.proposals || []) {
      mfrs.add(p.mfr);
    }
  }
  return [...mfrs];
}

function inferDeviceType(mfr) {
  // Heuristic based on mfr prefix and name patterns
  if (mfr.startsWith('_TZE20')) return 'sensor';
  if (mfr.startsWith('_TZE28')) return 'sensor';
  if (mfr.startsWith('_TZ3000')) return 'switch';
  if (mfr.startsWith('_TZ3210')) return 'switch';
  if (mfr.startsWith('_TYZB')) return 'switch';
  if (mfr.startsWith('_TYST')) return 'sensor';
  if (mfr.startsWith('_TZ3400')) return 'switch';
  if (mfr.startsWith('_TZ3290')) return 'sensor';
  return 'unknown';
}

function main() {
  console.log('MFS DB Enricher v1.0.0\n');

  // Backup
  fs.copyFileSync(MFS_DB, BACKUP);
  console.log('Backup:', path.basename(BACKUP));

  const mfs = JSON.parse(fs.readFileSync(MFS_DB, 'utf8'));
  const initialDevices = Object.keys(mfs.devices).length;
  const initialDriverMap = Object.keys(mfs.driverMapping).length;

  const newMfrs = loadMfrs();
  console.log('New mfrs to add:', newMfrs.length);

  // Add to devices
  let addedToDevices = 0;
  let updatedInDevices = 0;
  for (const m of newMfrs) {
    if (!mfs.devices[m]) {
      mfs.devices[m] = {
        manufacturerId: m,
        modelIds: [],
        variants: [],
        deviceType: inferDeviceType(m),
        driverHint: null,
        capabilities: [],
        powerSource: 'unknown',
        sources: ['integration-2026-07-12'],
        sourceDetails: { integration: 1 },
        confidence: 0.5,
        lastSeen: new Date().toISOString(),
      };
      addedToDevices++;
    } else {
      // Update lastSeen
      mfs.devices[m].lastSeen = new Date().toISOString();
      updatedInDevices++;
    }
  }

  // Update driverMapping
  let updatedDriverMaps = 0;
  // Need proposals to know which driver each mfr goes to
  if (fs.existsSync(INTEGRATION_REPORT)) {
    const r = JSON.parse(fs.readFileSync(INTEGRATION_REPORT, 'utf8'));
    for (const p of r.proposals || []) {
      if (!p.proposedDriver || p.proposedDriver === 'generic_tuya') continue;
      if (!mfs.driverMapping[p.proposedDriver]) {
        mfs.driverMapping[p.proposedDriver] = {
          manufacturerIds: [],
          modelIds: [],
          deviceType: 'unknown',
        };
      }
      const dm = mfs.driverMapping[p.proposedDriver];
      if (!dm.manufacturerIds.includes(p.mfr)) {
        dm.manufacturerIds.push(p.mfr);
        updatedDriverMaps++;
      }
    }
  }

  // Update stats
  mfs.stats = mfs.stats || {};
  mfs.stats.totalEntries = Object.keys(mfs.devices).length;
  mfs.stats.lastEnrichment = new Date().toISOString();
  mfs.stats.entriesBySource = mfs.stats.entriesBySource || {};
  mfs.stats.entriesBySource.integration = (mfs.stats.entriesBySource.integration || 0) + addedToDevices;

  // Update _meta
  mfs._meta = mfs._meta || {};
  mfs._meta.lastUpdated = new Date().toISOString();
  mfs._meta.lastEnrichment = {
    date: new Date().toISOString(),
    addedToDevices,
    updatedInDevices,
    updatedDriverMaps,
    source: 'continuous-flow',
  };

  // Save
  fs.writeFileSync(MFS_DB, JSON.stringify(mfs, null, 2), 'utf8');
  console.log('\n=== RESULTS ===');
  console.log('Devices added:', addedToDevices);
  console.log('Devices updated:', updatedInDevices);
  console.log('Driver mappings updated:', updatedDriverMaps);
  console.log('Total devices:', Object.keys(mfs.devices).length, '(was', initialDevices + ')');
  console.log('Total driver mappings:', Object.keys(mfs.driverMapping).length, '(was', initialDriverMap + ')');
  console.log('File size:', (fs.statSync(MFS_DB).length / 1024).toFixed(1), 'KB');

  // Save report
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify({
    timestamp: new Date().toISOString(),
    backup: path.basename(BACKUP),
    summary: {
      addedToDevices,
      updatedInDevices,
      updatedDriverMaps,
      totalDevices: Object.keys(mfs.devices).length,
      totalDriverMappings: Object.keys(mfs.driverMapping).length,
    },
  }, null, 2));
  console.log('\n✓ Report:', REPORT);
}

if (require.main === module) main();
