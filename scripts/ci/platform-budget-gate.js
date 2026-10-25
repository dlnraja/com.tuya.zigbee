#!/usr/bin/env node
'use strict';
/**
 * P3026: platform budget gate. One report for every limit listed in config/platform-limits.json
 * (Athom payload, Homey memory, GitHub Actions / repo / API). Each measure is compared with
 * warnPct and failPct (default 80 / 90 %) of its limit, so we stop BEFORE a limit, not at it.
 *
 *   node scripts/ci/platform-budget-gate.js [--publish-dir DIR] [--online] [--json] [--out FILE] [--block]
 *
 * mode "report" (config default): prints (optionally writes --out FILE) and the
 * GitHub step summary, always exits 0. mode "block" (or --block / PLATFORM_BUDGET_MODE=block):
 * exits 1 when any measure reaches failPct. Measures that cannot be taken are "skipped", never a
 * failure. Read-only: it never changes the app, the manifest or a validator input.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const MB = 1024 * 1024;

function parseArgs(argv) {
  const a = { publishDir: null, out: null, online: false, json: false, block: false, config: path.join(ROOT, 'config', 'platform-limits.json') };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    if (v === '--publish-dir') a.publishDir = argv[++i];
    else if (v === '--online') a.online = true;
    else if (v === '--out') a.out = argv[++i];
    else if (v === '--json') a.json = true;
    else if (v === '--block') a.block = true;
    else if (v === '--config') a.config = argv[++i];
  }
  return a;
}

function walk(dir, fn) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, fn);
    else if (e.isFile()) { try { fn(p, fs.statSync(p).size); } catch { /* race */ } }
  }
}

/** Same cartesian rule as compact-zigbee-identifiers comboCount (raw unique strings, case kept). */
function comboCount(driver) {
  const z = driver && driver.zigbee;
  if (!z) return 0;
  const uniq = (v) => [...new Set((Array.isArray(v) ? v : v == null ? [] : [v]).filter((s) => typeof s === 'string' && s.trim()))];
  return uniq(z.manufacturerName).length * uniq(z.productId).length;
}

function pickPublishDir(explicit) {
  const cands = [explicit, process.env.HOMEY_PUBLISH_DIR, path.join(os.tmpdir(), 'homey-publish-temp')].filter(Boolean);
  return cands.find((c) => fs.existsSync(path.join(c, 'app.json'))) || null;
}

/** Status of one measure against its limit. */
function grade(value, limit, warnPct, failPct) {
  if (value == null || !Number.isFinite(value) || !(limit > 0)) return { status: 'skipped', pct: null };
  const pct = (value / limit) * 100;
  return { status: pct >= failPct ? 'fail' : pct >= warnPct ? 'warn' : 'ok', pct: Math.round(pct * 10) / 10 };
}

function measureUpload(dir) {
  if (!dir) return {};
  let bytes = 0; let files = 0;
  walk(dir, (_p, s) => { bytes += s; files += 1; });
  const out = { payload_mb: bytes / MB, payload_files: files, _publishDir: dir };
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'app.json'), 'utf8'));
    out.upload_app_json_mb = Buffer.byteLength(JSON.stringify(manifest)) / MB;
    out.zigbee_combos = (manifest.drivers || []).reduce((s, d) => s + comboCount(d), 0);
    out.drivers = (manifest.drivers || []).length;
  } catch { /* unreadable manifest: skipped */ }
  const tar = spawnSync('tar', ['-cf', '-', '-C', dir, '.'], { maxBuffer: 1024 * MB });
  if (tar.status === 0 && tar.stdout) out.archive_gz_mb = zlib.gzipSync(tar.stdout, { level: 6 }).length / MB;
  return out;
}

