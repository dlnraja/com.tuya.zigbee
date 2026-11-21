#!/usr/bin/env node
'use strict';

/*
 * P3360: lossless driver-image dedupe in the PREPARED publish directory (never the sources).
 *
 * Homey reads driver images from app.json `images.small` / `images.large` (payload-preflight
 * only requires those paths to exist). Athom #488 ties AggregateError to the packaged file
 * count; many drivers ship byte-identical PNG copies. This script:
 *  1. Groups identical small.png / large.png by sha256.
 *  2. Keeps one canonical copy under assets/driver-images/<sha16>/{small,large}.png.
 *  3. Rewrites app.json image paths to that canonical file.
 *  4. Deletes now-unreferenced duplicate PNGs under drivers/<id>/assets/images/.
 * icon.svg is left in place (SDK convention / default icon path).
 *
 * Usage: node scripts/maintenance/dedupe-packaged-driver-images.cjs <publishDir> [--dry-run]
 * Env: DEDUPE_DRIVER_IMAGES=0 disables.
 * Exit 1 if a rewrite would leave a missing image (fail closed). Exit 0 when skipped or OK.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const KINDS = ['small', 'large'];

function sha256(abs) {
  return crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
}

function relOf(p) {
  return String(p || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

function existingImage(root, ref) {
  const rel = relOf(ref);
  if (!rel) return null;
  const abs = path.join(root, rel);
  return fs.existsSync(abs) && fs.statSync(abs).isFile() ? { rel, abs } : null;
}

function collectRefs(app) {
  const refs = new Set();
  const add = (p) => { const r = relOf(p); if (r) refs.add(r); };
  if (app && app.images && typeof app.images === 'object') {
    for (const v of Object.values(app.images)) add(v);
  }
  for (const d of (app && app.drivers) || []) {
    if (d && d.images && typeof d.images === 'object') {
      for (const v of Object.values(d.images)) add(v);
    }
    if (d && d.zigbee && d.zigbee.learnmode && typeof d.zigbee.learnmode.image === 'string') {
      add(String(d.zigbee.learnmode.image).replace('{{driverAssetsPath}}', `drivers/${d.id}/assets`));
    }
  }
  return refs;
}

function dedupe(root, dry) {
  const appPath = path.join(root, 'app.json');
  if (!fs.existsSync(appPath)) {
    return { skipped: 'no app.json', rewritten: 0, removed: 0, kept: 0, canonical: 0 };
  }
  const raw = fs.readFileSync(appPath, 'utf8');
  const app = JSON.parse(raw);
  const drivers = Array.isArray(app.drivers) ? app.drivers : [];
  const groups = { small: new Map(), large: new Map() };
  const missing = [];

  for (const d of drivers) {
    if (!d || !d.id) continue;
    if (!d.images || typeof d.images !== 'object') d.images = {};
    for (const kind of KINDS) {
      const conventional = `drivers/${d.id}/assets/images/${kind}.png`;
      const found = existingImage(root, d.images[kind]) || existingImage(root, conventional);
      if (!found) {
        // A driver with no image at all is left alone (other gates report it).
        continue;
      }
      const hash = sha256(found.abs);
      if (!groups[kind].has(hash)) groups[kind].set(hash, { hash, rel: found.rel, abs: found.abs, users: [] });
      groups[kind].get(hash).users.push(d);
    }
  }

  const canonicalRel = {};
  let canonical = 0;
  for (const kind of KINDS) {
    canonicalRel[kind] = new Map();
    for (const [hash, g] of groups[kind]) {
      const destRel = `assets/driver-images/${hash.slice(0, 16)}/${kind}.png`;
      const destAbs = path.join(root, destRel);
      if (!dry) {
        fs.mkdirSync(path.dirname(destAbs), { recursive: true });
        if (!fs.existsSync(destAbs)) {
          fs.copyFileSync(g.abs, destAbs);
          canonical++;
        }
      } else if (!fs.existsSync(destAbs)) {
        canonical++;
      }
      canonicalRel[kind].set(hash, destRel);
    }
  }

  let rewritten = 0;
  for (const kind of KINDS) {
    for (const [hash, g] of groups[kind]) {
      const destRel = canonicalRel[kind].get(hash);
      const destPath = `/${destRel}`;
      for (const d of g.users) {
        if (relOf(d.images[kind]) !== destRel) {
          d.images[kind] = destPath;
          rewritten++;
        }
      }
    }
  }

  if (!dry && rewritten) {
    fs.writeFileSync(appPath, JSON.stringify(app));
  }

  // Fail closed before deleting anything: every rewritten path must exist.
  if (!dry) {
    const after = JSON.parse(fs.readFileSync(appPath, 'utf8'));
    for (const d of after.drivers || []) {
      for (const kind of KINDS) {
        const p = d.images && d.images[kind];
        if (!p) continue;
        if (!existingImage(root, p)) missing.push(`${d.id} ${kind} -> ${p}`);
      }
    }
    if (missing.length) {
      fs.writeFileSync(appPath, raw);
      const err = new Error(`P3360 image path(s) missing after dedupe: ${missing.slice(0, 8).join('; ')}`);
      err.missing = missing;
      throw err;
    }
  }

  const refs = collectRefs(JSON.parse(fs.readFileSync(appPath, 'utf8')));
  // After a dry run, refs still point at the originals; only delete when applied.
  let removed = 0;
  if (!dry) {
    const imgRoot = path.join(root, 'drivers');
    if (fs.existsSync(imgRoot)) {
      for (const id of fs.readdirSync(imgRoot)) {
        const dir = path.join(imgRoot, id, 'assets', 'images');
        if (!fs.existsSync(dir)) continue;
        for (const kind of KINDS) {
          const rel = `drivers/${id}/assets/images/${kind}.png`;
          const abs = path.join(root, rel);
          if (!fs.existsSync(abs)) continue;
          if (refs.has(rel)) continue;
          fs.unlinkSync(abs);
          removed++;
        }
      }
    }
  }

  let kept = 0;
  for (const kind of KINDS) kept += groups[kind].size;
  return { skipped: null, rewritten, removed, kept, canonical, groups: { small: groups.small.size, large: groups.large.size } };
}

function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry-run');
  const target = path.resolve(args.find((a) => !a.startsWith('-')) || '');
  if (!target) {
    console.error('Usage: node scripts/maintenance/dedupe-packaged-driver-images.cjs <publishDir> [--dry-run]');
    process.exit(1);
  }
  if (process.env.DEDUPE_DRIVER_IMAGES === '0') {
    console.log('[dedupe-driver-images] disabled (DEDUPE_DRIVER_IMAGES=0)');
    return;
  }
  if (!fs.existsSync(target)) {
    console.error(`[dedupe-driver-images] Missing publish directory: ${target}`);
    process.exit(1);
  }
  try {
    const r = dedupe(target, dry);
    if (r.skipped) {
      console.log(`[dedupe-driver-images] skipped: ${r.skipped}`);
      return;
    }
    console.log(`[dedupe-driver-images] unique small/large ${r.groups.small}/${r.groups.large}, canonical copies ${r.canonical}, paths rewritten ${r.rewritten}, duplicates removed ${r.removed}${dry ? ' (dry run)' : ''}`);
  } catch (e) {
    console.error(`[dedupe-driver-images] FAIL: ${e.message}`);
    process.exit(1);
  }
}

module.exports = { dedupe, collectRefs, relOf };

if (require.main === module) main();
