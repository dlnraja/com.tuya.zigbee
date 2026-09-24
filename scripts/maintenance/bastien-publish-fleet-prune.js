'use strict';

/**
 * P2724 — Bastien house-fleet prune for Athom publish
 * WHY: full 400+ driver Bastien uploads → processing_failed (socket hang up)
 * on builds #104/#105 while Test stays stuck on 1.0.93. House mesh only needs
 * remotes + HOBEIAN switches + climate + a small buffer.
 *
 * Only runs when app.json id === com.dlnraja.tuya.zigbee.bastien.
 * Mutates publish-temp app.json (+ optional driver dirs). Never touches Universal/Stable.
 */

const fs = require('fs');
const path = require('path');

const APP_ID = 'com.dlnraja.tuya.zigbee.bastien';
const SSOT = path.join(__dirname, '..', '..', 'config', 'architecture', 'bastien-publish-fleet-ssot.json');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadKeepSet() {
  const ssot = readJson(SSOT);
  const keep = new Set(ssot.keepDriverIds || []);
  const prefixes = Array.isArray(ssot.alwaysKeepPrefixes) ? ssot.alwaysKeepPrefixes : [];
  return { keep, prefixes, ssot };
}

function shouldKeep(id, keep, prefixes) {
  if (!id) return false;
  if (keep.has(id)) return true;
  return prefixes.some((p) => id.startsWith(p));
}

/**
 * @param {string} destAppJson path to publish-temp app.json
 * @param {{ destDir?: string }} [opts]
 * @returns {{ before: number, after: number, removed: string[] }}
 */
function pruneBastienPublishFleet(destAppJson, opts = {}) {
  if (!fs.existsSync(destAppJson)) {
    throw new Error(`P2724: missing ${destAppJson}`);
  }
  const manifest = readJson(destAppJson);
  if (manifest.id !== APP_ID) {
    return { before: (manifest.drivers || []).length, after: (manifest.drivers || []).length, removed: [], skipped: true };
  }
  const { keep, prefixes } = loadKeepSet();
  const before = (manifest.drivers || []).length;
  const removed = [];
  const keptDrivers = [];
  for (const d of manifest.drivers || []) {
    if (shouldKeep(d.id, keep, prefixes)) {
      keptDrivers.push(d);
    } else {
      removed.push(d.id);
    }
  }
  if (keptDrivers.length < 8) {
    throw new Error(`P2724: refuse prune — only ${keptDrivers.length} drivers would remain (need ≥8)`);
  }
  manifest.drivers = keptDrivers;

  // WHY(P2724 / Athom #106 invalid_state): keep ONLY flow cards for kept drivers.
  // Soft "return true" left 1500+ orphan fleet triggers → Athom processor invalid_state.
  for (const section of ['triggers', 'conditions', 'actions']) {
    const cards = manifest.flow && manifest.flow[section];
    if (!Array.isArray(cards)) continue;
    manifest.flow[section] = cards.filter((c) => {
      const id = String(c.id || '');
      return keptDrivers.some((d) => id === d.id || id.startsWith(`${d.id}_`));
    });
  }

  fs.writeFileSync(destAppJson, JSON.stringify(manifest));

  // Optionally delete pruned driver folders from publish tree (icons/assets weight)
  if (opts.destDir) {
    const driversDir = path.join(opts.destDir, 'drivers');
    if (fs.existsSync(driversDir)) {
      for (const rid of removed) {
        const p = path.join(driversDir, rid);
        if (fs.existsSync(p)) {
          fs.rmSync(p, { recursive: true, force: true });
        }
      }
    }
  }

  return { before, after: keptDrivers.length, removed, skipped: false };
}

module.exports = { pruneBastienPublishFleet, APP_ID, SSOT };

if (require.main === module) {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node bastien-publish-fleet-prune.js <path/to/app.json> [destDir]');
    process.exit(2);
  }
  const r = pruneBastienPublishFleet(target, { destDir: process.argv[3] });
  console.log(JSON.stringify(r, null, 2));
}
