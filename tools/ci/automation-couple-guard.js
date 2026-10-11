#!/usr/bin/env node
'use strict';
/**
 * Automation couple guard — stops bots (auto-fix-all, master→stable/bastien sync,
 * promote/enrich jobs) from undoing curated couple decisions.
 *
 * Compares the working tree against a base ref (default HEAD = what the bot is about
 * to commit) and flags, per driver.compose.json:
 *   1. PIN_LOST      a couple from couple-driver-pins.json / publish-sacred-keep-couples.json
 *                    that was in its pinned driver at base and is gone now;
 *   2. PIN_BLEED     a pinned mfr (+ its pid) newly claimed by a different driver;
 *   3. DENY_READDED  a mfr listed in curated-couple-removals.json for a driver that came back;
 *   4. GOLDEN_LOST   driver lost mfr/pid entries versus base (count drop) — bots may only grow.
 *   5. MFS_KEY_LOST  a data/mfs_db.json key present at base vanished (e.g. HOBEIAN forms);
 *   6. MFS_JUNK      a remote-fleet mfs entry regained P2613 cross-brand pids (IKEA/Lumi/...).
 *
 * Modes:
 *   --check   (default) print violations, exit 1 if any
 *   --revert  restore every offending file from base (the bot's change to it is skipped),
 *             re-check, exit 0 when clean (1 if still dirty)
 *   --base <ref>  compare against <ref> instead of HEAD (e.g. origin/stable-v5 in a sync)
 *   --allow-golden-shrink  skip rule 4 (human-reviewed removals only; never in bots)
 *
 * Rules are case-insensitive on mfr/pid. Pure Node, no deps.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = process.env.GUARD_ROOT ? path.resolve(process.env.GUARD_ROOT) : path.resolve(__dirname, '..', '..');
const args = process.argv.slice(2);
const MODE = args.includes('--revert') ? 'revert' : 'check';
const bi = args.indexOf('--base');
const BASE = bi >= 0 ? args[bi + 1] : 'HEAD';
const ALLOW_SHRINK = args.includes('--allow-golden-shrink');

const lc = (s) => String(s || '').trim().toLowerCase();
const git = (a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

function readJsonSafe(p) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')); } catch (_e) { return null; }
}
function baseJson(rel) {
  try { return JSON.parse(git(['show', `${BASE}:${rel}`])); } catch (_e) { return null; }
}
function zig(j) {
  const z = (j && j.zigbee) || {};
  return {
    mfr: new Set((z.manufacturerName || []).filter((x) => typeof x === 'string').map(lc)),
    pid: new Set((z.productId || []).filter((x) => typeof x === 'string').map(lc)),
  };
}

function loadRules() {
  const pins = [];
  const pinFile = readJsonSafe('config/architecture/couple-driver-pins.json');
  for (const p of (pinFile && pinFile.pins) || []) {
    const mfrs = Array.isArray(p.mfr) ? p.mfr : [p.mfr];
    for (const m of mfrs) pins.push({ mfr: lc(m), pid: p.pid ? lc(p.pid) : null, driver: p.driver, src: 'couple-driver-pins' });
  }
  const sk = readJsonSafe('config/architecture/publish-sacred-keep-couples.json');
  for (const c of (sk && sk.couples) || []) {
    if (c && c.mfr && c.driverId) pins.push({ mfr: lc(c.mfr), pid: c.pid ? lc(c.pid) : null, driver: c.driverId, src: 'publish-sacred-keep' });
  }
  const deny = [];
  const dn = readJsonSafe('config/architecture/curated-couple-removals.json');
  for (const r of (dn && dn.removals) || []) {
    for (const m of r.mfr || []) deny.push({ mfr: lc(m), driver: r.driver, why: r.why || '' });
  }
  return { pins, deny };
}

function changedComposeFiles() {
  const out = new Set();
  const add = (txt) => txt.split('\n').map((s) => s.trim()).filter(Boolean).forEach((f) => {
    if (/^drivers\/[^/]+\/driver\.compose\.json$/.test(f)) out.add(f);
  });
  add(git(['diff', '--name-only', BASE, '--', 'drivers']));
  add(git(['ls-files', '--others', '--exclude-standard', '--', 'drivers']));
  return [...out];
}

function evaluate() {
  const { pins, deny } = loadRules();
  const files = changedComposeFiles();
  const v = [];
  const pinByDriver = new Map();
  for (const p of pins) {
    if (!pinByDriver.has(p.driver)) pinByDriver.set(p.driver, []);
    pinByDriver.get(p.driver).push(p);
  }
  for (const rel of files) {
    const driver = rel.split('/')[1];
    const now = zig(readJsonSafe(rel));
    const was = zig(baseJson(rel));
    // 1. pinned couples lost from their own driver
    for (const p of pinByDriver.get(driver) || []) {
      const hadIt = was.mfr.has(p.mfr) && (!p.pid || was.pid.has(p.pid));
      const hasIt = now.mfr.has(p.mfr) && (!p.pid || now.pid.has(p.pid));
      if (hadIt && !hasIt) v.push({ rule: 'PIN_LOST', file: rel, detail: `${p.mfr}${p.pid ? '+' + p.pid : ''} pinned to ${driver} (${p.src})` });
    }
    // 2. pinned mfr bleeding into another driver
    for (const p of pins) {
      if (p.driver === driver) continue;
      const newly = now.mfr.has(p.mfr) && !was.mfr.has(p.mfr);
      if (newly && (!p.pid || now.pid.has(p.pid))) v.push({ rule: 'PIN_BLEED', file: rel, detail: `${p.mfr}${p.pid ? '+' + p.pid : ''} belongs to ${p.driver} (${p.src})` });
    }
    // 3. curated removals re-added
    for (const d of deny) {
      if (d.driver !== driver) continue;
      if (now.mfr.has(d.mfr) && !was.mfr.has(d.mfr)) v.push({ rule: 'DENY_READDED', file: rel, detail: `${d.mfr} deliberately removed from ${driver}${d.why ? ' — ' + d.why : ''}` });
    }
    // 4. golden: bots may only grow
    if (!ALLOW_SHRINK && (was.mfr.size || was.pid.size)) {
      const lostM = [...was.mfr].filter((m) => !now.mfr.has(m));
      const lostP = [...was.pid].filter((p) => !now.pid.has(p));
      if (lostM.length || lostP.length) {
        v.push({ rule: 'GOLDEN_LOST', file: rel, detail: `lost mfr=${lostM.length} pid=${lostP.length} (e.g. ${[...lostM, ...lostP].slice(0, 3).join(', ')})` });
      }
    }
  }
  // mfs_db
  const MFS = 'data/mfs_db.json';
  let mfsChanged = false;
  try { mfsChanged = git(['diff', '--name-only', BASE, '--', MFS]).trim().length > 0; } catch (_e) { /* soft */ }
  if (mfsChanged) {
    const now = readJsonSafe(MFS) || {};
    const was = baseJson(MFS) || {};
    const lostKeys = Object.keys(was).filter((k) => !(k in now));
    if (lostKeys.length) v.push({ rule: 'MFS_KEY_LOST', file: MFS, detail: `${lostKeys.length} key(s) gone, e.g. ${lostKeys.slice(0, 5).join(', ')}` });
    const FLEET = new Set(['button_wireless_1', 'button_wireless_2', 'button_wireless_3', 'button_wireless_4',
      'wall_remote_1_gang', 'wall_remote_2_gang', 'wall_remote_3_gang', 'scene_switch_4']);
    const JUNK = /^(3450-L|E1\d{3}|LUMI\.|ROM001|01MINIZB|A11Z|BASICZBR3)/i;
    let junk = 0; const ex = [];
    for (const [k, e] of Object.entries(now)) {
      if (!k.startsWith('_') || !e || !FLEET.has(e.driverId)) continue;
      const before = new Set(((was[k] && was[k].modelIds) || []).map(lc));
      const added = (e.modelIds || []).filter((m) => JUNK.test(m) && !before.has(lc(m)));
      if (added.length) { junk++; if (ex.length < 3) ex.push(`${k}:${added[0]}`); }
    }
    if (junk) v.push({ rule: 'MFS_JUNK', file: MFS, detail: `${junk} remote entr(ies) regained cross-brand pids, e.g. ${ex.join(', ')}` });
  }
  return v;
}

function main() {
  let v = evaluate();
  for (const x of v) console.log(`[couple-guard] ${x.rule} ${x.file}: ${x.detail}`);
  if (!v.length) { console.log(`[couple-guard] OK (base ${BASE})`); return 0; }
  if (MODE !== 'revert') { console.log(`[couple-guard] ${v.length} violation(s) — failing`); return 1; }
  const files = [...new Set(v.map((x) => x.file))];
  for (const f of files) {
    let existed = true;
    try { git(['cat-file', '-e', `${BASE}:${f}`]); } catch (_e) { existed = false; }
    if (existed) git(['checkout', BASE, '--', f]);
    else fs.rmSync(path.join(ROOT, f), { force: true });
    console.log(`[couple-guard] skipped bot change: restored ${f} from ${BASE}`);
  }
  v = evaluate();
  if (v.length) { console.log(`[couple-guard] still ${v.length} violation(s) after revert`); return 1; }
  console.log(`[couple-guard] clean after reverting ${files.length} file(s)`);
  return 0;
}

if (require.main === module) process.exit(main());
module.exports = { evaluate, loadRules };
