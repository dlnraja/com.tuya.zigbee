#!/usr/bin/env node
'use strict';

/**
 * sync-dp-couple-knowledge.js (P2247)
 *
 * Seed / merge `data/dp_couple_knowledge.json` from:
 *   - user-misattribution-registry sacred couples
 *   - driver device.js dpMappings
 *   - Z2M `data/dp_registry.json` filtered by model when known
 *
 * Never invent productIds. Never overwrite locked RAW/blockDcm entries.
 *
 * Usage:
 *   node tools/ci/sync-dp-couple-knowledge.js           # dry-run
 *   node tools/ci/sync-dp-couple-knowledge.js --apply
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const KNOWLEDGE = path.join(ROOT, 'data', 'dp_couple_knowledge.json');
const REGISTRY = path.join(ROOT, 'data', 'user-misattribution-registry.json');
const DP_REG = path.join(ROOT, 'data', 'dp_registry.json');
const APPLY = process.argv.includes('--apply');

// Presence / radar DP names must not land on soil / climate / meter / wall-switch drivers
const FAMILY_BLOCK = {
  soil: /presence|radar|motion_state|fading_time|detection_range|sensitivity|large_motion|mov_minimum|medium_motion/i,
  soil_sensor: /presence|radar|motion_state|fading_time|detection_range|sensitivity|large_motion|mov_minimum|medium_motion/i,
  climate: /presence|radar|leakage_current|control_mode/i,
  climate_sensor: /presence|radar|leakage_current/i,
  din_rail_meter: /presence|humidity|moisture/i,
  smart_rcbo: /presence|humidity|moisture/i,
  wall_dimmer_tuya: /presence|humidity|energy|leakage/i,
  switch_2gang: /presence|radar|motion_state|fading_time|detection_range|sensitivity|large_motion|mov_minimum/i,
  switch_1gang: /presence|radar|motion_state|fading_time|detection_range/i,
  presence_sensor_radar: /moisture|soil|leakage_current/i,
};

function loadJson(fp) {
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function coupleKey(mfr, pid) {
  return `${String(mfr).trim()}|${String(pid || '').trim().toUpperCase()}`;
}

function extractDpMappingsFromDevice(driverId) {
  const fp = path.join(ROOT, 'drivers', driverId, 'device.js');
  if (!fs.existsSync(fp)) return new Map();
  const src = fs.readFileSync(fp, 'utf8');
  const dps = new Map();
  const blockRe = /(?:get\s+dpMappings|_tongouDpMappings|dpMappings\s*=\s*\{)([\s\S]*?\n\s*\})/g;
  let bm;
  while ((bm = blockRe.exec(src))) {
    const block = bm[1];
    const lineRe = /^\s*(\d+)\s*:\s*\{([^}]+)\}/gm;
    let lm;
    while ((lm = lineRe.exec(block))) {
      const dpId = parseInt(lm[1], 10);
      const body = lm[2];
      const capMatch = body.match(/capability:\s*['"]([^'"]+)['"]|capability:\s*(null)/);
      const cap = capMatch ? (capMatch[1] || null) : undefined;
      const internal = (body.match(/internal:\s*['"]([^'"]+)['"]/) || [])[1] || null;
      dps.set(dpId, {
        capability: cap === 'null' || cap === undefined ? (cap === 'null' ? null : undefined) : cap,
        internal,
      });
    }
  }
  return dps;
}

function z2mRowsForMfr(dpReg, mfr, modelHint) {
  const rows = dpReg?.byMfr?.[mfr] || dpReg?.byMfr?.[mfr.toLowerCase()] || [];
  if (!modelHint) return rows;
  const filtered = rows.filter((r) => String(r.model || '').toLowerCase() === String(modelHint).toLowerCase());
  return filtered.length ? filtered : rows;
}

function blockedForDriver(driver, z2mName) {
  const re = FAMILY_BLOCK[driver];
  if (!re || !z2mName) return false;
  return re.test(z2mName);
}

function main() {
  const knowledge = loadJson(KNOWLEDGE);
  const registry = loadJson(REGISTRY);
  const dpReg = loadJson(DP_REG);
  knowledge.couples = knowledge.couples || {};

  let addedCouples = 0;
  let addedDps = 0;
  const notes = [];

  for (const caseRow of registry.cases || []) {
    const driver = caseRow.canonicalDriver;
    if (!driver) continue;
    const mfrs = [].concat(caseRow.mfr || []).filter(Boolean);
    const pids = [].concat(caseRow.productId || []).filter(Boolean);
    if (!mfrs.length || !pids.length) continue;

    // Prefer Tuya-shaped mfr + TS* pid (never seed brand-only as primary couple)
    const mfr = mfrs.find((m) => /^_t[yz]/i.test(m)) || mfrs[0];
    const pid = pids.find((p) => /^TS/i.test(p)) || pids[0];
    if (!/^_t[yz]/i.test(mfr)) {
      notes.push(`skip brand-only couple seed ${mfr}|${pid}`);
      continue;
    }

    const driverDps = extractDpMappingsFromDevice(driver);
    const modelHint = caseRow.model || pids.find((p) => /^ZG-/i.test(p)) || null;

    const key = coupleKey(mfr, pid);
    const existing = knowledge.couples[key];
    if (!existing) {
      knowledge.couples[key] = {
        caseId: caseRow.id,
        driver,
        model: modelHint || undefined,
        sources: ['registry', 'auto-seed-p2247'],
        seed: 'auto',
        dps: {},
      };
      addedCouples++;
      notes.push(`+ couple ${key} → ${driver}`);
    }
    const entry = knowledge.couples[key];
    entry.dps = entry.dps || {};

    // Merge driver mappings
    for (const [dpId, map] of driverDps) {
      const sid = String(dpId);
      if (entry.dps[sid]?.profile || entry.dps[sid]?.blockDcm) continue;
      if (!entry.dps[sid]) {
        entry.dps[sid] = {
          name: map.internal || map.capability || `dp_${dpId}`,
          direction: 'rx',
          capability: map.capability === undefined ? null : map.capability,
          internal: map.internal || undefined,
          source: 'driver-dpMappings',
        };
        addedDps++;
      }
    }

    // Soft-merge Z2M names (never invent capability) — filter by model when known
    for (const row of z2mRowsForMfr(dpReg, mfr, modelHint)) {
      if (blockedForDriver(driver, row.name)) continue;
      const sid = String(row.dpId);
      if (!entry.dps[sid]) {
        entry.dps[sid] = {
          name: row.name,
          direction: 'rx',
          capability: null,
          source: 'z2m-soft',
          notes: 'Soft seed — verify before binding capability',
        };
        addedDps++;
      } else if (!entry.dps[sid].name || entry.dps[sid].name.startsWith('dp_')) {
        entry.dps[sid].name = row.name;
      }
    }
  }

  // Drop brand-only auto-seeds (HOBEIAN|ZG-*) that pulled wrong Z2M families
  for (const key of Object.keys(knowledge.couples)) {
    const [mfrPart] = key.split('|');
    const entry = knowledge.couples[key];
    if (entry.seed === 'auto' && !/^_t[yz]/i.test(mfrPart)) {
      delete knowledge.couples[key];
      notes.push(`removed brand-only seed ${key}`);
    }
  }

  knowledge._meta = knowledge._meta || {};
  knowledge._meta.updated = new Date().toISOString().slice(0, 10);
  knowledge._meta.lastSync = new Date().toISOString();
  knowledge._meta.coupleCount = Object.keys(knowledge.couples).length;

  // Cleanup: drop soft Z2M seeds that violate driver family (cross-OEM pollution)
  let pruned = 0;
  for (const [key, entry] of Object.entries(knowledge.couples)) {
    const driver = entry.driver;
    if (!entry.dps) continue;
    for (const [dpId, dp] of Object.entries(entry.dps)) {
      if (dp.profile || dp.blockDcm || dp.tuyaType === 0) continue;
      if (dp.source !== 'z2m-soft' && dp.source !== 'auto-seed-p2247') continue;
      if (blockedForDriver(driver, dp.name)) {
        delete entry.dps[dpId];
        pruned++;
      }
    }
  }
  if (pruned) notes.push(`pruned ${pruned} family-mismatched soft DPs`);

  console.log(JSON.stringify({
    apply: APPLY,
    couples: knowledge._meta.coupleCount,
    addedCouples,
    addedDps,
    pruned,
    sampleNotes: notes.slice(0, 12),
  }, null, 2));

  if (APPLY) {
    fs.writeFileSync(KNOWLEDGE, `${JSON.stringify(knowledge, null, 2)}\n`);
    console.log('Wrote', KNOWLEDGE);
  } else {
    console.log('(dry-run — pass --apply to write)');
  }
}

main();
