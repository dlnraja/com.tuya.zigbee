/**
 * sources/local-fingerprints.js
 *
 * Cross-references the canonical fingerprint DBs to find:
 *   - Orphan fingerprints (mfrs not in any driver)
 *   - Mfrs in multiple drivers (collision candidates)
 *   - New FPs in herdsman cache not yet in canonical DB
 *   - TS0601 variants that need classification
 *
 * Each finding is a "ticket" to investigate.
 *
 * App cible: BOTH master + stable.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const CANONICAL_FPS = path.resolve(__dirname, '..', '..', 'data', 'fingerprints.json');
const MFR_DRIVER_MAP = path.resolve(__dirname, '..', '..', 'driver-mapping-database.json');
const HERDSMAN_CACHE = path.resolve(__dirname, '..', '..', '.github', 'cache', 'z2m', 'tuya.ts');

function pullFromFingerprints(root) {
  const tickets = [];

  // 1. Compare canonical FP DB vs mfr→driver map
  if (fs.existsSync(CANONICAL_FPS) && fs.existsSync(MFR_DRIVER_MAP)) {
    const fps = JSON.parse(fs.readFileSync(CANONICAL_FPS, 'utf8'));
    const mfrMap = JSON.parse(fs.readFileSync(MFR_DRIVER_MAP, 'utf8'));

    let orphanCount = 0;
    let collisionCount = 0;
    for (const [fp, info] of Object.entries(fps || {})) {
      if (!info || !info.driverId) {
        orphanCount++;
        if (orphanCount <= 5) {
          tickets.push({
            id: `fp-orphan-${fp}`,
            source: 'local-fingerprints',
            title: `Orphan fingerprint: ${fp} (no driverId)`,
            body: `FP ${fp} exists in canonical DB but has no driverId. Add to correct driver.`,
            mfr: fp,
            deviceIds: info?.productIds || [],
            status: 'open',
          });
        }
      }
      // Collision: mfr in multiple drivers
      const drivers = info?.drivers || [info?.driverId].filter(Boolean);
      if (drivers && drivers.length > 1) {
        collisionCount++;
        if (collisionCount <= 5) {
          tickets.push({
            id: `fp-collision-${fp}`,
            source: 'local-fingerprints',
            title: `FP collision: ${fp} in ${drivers.length} drivers`,
            body: `FP ${fp} maps to ${drivers.length} drivers: ${drivers.join(', ')}. Use driver-mapping-database priority system.`,
            mfr: fp,
            deviceIds: info?.productIds || [],
            status: 'open',
          });
        }
      }
    }

    // Summarize orphans/collisions
    if (orphanCount > 5 || collisionCount > 5) {
      tickets.push({
        id: `fp-summary-${new Date().toISOString().split('T')[0]}`,
        source: 'local-fingerprints',
        title: `FP health summary: ${orphanCount} orphans, ${collisionCount} collisions`,
        body: `Run scripts/validation/check-fingerprint-health.js for full report. Total: ${Object.keys(fps).length} FPs.`,
        mfr: null,
        deviceIds: [],
        status: 'monitored',
      });
    }
  }

  // 2. Compare herdsman cache to canonical: any FPs in Z2M not in ours?
  if (fs.existsSync(HERDSMAN_CACHE)) {
    const herdsman = fs.readFileSync(HERDSMAN_CACHE, 'utf8');
    const newFps = (herdsman.match(/TS0601.*?_TZE[a-z0-9_]+/g) || []).slice(0, 5);
    for (const fp of newFps) {
      tickets.push({
        id: `herdsman-newfp-${fp}-${Date.now()}`,
        source: 'local-fingerprints',
        title: `New FP in Z2M: ${fp} (not yet in canonical)`,
        body: `Add to canonical fingerprints.json and run weekly-fingerprint-sync.yml.`,
        mfr: fp.match(/_TZE[0-9_a-z]+/)?.[0] || null,
        deviceIds: [fp.match(/TS\d+/)?.[0]].filter(Boolean),
        status: 'pending',
      });
    }
  }

  return tickets;
}

module.exports = { pullFromFingerprints };
