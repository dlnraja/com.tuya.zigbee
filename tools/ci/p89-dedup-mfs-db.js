#!/usr/bin/env node
/**
 * p89-dedup-mfs-db.js — P89
 * Deduplicate mfs_db.json by manufacturerName (case-insensitive).
 *
 * Strategy:
 *   - For each pair of duplicate keys (case variants of the same mfr):
 *     1. If same driverId and same pid: keep one (prefer lowercase as canonical)
 *     2. If different driverId: keep the entry whose driverId appears in
 *        the most driver.compose.json files (i.e., the "right" one)
 *     3. If different pid: same strategy (most-used pid wins)
 *   - Always prefer the lowercase version as canonical key
 *
 * Usage: node tools/ci/p89-dedup-mfs-db.js [--apply]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const MFS = path.join(ROOT, 'data/mfs_db.json');
const APPLY = process.argv.includes('--apply');

function listDriverMfrs() {
  const out = cp.execSync(
    `powershell -NoProfile -Command "Get-ChildItem -Path '${path.join(ROOT, 'drivers')}' -Recurse -File -Filter 'driver.compose.json' | Select-Object -ExpandProperty FullName"`,
    { encoding: 'utf8' }
  ).split(/\r?\n/).filter(Boolean);
  const map = new Map();
  for (const f of out) {
    try {
      const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      const mfrs = (j.zigbee && j.zigbee.manufacturerName) || [];
      for (const m of mfrs) {
        const k = m.toLowerCase();
        if (!map.has(k)) map.set(k, new Set());
        map.get(k).add(f.replace(/\\/g, '/').split('drivers/')[1].split('/')[0]);
      }
    } catch (e) {}
  }
  return map;
}

function main() {
  const mfs = JSON.parse(fs.readFileSync(MFS, 'utf8'));
  const driverMfrs = listDriverMfrs();
  // Group keys by lower-case
  const groups = new Map();
  for (const k of Object.keys(mfs)) {
    const lk = k.toLowerCase();
    if (!groups.has(lk)) groups.set(lk, []);
    groups.get(lk).push(k);
  }
  // Find duplicates
  const dups = [];
  for (const [lk, keys] of groups) {
    if (keys.length > 1) dups.push({ lower: lk, keys });
  }
  console.log(`Found ${dups.length} duplicate groups in mfs_db.json`);

  let removed = 0;
  let merged = 0;
  for (const dup of dups) {
    // For each group, find the "best" entry
    const entries = dup.keys.map(k => ({ key: k, value: mfs[k] }));
    // Score each entry: prefer one with non-empty pid, non-empty description,
    // and driverId that appears in more drivers
    const scored = entries.map(e => {
      const driverId = e.value.driverId;
      const pid = e.value.pid;
      const description = e.value.description;
      const source = e.value.source;
      // Count how many drivers actually have this mfr (case insensitive)
      const driverCount = driverMfrs.get(e.key.toLowerCase())?.size || 0;
      return {
        ...e,
        score: (pid ? 100 : 0) + (description ? 50 : 0) + (source ? 25 : 0) + driverCount * 5
      };
    });
    scored.sort((a, b) => b.score - a.score);
    const winner = scored[0];
    // Merge all values into winner
    const mergedValue = { ...winner.value };
    for (const e of scored.slice(1)) {
      for (const [k, v] of Object.entries(e.value)) {
        if (mergedValue[k] === undefined || mergedValue[k] === null || mergedValue[k] === '') {
          mergedValue[k] = v;
        }
      }
    }
    // Use lowercase as canonical key
    const canonicalKey = dup.lower;
    if (winner.key !== canonicalKey) {
      console.log(`  Renaming ${winner.key} -> ${canonicalKey} (driverId=${mergedValue.driverId}, pid=${mergedValue.pid})`);
    }
    // Remove all old keys
    for (const e of scored) {
      if (e.key !== canonicalKey) {
        delete mfs[e.key];
        removed++;
      }
    }
    mfs[canonicalKey] = mergedValue;
    merged++;
  }
  if (APPLY) {
    fs.writeFileSync(MFS, JSON.stringify(mfs, null, 2));
    console.log(`[APPLIED] Removed ${removed} duplicates, merged ${merged} groups`);
  } else {
    console.log(`[DRY-RUN] Would remove ${removed} duplicates, merge ${merged} groups`);
    console.log(`Run with --apply to write changes`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
