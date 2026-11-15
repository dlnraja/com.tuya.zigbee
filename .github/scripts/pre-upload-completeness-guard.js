#!/usr/bin/env node
'use strict';
// P3310 pre-upload completeness guard. Byte-identical on master, stable-v5 and bastien-home.
//
// WHY: an empty, truncated or half-copied publish directory must never reach Athom. Athom answers a
// broken package with processing_failed / AggregateError and no error body, so the only place a missing
// driver folder, an empty app.js or a stale manifest can be caught is HERE, on the exact directory that
// `homey app publish --path` / direct-api-publish.js is about to pack. Complements (never replaces)
// publish-dir-guard.cjs (P3281: .homeycompose + folder/manifest parity), payload-preflight.cjs (P2902:
// JSON, PNG sizes, relative requires) and publish-size-gate.cjs (upper size limits). This guard adds the
// LOWER bounds and the completeness checks those do not make blocking.
//
// Usage: node .github/scripts/pre-upload-completeness-guard.js <publishDir> [expectedAppId]
//   env HOMEY_EXPECTED_VERSION  version this run is about to upload (must equal app.json version)
//   env PUBLISH_BASELINE_FILE   default: <repo>/.github/publish-payload-baseline.json
//   env PUBLISH_SOURCE_DIR      source tree the package was built from (default: <repo>); every packaged
//                               driver must exist there and its .homeyignore'd top-level dirs must be absent
//   env PUBLISH_MANIFEST_OUT    where to write the exact package manifest (file list + sha256);
//                               default: $RUNNER_TEMP/publish-size/publish-manifest.json (uploaded as the
//                               publish-size-telemetry artifact, 90 days, so refused and accepted builds diff)
//   env PUBLISH_BASELINE_MANIFEST  manifest of the last accepted build (else fetched once with `gh run
//                               download` from the baseline run when GH_TOKEN is set; else skipped, warned)
// Exit 1 on any problem (blocking, no retry), 0 when the package is complete.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const MIN_PAYLOAD_BYTES = 1024 * 1024;        // a real Homey app of this repo is >= 19 MB
const MIN_ARCHIVE_GZ_BYTES = 256 * 1024;      // smallest accepted archive is ~5 MB gz
const MAX_DROP = 0.35;                        // > 35 % fewer files/bytes/drivers than the last accepted build
const BUILTINS = new Set(require('module').builtinModules.map((m) => m.replace(/^node:/, '')));
const RUNTIME_PROVIDED = new Set(['homey']); // injected by Homey Pro at runtime, never packed
// Never part of a Homey package: compose sources (P3281), build/VCS dirs, repo-only trees. The source
// .homeyignore top-level dirs are added at run time (one rule: what the project excludes must not ship).
const STRAY_TOP = ['.homeycompose', '.homeybuild', '.git', '.github', 'coverage', 'test', 'tests', 'docs', 'reports', 'backups', 'scripts', 'tools', 'specs', 'examples'];

function walk(root) {
  const out = [];
  const st = [''];
  while (st.length) {
    const rel = st.pop();
    let ents;
    try { ents = fs.readdirSync(path.join(root, rel), { withFileTypes: true }); } catch { continue; }
    for (const e of ents) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) { if (e.name !== '.git' && e.name !== '.homeybuild') st.push(r); }
      else if (e.isFile()) out.push({ rel: r, size: fs.statSync(path.join(root, r)).size });
    }
  }
  return out;
}

// Same shape the Homey CLI uploads: a gzip of the tree (tar headers ignored: lower bound only).
function archiveGzBytes(root, files) {
  let total = 0;
  for (const f of files) {
    if (f.size === 0) continue;
    try { total += zlib.gzipSync(fs.readFileSync(path.join(root, f.rel)), { level: 1 }).length; } catch { /* unreadable: payload-preflight reports it */ }
  }
  return total;
}

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
}

function tryGuarded(src, idx) {
  const before = src.slice(Math.max(0, idx - 400), idx);
  const t = before.search(/try\s*\{(?![\s\S]*try\s*\{)/);
  return t >= 0 && !/\bcatch\b/.test(before.slice(t));
}

function resolveRel(set, fromRel, spec) {
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), spec));
  return [target, `${target}.js`, `${target}.json`, `${target}/index.js`].find((c) => set.has(c)) || null;
}

