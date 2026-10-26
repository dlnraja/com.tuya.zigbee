#!/usr/bin/env node
'use strict';
/**
 * P3066: keep the TARGET branch's driver mapping when a cross-branch sync (P52 master → stable-v5)
 * overwrites lib/tuya/fingerprints.json or data/mfs_db.json.
 * WHY: twice (latest 6897a290f5, 2026-10-26) the sync copied master's row for a couple whose driver
 * differs on stable (_TZE284_la2c2uo9 → wall_dimmer_tuya on master, dimmer_1_gang_tuya on stable),
 * so the runtime DB pointed the couple at a driver that does not pair it → P3015 red.
 * Rule: for every row the sync changed or added, if the target branch's driver.compose.json files claim that
 * (manufacturer, productId) couple and the row points elsewhere, restore the target's previous row
 * (git HEAD); if it had none, retarget to the single composed owner, else drop the new row.
 * Usage: node sync-driver-mapping-guard.js [--check] [--base <git-ref>] [files...]   (cwd = target tree)
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DEFAULT_FILES = ['lib/tuya/fingerprints.json', 'data/mfs_db.json'];
const INVISIBLE = new Set([0xa0, 0x200b, 0x200c, 0x200d, 0x2060, 0xfeff]);
const norm = (s) => [...String(s || '')].filter((ch) => {
  const c = ch.codePointAt(0);
  return c > 0x1f && !INVISIBLE.has(c);
}).join('').trim().toLowerCase();

function composedOwners(root) {
  const owners = new Map();
  const dir = path.join(root, 'drivers');
  if (!fs.existsSync(dir)) { return owners; }
  for (const d of fs.readdirSync(dir)) {
    const f = path.join(dir, d, 'driver.compose.json');
    if (!fs.existsSync(f)) { continue; }
    let z;
    try { z = JSON.parse(fs.readFileSync(f, 'utf8')).zigbee || {}; } catch (_e) { continue; }
    for (const m of [].concat(z.manufacturerName || [])) {
      for (const p of [].concat(z.productId || [])) {
        const k = `${norm(m)}|${norm(p)}`;
        if (!owners.has(k)) { owners.set(k, new Set()); }
        owners.get(k).add(d);
      }
    }
  }
  return owners;
}

/** Driver set the target composes for this row, or null when the target does not pair it. */
function ownersFor(owners, key, row) {
  const out = new Set();
  for (const p of [].concat((row && row.modelIds) || [])) {
    for (const d of owners.get(`${norm(key)}|${norm(p)}`) || []) { out.add(d); }
  }
  return out.size ? out : null;
}

/** Fix for one changed row, or null when the row agrees with the target (or the target does not pair it). */
function resolveRow(k, row, prev, own) {
  if (prev && typeof prev === 'object' && own.has(prev.driverId)) {
    return { row: prev, fix: { key: k, from: row.driverId, to: prev.driverId, how: 'restored' } };
  }
  if (own.size === 1) {
    const to = [...own][0];
    const next = { ...row, driverId: to, ...row.type === row.driverId ? { type: to } : {} };
    return { row: next, fix: { key: k, from: row.driverId, to, how: 'retargeted' } };
  }
  if (prev) { return { row: prev, fix: { key: k, from: row.driverId, to: prev.driverId, how: 'restored-ambiguous' } }; }
  return { row: undefined, fix: { key: k, from: row.driverId, to: null, how: 'dropped' } };
}

/** Pure: returns { data, fixes[] } with conflicting rows put back to the target mapping. */
function guardRows(synced, base, owners) {
  const data = { ...synced };
  const fixes = [];
  for (const [k, row] of Object.entries(synced)) {
    if (!row || typeof row !== 'object' || typeof row.driverId !== 'string') { continue; }
    const prev = base && base[k];
    // Only rows the sync changed: legacy rows already on the target are not this guard's business.
    if (prev && JSON.stringify(prev) === JSON.stringify(row)) { continue; }
    const own = ownersFor(owners, k, row);
    if (!own || own.has(row.driverId)) { continue; }
    const r = resolveRow(k, row, prev, own);
    if (r.row === undefined) { delete data[k]; } else { data[k] = r.row; }
    fixes.push(r.fix);
  }
  return { data, fixes };
}

function readBase(root, ref, file) {
  try { return JSON.parse(execFileSync('git', ['show', `${ref}:${file}`], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 })); } catch (_e) { return null; }
}

function main(argv) {
  const check = argv.includes('--check');
  const bi = argv.indexOf('--base');
  const ref = bi >= 0 ? argv[bi + 1] : 'HEAD';
  const files = argv.filter((a, i) => !a.startsWith('--') && !(bi >= 0 && i === bi + 1));
  const root = process.cwd();
  const owners = composedOwners(root);
  let total = 0;
  for (const file of files.length ? files : DEFAULT_FILES) {
    const abs = path.join(root, file);
    if (!fs.existsSync(abs)) { continue; }
    const raw = fs.readFileSync(abs, 'utf8');
    const { data, fixes } = guardRows(JSON.parse(raw), readBase(root, ref, file), owners);
    total += fixes.length;
    for (const f of fixes) { console.log(`[sync-guard] ${file}: ${f.key} ${f.from} → ${f.to || '(dropped)'} (${f.how})`); }
    if (fixes.length && !check) {
      const ind = raw.startsWith('{\n  ') ? 2 : 0;
      fs.writeFileSync(abs, JSON.stringify(data, null, ind) + (raw.endsWith('\n') ? '\n' : ''));
    }
  }
  console.log(`[sync-guard] ${total} row(s) ${check ? 'conflicting' : 'kept on the target mapping'}`);
  return check && total ? 1 : 0;
}

if (require.main === module) { process.exitCode = main(process.argv.slice(2)); }
module.exports = { guardRows, composedOwners, ownersFor, norm };
