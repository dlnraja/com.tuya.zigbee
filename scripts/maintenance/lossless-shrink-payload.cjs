#!/usr/bin/env node
'use strict';
/*
 * P2885: lossless shrink of the PREPARED publish directory (never the sources).
 *
 *  1. JSON minify: data/, config/, lib/, locales/, capabilities/ (*.json, outside node_modules).
 *     A file is rewritten only when JSON.parse(minified) deep-equals the original. Homey and
 *     the app only ever JSON.parse these files, and the app dir is read-only at runtime.
 *  2. Unreferenced JS under lib/ (lib/clusters is never touched): a file is dropped only when
 *     (a) no static require()/import() chain from app.js, api.js, drivers/<id>/{driver,device}.js,
 *         pair/repair, widgets or settings reaches it, and
 *     (b) its basename (case-insensitive, token-bounded) appears in no other payload text file
 *         (js/json/html/txt/md), iterated to a fixed point so dead-only chains drop together, and
 *     (c) every dynamic require() site in the reached code is one of the reviewed sites below
 *         (otherwise JS pruning is skipped entirely: fail-safe).
 *     After pruning, a Homey-less load check requires app.js and every driver/device module in a
 *     child process; any NEW "Cannot find module" restores every pruned file.
 *
 * Firmware (.bin), driver images/svg and pair views are kept: Homey requires firmware in
 * drivers/<id>/assets/firmware and per-driver assets; there is no runtime loading for them.
 *
 * Usage: node scripts/maintenance/lossless-shrink-payload.cjs <publishDir> [--dry-run] [--report out.json]
 * Env: LOSSLESS_SHRINK=0 disables. Exit code 0 always (never blocks a publish).
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { isDeepStrictEqual } = require('util');

const REVIEWED_DYNAMIC = new Set([
  'lib/utils/zigbee-tuya-evolution.js|formatsPath', // config-driven, names live in config JSON
  'lib/performance/IntelligentLazyLoad.js|modulePath', // callers pass literal paths
  'lib/helpers/ProbabilisticDeviceDetector.js|request', // safeRequire('<literal>')
  'lib/util/index.js|../../locales/${language}.json', // locales are never pruned
  'lib/zigbee/ZigbeeLibBackports.js|${name}/package.json', // node_modules, never pruned
  'lib/Util.js|fullPath', // requirePermissive(dir, name): no callers; names would be literals
]);
const JSON_DIRS = ['data', 'config', 'lib', 'locales', 'capabilities'];
const MB = 1048576;

function walk(root, skipNodeModules = true) {
  const out = [];
  (function w(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (skipNodeModules && e.name === 'node_modules') continue;
        w(p);
      } else if (e.isFile()) out.push(p);
    }
  })(root);
  return out;
}

function minifyJson(root, dry) {
  let saved = 0, files = 0;
  for (const d of JSON_DIRS) {
    const dir = path.join(root, d);
    if (!fs.existsSync(dir)) continue;
    for (const f of walk(dir)) {
      if (!f.endsWith('.json')) continue;
      const raw = fs.readFileSync(f, 'utf8');
      let obj;
      try { obj = JSON.parse(raw); } catch (_) { continue; }
      const min = JSON.stringify(obj);
      if (min.length >= raw.length) continue;
      if (!isDeepStrictEqual(JSON.parse(min), obj)) continue;
      saved += Buffer.byteLength(raw) - Buffer.byteLength(min);
      files++;
      if (!dry) fs.writeFileSync(f, min);
    }
  }
  return { files, savedMB: +(saved / MB).toFixed(3) };
}

function resolveSpec(from, spec) {
  if (!spec.startsWith('.') && !spec.startsWith('/')) return null;
  const b = path.resolve(path.dirname(from), spec);
  for (const c of [b, `${b}.js`, `${b}.cjs`, `${b}.json`, path.join(b, 'index.js')]) {
    try { if (fs.statSync(c).isFile()) return c; } catch (_) { /* next */ }
  }
  return null;
}