// Closure of app.js (+ every driver.js/device.js) over relative requires; bare modules must be a Node
// builtin, provided by the Homey runtime, or packed under node_modules/<pkg>.
function requireClosure(root, set, entries) {
  const errors = []; const warns = [];
  const seen = new Set(); const queue = entries.filter((e) => set.has(e));
  while (queue.length) {
    const rel = queue.shift();
    if (seen.has(rel) || !rel.endsWith('.js') || rel.startsWith('node_modules/')) continue;
    seen.add(rel);
    let src;
    try { src = stripComments(fs.readFileSync(path.join(root, rel), 'utf8')); } catch { errors.push(`unreadable ${rel}`); continue; }
    const re = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
    let m;
    while ((m = re.exec(src))) {
      const spec = m[1];
      if (spec.startsWith('.')) {
        const hit = resolveRel(set, rel, spec);
        if (hit) queue.push(hit);
        else if (tryGuarded(src, m.index)) warns.push(`optional require('${spec}') absent in ${rel} (try-guarded)`);
        else errors.push(`require('${spec}') in ${rel} does not resolve inside the package`);
        continue;
      }
      if (spec.startsWith('/')) { errors.push(`absolute require('${spec}') in ${rel}`); continue; }
      const name = spec.replace(/^node:/, '').split('/').slice(0, spec.startsWith('@') ? 2 : 1).join('/');
      if (BUILTINS.has(name) || BUILTINS.has(spec.replace(/^node:/, '')) || RUNTIME_PROVIDED.has(name)) continue;
      if (fs.existsSync(path.join(root, 'node_modules', name, 'package.json')) || set.has(`node_modules/${name}/index.js`)) continue;
      if (tryGuarded(src, m.index)) warns.push(`optional module '${name}' not packed (try-guarded) in ${rel}`);
      else errors.push(`module '${name}' required by ${rel} is not packed under node_modules/`);
    }
  }
  return { errors, warns, scanned: seen.size };
}

function loadBaseline(file, appId) {
  try {
    const all = JSON.parse(fs.readFileSync(file, 'utf8'));
    return (all && all.apps && all.apps[appId]) || null;
  } catch { return null; }
}

function sha256(file) {
  try { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); } catch { return null; }
}

// Top-level directory names excluded by the source .homeyignore (plain names only, no globs).
function ignoredTopDirs(sourceDir) {
  try {
    return fs.readFileSync(path.join(sourceDir, '.homeyignore'), 'utf8').split(/\r?\n/)
      .map((l) => l.trim().replace(/^\/+/, '').replace(/\/+$/, ''))
      .filter((l) => l && !l.startsWith('#') && !l.startsWith('!') && !/[*?[\]/]/.test(l))
      .filter((l) => { try { return fs.statSync(path.join(sourceDir, l)).isDirectory(); } catch { return false; } });
  } catch { return []; }
}

function buildManifest(root, files, meta = {}) {
  const out = {};
  for (const f of files.slice().sort((a, b) => (a.rel < b.rel ? -1 : 1))) out[f.rel] = { size: f.size, sha256: sha256(path.join(root, f.rel)) };
  return { schema: 1, ...meta, fileCount: files.length, files: out };
}

const driverOf = (rel) => { const m = /^drivers\/([^/]+)\//.exec(rel); return m ? m[1] : null; };

// added/removed/changed files vs the last accepted build. Blocking: a driver present in BOTH builds
// that lost files it had before (truncated copy), or a removal share above MAX_DROP.
function diffManifests(cur, base) {
  const a = cur.files || {}; const b = base.files || {};
  const added = Object.keys(a).filter((k) => !(k in b));
  const removed = Object.keys(b).filter((k) => !(k in a));
  const changed = Object.keys(a).filter((k) => k in b && a[k].sha256 !== b[k].sha256);
  const curDrivers = new Set(Object.keys(a).map(driverOf).filter(Boolean));
  const baseDrivers = new Set(Object.keys(b).map(driverOf).filter(Boolean));
  const driversAdded = [...curDrivers].filter((d) => !baseDrivers.has(d)).sort();
  const driversRemoved = [...baseDrivers].filter((d) => !curDrivers.has(d)).sort();
  const truncated = removed.filter((k) => { const d = driverOf(k); return d && curDrivers.has(d); });
  const errors = [];
  if (truncated.length) errors.push(`${truncated.length} file(s) vanished from drivers kept since the last accepted build v${base.version || '?'}: ${truncated.slice(0, 8).join(', ')}`);
  const nBase = Object.keys(b).length;
  if (nBase && removed.length > nBase * MAX_DROP) errors.push(`${removed.length}/${nBase} files of the last accepted build v${base.version || '?'} are gone (> ${MAX_DROP * 100} %)`);
  return { added, removed, changed, driversAdded, driversRemoved, truncated, errors };
}

function fetchBaselineManifest(baseline) {
  if (!baseline || !baseline.run || !(process.env.GH_TOKEN || process.env.GITHUB_TOKEN)) return null;
  const { execFileSync } = require('child_process');
  const os = require('os');
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'p3310-base-'));
  const name = baseline.artifact || `publish-size-telemetry-${baseline.run}-1`;
  try {
    execFileSync('gh', ['run', 'download', String(baseline.run), '-n', name, '-D', dest, ...(process.env.GITHUB_REPOSITORY ? ['-R', process.env.GITHUB_REPOSITORY] : [])],
      { stdio: 'pipe', timeout: 60000, env: { ...process.env, GH_TOKEN: process.env.GH_TOKEN || process.env.GITHUB_TOKEN } });
    const f = path.join(dest, 'publish-manifest.json');
    return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
  } catch { return null; }
}