/** Without a prepared dir, reuse publish-size-gate's projection (what prepare-publish would upload). */
function measureProjectedAppJson() {
  const gate = path.join(ROOT, 'scripts', 'ci', 'publish-size-gate.cjs');
  if (!fs.existsSync(gate)) return {};
  const r = spawnSync(process.execPath, [gate, '--json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * MB });
  try {
    const txt = r.stdout || '';
    const j = JSON.parse(txt.slice(txt.indexOf('{')));
    const checks = j.checks || [];
    const c = [/Projected upload app\.json/i, /Build app\.json/i, /Root app\.json/i].map((re) => checks.find((x) => re.test(x.name))).find(Boolean);
    return c ? { upload_app_json_mb: c.mb, _appJsonFrom: c.name } : {};
  } catch { return {}; }
}

function measureHeap() {
  const script = path.join(ROOT, 'scripts', 'perf', 'boot-heap.js');
  const out = {};
  if (fs.existsSync(script)) {
    const r = spawnSync(process.execPath, ['--expose-gc', script], { cwd: ROOT, encoding: 'utf8', timeout: 180000, maxBuffer: 64 * MB });
    const m = /heap=([\d.]+)MB/.exec(`${r.stdout || ''}${r.stderr || ''}`);
    if (m) out.boot_heap_mb = Number(m[1]);
  }
  // Every lazy data file parsed at once, in a fresh process so this script's own heap does not count.
  const probe = `
    const fs=require('fs'),p=require('path');global.gc&&gc();const h0=process.memoryUsage().heapUsed;const keep=[];
    for (const f of ${JSON.stringify(['lib/zigbee/data/unknown-dp-catalog.json', 'lib/tuya/fingerprints.json'])}) { try { keep.push(JSON.parse(fs.readFileSync(f,'utf8'))); } catch(e){} }
    for (const d of ${JSON.stringify(['lib/zigbee/data/dp-shards', 'lib/tuya/fp-shards'])}) { let l=[]; try{l=fs.readdirSync(d)}catch(e){}
      for (const f of l) if (f.endsWith('.json')) { try { keep.push(JSON.parse(fs.readFileSync(p.join(d,f),'utf8'))); } catch(e){} } }
    global.gc&&gc();console.log('DATA='+((process.memoryUsage().heapUsed-h0)/1048576).toFixed(2), keep.length);`;
  const r2 = spawnSync(process.execPath, ['--expose-gc', '-e', probe], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
  const d = /DATA=([\d.]+)/.exec(r2.stdout || '');
  if (d && out.boot_heap_mb != null) out.worst_data_heap_mb = out.boot_heap_mb + Number(d[1]);
  return out;
}

function measureRepoFiles() {
  const out = {};
  let maxWf = 0;
  const wfDir = path.join(ROOT, '.github', 'workflows');
  try { for (const f of fs.readdirSync(wfDir)) if (/\.ya?ml$/.test(f)) maxWf = Math.max(maxWf, fs.statSync(path.join(wfDir, f)).size); } catch { /* none */ }
  out.workflow_file_kb = maxWf / 1024;
  const ls = spawnSync('git', ['ls-files', '-z'], { cwd: ROOT, maxBuffer: 256 * MB });
  if (ls.status === 0) {
    let max = 0; let maxPath = '';
    for (const f of ls.stdout.toString().split('\0')) {
      if (!f) continue;
      try { const s = fs.statSync(path.join(ROOT, f)).size; if (s > max) { max = s; maxPath = f; } } catch { /* deleted in tree */ }
    }
    out.tracked_file_mb = max / MB; out._largestTracked = maxPath;
  }
  return out;
}

function ghApi(p) {
  const r = spawnSync('gh', ['api', p], { encoding: 'utf8', timeout: 30000 });
  if (r.status !== 0) return null;
  try { return JSON.parse(r.stdout); } catch { return null; }
}

function measureOnline() {
  const repo = process.env.GITHUB_REPOSITORY || 'dlnraja/com.tuya.zigbee';
  const out = {};
  const cache = ghApi(`repos/${repo}/actions/cache/usage`);
  if (cache) { out.gha_cache_gb = cache.active_caches_size_in_bytes / 1e9; out._cacheEntries = cache.active_caches_count; }
  const info = ghApi(`repos/${repo}`);
  if (info && Number.isFinite(info.size)) out.repo_size_gb = (info.size * 1024) / 1e9;
  const rl = ghApi('rate_limit');
  if (rl && rl.resources && rl.resources.core) out.github_core_used_pct = (rl.resources.core.used / rl.resources.core.limit) * 100;
  return out;
}

/** npm cache key file must match the lockfile's dependency hash (stale = more downloads, never wrong). */
function npmCacheKeyState() {
  try {
    const k = require('./npm-cache-key');
    return k.check(ROOT);
  } catch { return null; }
}

/** A limit can follow the value the workflow really uses (e.g. the combos cap owned by P3024b). */
function resolveLimit(def, root = ROOT) {
  if (def && def.limitFrom && def.limitFrom.workflow && def.limitFrom.env) {
    try {
      const yml = fs.readFileSync(path.join(root, def.limitFrom.workflow), 'utf8');
      const m = new RegExp(`${def.limitFrom.env}\\s*:\\s*["']?(\\d+(?:\\.\\d+)?)`).exec(yml);
      if (m) return Number(m[1]);
    } catch { /* fall back to the static limit */ }
  }
  return def.limit;
}

function buildReport(measures, cfg, root = ROOT) {
  const warnPct = Number(cfg.warnPct) || 80;
  const failPct = Number(cfg.failPct) || 90;
  const rows = [];
  for (const [id, def] of Object.entries(cfg.limits || {})) {
    const value = measures[id];
    const limit = resolveLimit(def, root);
    // A cap that the publish compactor fills on purpose (combos) carries its own thresholds.
    const g = grade(value, limit, Number(def.warnPct) || warnPct, Number(def.failPct) || failPct);
    rows.push({ id, value: value == null ? null : Math.round(value * 100) / 100, limit, kind: def.kind, pct: g.pct, status: g.status, marginPct: g.pct == null ? null : Math.round((100 - g.pct) * 10) / 10, source: def.source });
  }
  return { rows, warnPct, failPct, failing: rows.filter((r) => r.status === 'fail').map((r) => r.id), warning: rows.filter((r) => r.status === 'warn').map((r) => r.id) };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cfg = JSON.parse(fs.readFileSync(args.config, 'utf8'));
  const mode = args.block ? 'block' : (process.env.PLATFORM_BUDGET_MODE || cfg.mode || 'report');
  const dir = pickPublishDir(args.publishDir);
  const measures = Object.assign({}, dir ? measureUpload(dir) : measureProjectedAppJson(), measureHeap(), measureRepoFiles(), args.online ? measureOnline() : {});
  const report = buildReport(measures, cfg);
  report.mode = mode;
  report.info = { publishDir: dir, drivers: measures.drivers, payloadFiles: measures.payload_files, largestTracked: measures._largestTracked, cacheEntries: measures._cacheEntries, appJsonFrom: measures._appJsonFrom || (dir ? 'prepared app.json' : null), npmCacheKey: npmCacheKeyState() };
  report.at = new Date().toISOString();
  if (args.out) {
    fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
    fs.writeFileSync(args.out, `${JSON.stringify(report, null, 2)}\n`);
  }
  // P3034: workflow-command warnings go BEFORE the report so --json stdout stays one parseable JSON document
  // (bastien-home Node 22 run 40181886652: '::warning' after the JSON broke JSON.parse in CI only).
  if (process.env.GITHUB_ACTIONS) for (const id of report.failing) console.log(`::warning title=platform budget::${id} at or above ${report.failPct}% of its limit`);
  if (args.json) { console.log(JSON.stringify(report, null, 2)); } else {
    for (const r of report.rows) console.log(`[platform-budget] ${r.status.toUpperCase().padEnd(7)} ${r.id.padEnd(22)} ${r.value == null ? '-' : r.value} / ${r.limit}${r.pct == null ? '' : ` (${r.pct}%)`}`);
    console.log(`[platform-budget] mode=${mode} warn=${report.warnPct}% fail=${report.failPct}% failing=${report.failing.join(',') || 'none'}`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const md = ['### Platform budget (P3026)', '', '| limit | value | max | used | status |', '|---|---|---|---|---|',
      ...report.rows.map((r) => `| ${r.id} | ${r.value == null ? '-' : r.value} | ${r.limit} | ${r.pct == null ? '-' : `${r.pct}%`} | ${r.status} |`)].join('\n');
    try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`); } catch { /* no summary */ }
  }
  process.exitCode = mode === 'block' && report.failing.length ? 1 : 0;
}

if (require.main === module) main();
module.exports = { grade, comboCount, buildReport, resolveLimit, parseArgs, pickPublishDir };