function scanUnreferenced(root) {
  const all = walk(root);
  const isJs = (f) => /\.(c|m)?js$/.test(f);
  const rel = (f) => path.relative(root, f).split(path.sep).join('/');
  const entries = ['app.js', 'api.js'].map((x) => path.join(root, x)).filter(fs.existsSync);
  for (const f of all) {
    if (!isJs(f)) continue;
    const r = rel(f);
    if (/^drivers\/[^/]+\/(driver|device|api)\.js$/.test(r) || /^drivers\/[^/]+\/(pair|repair)\//.test(r)
      || /^(widgets|settings)\//.test(r)) entries.push(f);
  }
  const seen = new Set(), q = [...entries], dynamic = [];
  while (q.length) {
    const f = q.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    if (!isJs(f)) continue;
    const s = fs.readFileSync(f, 'utf8');
    for (const m of s.matchAll(/require\(\s*(['"`])([^'"`]+)\1\s*\)/g)) {
      if (m[1] === '`' && m[2].includes('${')) { dynamic.push(`${rel(f)}|${m[2]}`); continue; }
      const r = resolveSpec(f, m[2]);
      if (r) q.push(r);
    }
    for (const m of s.matchAll(/require\(\s*([^'"`)\s][^)]*)\)/g)) dynamic.push(`${rel(f)}|${m[1].trim()}`);
    for (const m of s.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      const r = resolveSpec(f, m[1]);
      if (r) q.push(r);
    }
  }
  const unreviewed = [...new Set(dynamic)].filter((d) => !REVIEWED_DYNAMIC.has(d));
  const unreached = all.filter((f) => isJs(f) && !seen.has(f) && /^lib\//.test(rel(f)) && !/^lib\/clusters\//.test(rel(f)));
  const un = new Set(unreached);
  const texts = all.filter((f) => /\.((c|m)?js|json|html?|txt|md)$/.test(f) && fs.statSync(f).size < 8 * MB);
  const corpus = new Map(texts.map((f) => [f, fs.readFileSync(f, 'utf8').toLowerCase()]));
  const reFor = (f) => {
    const b = path.basename(f).replace(/\.(c|m)?js$/, '').toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9_-])${b}([^a-z0-9_-]|$)`);
  };
  let kept = new Set(unreached);
  for (;;) {
    const next = new Set();
    for (const f of kept) {
      const re = reFor(f);
      for (const t of texts) {
        if (t === f || (un.has(t) && !kept.has(t))) continue;
        if (re.test(corpus.get(t))) { next.add(f); break; }
      }
    }
    if (next.size === kept.size) break;
    kept = next;
  }
  const drop = unreached.filter((f) => !kept.has(f));
  return { drop, unreviewed, reached: seen.size, unreached: unreached.length, rel };
}

const LOAD_CHECK = `
const Module=require('module');const path=require('path');const fs=require('fs');const R=process.argv[1];
class B{constructor(){this.homey=H;}log(){}error(){}}
const H={__:(k)=>k,settings:{get(){},set(){},on(){}},flow:{},on(){},app:{}};
const stub={App:B,Driver:B,Device:B,SimpleClass:B,FlowCard:B,__:(k)=>k};
const o=Module._load;Module._load=function(r,p,i){if(r==='homey')return stub;return o.apply(this,arguments);};
const miss=new Set();const files=[path.join(R,'app.js')];
for(const d of fs.readdirSync(path.join(R,'drivers')))for(const n of ['driver.js','device.js'])files.push(path.join(R,'drivers',d,n));
for(const f of files){if(!fs.existsSync(f))continue;try{require(f);}catch(e){if(e&&e.code==='MODULE_NOT_FOUND'){const by=(e.requireStack&&e.requireStack[0])||f;if(String(by).startsWith(R))miss.add(String(e.message).split('\\n')[0]+' <- '+path.relative(R,by));}}}
process.stdout.write(JSON.stringify([...miss].sort()));`;

function loadCheck(root) {
  const r = spawnSync(process.execPath, ['-e', LOAD_CHECK, root], { encoding: 'utf8', timeout: 180000, maxBuffer: 64 * MB });
  try { return JSON.parse(r.stdout || '[]'); } catch (_) { return null; }
}

function pruneJs(root, dry) {
  const s = scanUnreferenced(root);
  const res = { reached: s.reached, unreachedLib: s.unreached, candidates: s.drop.length, dropped: 0, savedMB: 0, unreviewedDynamic: s.unreviewed, files: s.drop.map(s.rel) };
  if (s.unreviewed.length) { res.skipped = 'unreviewed dynamic require sites'; return res; }
  if (dry || !s.drop.length) return res;
  const before = loadCheck(root);
  if (before === null) { res.skipped = 'load check unavailable'; return res; }
  const backup = fs.mkdtempSync(path.join(os.tmpdir(), 'p2885-'));
  let bytes = 0;
  for (const f of s.drop) {
    const b = path.join(backup, s.rel(f));
    fs.mkdirSync(path.dirname(b), { recursive: true });
    bytes += fs.statSync(f).size;
    fs.renameSync(f, b);
  }
  const after = loadCheck(root);
  const fresh = after === null ? ['load check failed'] : after.filter((m) => !before.includes(m));
  if (fresh.length) {
    for (const f of s.drop) fs.renameSync(path.join(backup, s.rel(f)), f);
    res.skipped = `restored: load check found ${fresh.length} new missing module(s)`;
    res.newMissing = fresh;
  } else {
    res.dropped = s.drop.length;
    res.savedMB = +(bytes / MB).toFixed(3);
  }
  fs.rmSync(backup, { recursive: true, force: true });
  return res;
}

function main() {
  const args = process.argv.slice(2);
  const target = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(os.tmpdir(), 'homey-publish-temp'));
  const dry = args.includes('--dry-run');
  const ri = args.indexOf('--report');
  if (process.env.LOSSLESS_SHRINK === '0') { console.log('[lossless-shrink] disabled (LOSSLESS_SHRINK=0)'); return; }
  if (!fs.existsSync(path.join(target, 'app.json'))) { console.log(`[lossless-shrink] no app.json in ${target}, skipped`); return; }
  try {
    const json = minifyJson(target, dry);
    const js = pruneJs(target, dry);
    const report = { target, dry, json, js };
    console.log(`[lossless-shrink] JSON minify: ${json.files} files, -${json.savedMB} MB${dry ? ' (dry run)' : ''}`);
    console.log(`[lossless-shrink] unreferenced lib JS: ${js.candidates} candidates, dropped ${js.dropped}, -${js.savedMB} MB${js.skipped ? ` (${js.skipped})` : ''}`);
    if (js.unreviewedDynamic.length) console.log(`::warning::[lossless-shrink] unreviewed dynamic require sites: ${js.unreviewedDynamic.join(', ')}`);
    if (ri >= 0 && args[ri + 1]) fs.writeFileSync(args[ri + 1], JSON.stringify(report, null, 1));
  } catch (e) {
    console.log(`::warning::[lossless-shrink] skipped after error: ${e.message}`);
  }
}

if (require.main === module) main();
module.exports = { minifyJson, scanUnreferenced, pruneJs, REVIEWED_DYNAMIC };