function check(dir, { appId, expectedVersion, baseline, sourceDir, baselineManifest } = {}) {
  const errors = []; const warns = []; const info = {};
  const root = path.resolve(dir || '');
  if (!dir || !fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    errors.push(`publish directory missing: ${root}`);
    return { errors, warns, info };
  }
  const files = walk(root);
  const set = new Set(files.map((f) => f.rel));
  info.files = files.length;
  info.bytes = files.reduce((a, f) => a + f.size, 0);
  if (!files.length) { errors.push('publish directory is EMPTY'); return { errors, warns, info }; }

  // stray / stale trees that must never ship
  const tops = new Set(files.map((f) => f.rel.split('/')[0]));
  const strayNames = new Set([...STRAY_TOP, ...(sourceDir ? ignoredTopDirs(sourceDir) : [])]);
  const stray = [...tops].filter((t) => strayNames.has(t) && files.some((f) => f.rel.startsWith(`${t}/`)));
  if (stray.length) errors.push(`stray repo-only dir(s) in the package: ${stray.sort().join(', ')} (.homeyignore / compose sources must not ship)`);
  const nestedCompose = files.filter((f) => /(^|\/)\.homeycompose\//.test(f.rel) && !f.rel.startsWith('.homeycompose/')).slice(0, 3);
  if (nestedCompose.length) errors.push(`nested .homeycompose in the package: ${nestedCompose.map((f) => f.rel).join(', ')}`);

  // app.json
  let app = null;
  if (!set.has('app.json')) errors.push('app.json missing');
  else {
    try { app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8').replace(/^\uFEFF/, '')); }
    catch (e) { errors.push(`app.json does not parse (${String(e.message).slice(0, 80)})`); }
  }
  if (app) {
    info.version = app.version; info.appId = app.id;
    if (appId && app.id !== appId) errors.push(`app.json id ${app.id} != expected ${appId}`);
    if (!/^\d+\.\d+\.\d+$/.test(String(app.version || ''))) errors.push(`app.json version invalid: ${app.version}`);
    if (expectedVersion && String(app.version) !== String(expectedVersion)) {
      errors.push(`app.json version ${app.version} != HOMEY_EXPECTED_VERSION ${expectedVersion} (stale or wrong package)`);
    }
    const drivers = Array.isArray(app.drivers) ? app.drivers : [];
    info.drivers = drivers.length;
    if (!drivers.length) errors.push('app.json has NO drivers');
    const dirs = set.size ? fs.existsSync(path.join(root, 'drivers'))
      ? fs.readdirSync(path.join(root, 'drivers'), { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith('.')).map((e) => e.name) : [] : [];
    info.driverFolders = dirs.length;
    if (dirs.length !== drivers.length) errors.push(`app.json lists ${drivers.length} drivers but ${dirs.length} driver folders are packaged`);
    const ids = new Set();
    const listed = new Set(drivers.map((d) => d && d.id).filter(Boolean));
    const unlisted = dirs.filter((n) => !listed.has(n));
    if (unlisted.length) errors.push(`${unlisted.length} packaged driver folder(s) not in app.json (stale/unfiltered tree): ${unlisted.slice(0, 8).join(', ')}`);
    if (sourceDir && fs.existsSync(path.join(sourceDir, 'drivers'))) {
      const notInSource = [...listed].filter((id) => !fs.existsSync(path.join(sourceDir, 'drivers', id)));
      if (notInSource.length) errors.push(`${notInSource.length} packaged driver(s) absent from the source tree (wrong/stale package): ${notInSource.slice(0, 8).join(', ')}`);
      info.sourceDriverFolders = fs.readdirSync(path.join(sourceDir, 'drivers'), { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith('.')).length;
    }
    for (const d of drivers) {
      const id = d && d.id;
      if (!id) { errors.push('driver entry without id'); continue; }
      if (ids.has(id)) errors.push(`duplicate driver id ${id}`);
      ids.add(id);
      if (!dirs.includes(id)) { errors.push(`driver ${id}: folder drivers/${id} not packaged`); continue; }
      if (!set.has(`drivers/${id}/driver.js`) && !set.has(`drivers/${id}/driver.compose.json`)) {
        errors.push(`driver ${id}: neither driver.js nor driver.compose.json packaged`);
      }
      for (const k of ['small', 'large', 'xlarge']) {
        const p = d.images && d.images[k];
        if (!p) continue;
        const rel = String(p).replace(/^\/+/, '');
        const f = files.find((x) => x.rel === rel);
        if (!f) errors.push(`driver ${id}: image ${k} ${p} not packaged`);
        else if (f.size === 0) errors.push(`driver ${id}: image ${k} ${p} is 0 bytes`);
      }
    }
    for (const k of ['small', 'large', 'xlarge']) {
      const p = app.images && app.images[k];
      if (!p) continue;
      const f = files.find((x) => x.rel === String(p).replace(/^\/+/, ''));
      if (!f) errors.push(`app image ${k} ${p} not packaged`);
      else if (f.size === 0) errors.push(`app image ${k} ${p} is 0 bytes`);
    }
  }

  // app.js + require closure
  const appJs = files.find((f) => f.rel === 'app.js');
  if (!appJs) errors.push('app.js missing');
  else if (appJs.size === 0) errors.push('app.js is 0 bytes');
  else {
    const entries = ['app.js'];
    if (set.has('api.js')) entries.push('api.js');
    for (const f of files) if (/^drivers\/[^/]+\/(driver|device)\.js$/.test(f.rel)) entries.push(f.rel);
    const c = requireClosure(root, set, entries);
    errors.push(...c.errors); warns.push(...c.warns); info.jsScanned = c.scanned;
  }

  // zero-byte JS/JSON (node_modules included: an empty module file is just as fatal)
  const empty = files.filter((f) => f.size === 0 && /\.(js|cjs|mjs|json)$/.test(f.rel));
  if (empty.length) errors.push(`${empty.length} zero-byte JS/JSON file(s): ${empty.slice(0, 8).map((f) => f.rel).join(', ')}`);

  // absolute lower bounds
  info.archiveGzBytes = archiveGzBytes(root, files);
  if (info.bytes < MIN_PAYLOAD_BYTES) errors.push(`payload ${info.bytes} bytes < sane minimum ${MIN_PAYLOAD_BYTES}`);
  if (info.archiveGzBytes < MIN_ARCHIVE_GZ_BYTES) errors.push(`archive ~${info.archiveGzBytes} gz bytes < sane minimum ${MIN_ARCHIVE_GZ_BYTES}`);

  // relative lower bounds vs the last accepted build of this app
  if (baseline) {
    const drop = (cur, ref, what) => {
      if (!ref || cur == null) return;
      if (cur < ref * (1 - MAX_DROP)) errors.push(`${what} ${cur} is ${Math.round((1 - cur / ref) * 100)} % below the last accepted build v${baseline.version} (${ref}); sudden drop > ${MAX_DROP * 100} %`);
    };
    drop(info.files, baseline.payload_files, 'file count');
    drop(info.bytes, baseline.payload_bytes, 'payload bytes');
    drop(info.drivers, baseline.drivers, 'driver count');
    drop(info.archiveGzBytes, baseline.archive_gz_bytes ? Math.round(baseline.archive_gz_bytes * 0.8) : 0, 'archive gz bytes (estimate)');
  } else warns.push('no accepted-build baseline for this app: relative drop check skipped');

  // exact package manifest (file list + sha256) and diff vs the last accepted build
  const manifest = buildManifest(root, files, { appId: info.appId || null, version: info.version || null, drivers: info.drivers ?? null });
  let diff = null;
  if (baselineManifest && baselineManifest.files) {
    diff = diffManifests(manifest, baselineManifest);
    errors.push(...diff.errors);
  } else warns.push('no manifest of the last accepted build: file-level diff skipped (this run saves one for the next)');
  return { errors, warns, info, manifest, diff };
}

if (require.main === module) {
  const [dir, appIdArg] = process.argv.slice(2);
  const repo = path.resolve(__dirname, '..', '..');
  const baseFile = process.env.PUBLISH_BASELINE_FILE || path.join(repo, '.github', 'publish-payload-baseline.json');
  let appId = appIdArg;
  if (!appId) { try { appId = JSON.parse(fs.readFileSync(path.join(dir, 'app.json'), 'utf8')).id; } catch { appId = ''; } }
  const baseline = appId ? loadBaseline(baseFile, appId) : null;
  let baselineManifest = null;
  if (process.env.PUBLISH_BASELINE_MANIFEST) { try { baselineManifest = JSON.parse(fs.readFileSync(process.env.PUBLISH_BASELINE_MANIFEST, 'utf8')); } catch (e) { console.log(`  WARN baseline manifest unreadable: ${e.message}`); } }
  else baselineManifest = fetchBaselineManifest(baseline);
  const sourceDir = process.env.PUBLISH_SOURCE_DIR || (process.env.GITHUB_WORKSPACE || repo);
  const r = check(dir, { appId: appIdArg || '', expectedVersion: process.env.HOMEY_EXPECTED_VERSION || '', baseline, sourceDir, baselineManifest });
  const i = r.info;
  const outFile = process.env.PUBLISH_MANIFEST_OUT || (process.env.RUNNER_TEMP ? path.join(process.env.RUNNER_TEMP, 'publish-size', 'publish-manifest.json') : '');
  if (outFile && r.manifest) {
    try {
      fs.mkdirSync(path.dirname(outFile), { recursive: true });
      fs.writeFileSync(outFile, JSON.stringify({ ...r.manifest, run: process.env.GITHUB_RUN_ID || null, blocked: r.errors.length > 0, diffVsBaseline: r.diff ? { baseline: baselineManifest.version || null, added: r.diff.added, removed: r.diff.removed, changed: r.diff.changed.length, driversAdded: r.diff.driversAdded, driversRemoved: r.diff.driversRemoved } : null }));
      console.log(`[pre-upload-guard] manifest (${r.manifest.fileCount} files + sha256) -> ${outFile}`);
    } catch (e) { console.log(`  WARN could not write manifest: ${e.message}`); }
  }
  if (r.diff) console.log(`[pre-upload-guard] vs accepted v${baselineManifest.version || '?'}: +${r.diff.added.length} / -${r.diff.removed.length} files, ${r.diff.changed.length} changed; drivers +[${r.diff.driversAdded.join(', ')}] -[${r.diff.driversRemoved.join(', ')}]`);
  console.log(`[pre-upload-guard] ${dir}: v${i.version || '?'} ${i.drivers ?? '?'} drivers / ${i.driverFolders ?? '?'} folders, ${i.files ?? 0} files, ${((i.bytes || 0) / 1048576).toFixed(2)} MB, archive ~${((i.archiveGzBytes || 0) / 1048576).toFixed(2)} MB gz, ${i.jsScanned ?? 0} JS scanned`);
  if (!process.env.HOMEY_EXPECTED_VERSION) console.log('[pre-upload-guard] HOMEY_EXPECTED_VERSION not set: version match not checked');
  for (const w of r.warns.slice(0, 20)) console.log(`  WARN ${w}`);
  for (const e of r.errors) console.log(`::error::pre-upload guard: ${e}`);
  if (r.errors.length) {
    console.log(`[pre-upload-guard] BLOCKED: ${r.errors.length} problem(s); the package is NOT uploaded (no retry: fix the build).`);
    if (process.env.GITHUB_STEP_SUMMARY) { try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Upload blocked by the pre-upload completeness guard (P3310)\n${r.errors.slice(0, 20).map((e) => `- ${e}`).join('\n')}\n`); } catch { /* summary is best effort */ } }
    process.exit(1);
  }
  console.log('[pre-upload-guard] OK: package complete');
}
module.exports = { check, requireClosure, loadBaseline, buildManifest, diffManifests, ignoredTopDirs, STRAY_TOP, MAX_DROP, MIN_PAYLOAD_BYTES, MIN_ARCHIVE_GZ_BYTES };
