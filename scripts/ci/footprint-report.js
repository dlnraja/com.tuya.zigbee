#!/usr/bin/env node
'use strict';
/**
 * Footprint report (P2830d): ROM (payload / app.json / lib / drivers / node_modules / duplicates),
 * RAM (module-load heap upper bound via scripts/perf/boot-heap.js) and CPU-ish static signals
 * (setInterval / process.memoryUsage call sites) against config/footprint-budgets.json.
 * Warn-only: exit code is always 0. Writes reports/footprint/latest.json and a Markdown table to
 * $GITHUB_STEP_SUMMARY.
 *
 *   node scripts/ci/footprint-report.js [publishDir] [--no-boot] [--budgets file]
 * publishDir defaults to <tmp>/homey-publish-temp (prepare-publish output); falls back to .homeybuild, then repo root.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const MB = 1024 * 1024;

function walk(dir, fn) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, fn);
    else if (e.isFile()) { let s; try { s = fs.statSync(p).size; } catch { continue; } fn(p, s); }
  }
}

function dirStats(dir) {
  let bytes = 0; let files = 0;
  walk(dir, (_p, s) => { bytes += s; files += 1; });
  return { bytes, files };
}

function duplicateAssetBytes(driversDir) {
  const seen = new Map(); let dup = 0; let dupFiles = 0;
  walk(driversDir, (p, s) => {
    if (!/\.(png|svg|html)$/i.test(p)) return;
    const h = crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex');
    if (seen.has(h)) { dup += s; dupFiles += 1; } else seen.set(h, p);
  });
  return { bytes: dup, files: dupFiles };
}

function countSites(dirs, re) {
  let n = 0;
  for (const d of dirs) {
    walk(d, (p) => { if (/\.js$/.test(p)) n += (fs.readFileSync(p, 'utf8').match(re) || []).length; });
  }
  return n;
}

function pickRoot(arg) {
  const cands = [arg, path.join(os.tmpdir(), 'homey-publish-temp'), path.join(ROOT, '.homeybuild'), ROOT].filter(Boolean);
  return cands.find((c) => fs.existsSync(path.join(c, 'app.json'))) || ROOT;
}

function measure(root, { boot = true } = {}) {
  const sub = (n) => dirStats(path.join(root, n));
  const total = dirStats(root);
  const appJson = (() => { try { return fs.statSync(path.join(root, 'app.json')).size; } catch { return 0; } })();
  const dup = duplicateAssetBytes(path.join(root, 'drivers'));
  const m = {
    root,
    payloadMB: total.bytes / MB, payloadFiles: total.files,
    appJsonMB: appJson / MB,
    libMB: sub('lib').bytes / MB, driversMB: sub('drivers').bytes / MB,
    nodeModulesMB: sub('node_modules').bytes / MB, dataMB: sub('data').bytes / MB,
    duplicateAssetMB: dup.bytes / MB, duplicateAssetFiles: dup.files,
    setIntervalSites: countSites([path.join(root, 'lib'), path.join(root, 'drivers')], /\bsetInterval\s*\(/g),
    memoryUsageSites: countSites([path.join(root, 'lib'), path.join(root, 'drivers')], /process\.memoryUsage\s*\(/g),
  };
  if (boot) {
    const out = path.join(os.tmpdir(), `boot-heap-${process.pid}.json`);
    const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'perf', 'boot-heap.js'), '--out', out], { cwd: ROOT, encoding: 'utf8', timeout: 240000 });
    try { const j = JSON.parse(fs.readFileSync(out, 'utf8')); m.bootHeapMB = j.heapUsedMB; m.bootWallMs = j.wallMs; m.bootModules = j.modulesRequested; } catch { m.bootHeapMB = null; m.bootNote = `boot-heap unavailable (${r.status})`; }
    try { fs.rmSync(out, { force: true }); } catch { /* ignore */ }
  }
  return m;
}

function evaluate(m, budgets) {
  const rows = [];
  for (const [k, limit] of Object.entries(budgets || {})) {
    const v = m[k];
    if (v == null) { rows.push({ key: k, value: null, limit, ok: true, note: 'not measured' }); continue; }
    rows.push({ key: k, value: Number(Number(v).toFixed(2)), limit, ok: v <= limit });
  }
  return rows;
}

function main() {
  const args = process.argv.slice(2);
  const bi = args.indexOf('--budgets');
  const budgetFile = bi >= 0 ? args[bi + 1] : path.join(ROOT, 'config', 'footprint-budgets.json');
  const pos = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--budgets');
  const root = pickRoot(pos[0]);
  const cfg = JSON.parse(fs.readFileSync(budgetFile, 'utf8'));
  const m = measure(root, { boot: !args.includes('--no-boot') });
  const rows = evaluate(m, cfg.budgets);
  const over = rows.filter((r) => !r.ok);
  const lines = ['### Footprint report (warn-only)', '', `Root: \`${root}\``, '', '| metric | value | budget | |', '|---|---:|---:|---|',
    ...rows.map((r) => `| ${r.key} | ${r.value == null ? 'n/a' : r.value} | ${r.limit} | ${r.ok ? 'ok' : 'OVER'} |`)];
  console.log(lines.join('\n'));
  over.forEach((r) => console.log(`::warning::footprint budget ${r.key}=${r.value} > ${r.limit} (warn-only)`));
  try {
    fs.mkdirSync(path.join(ROOT, 'reports', 'footprint'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, 'reports', 'footprint', 'latest.json'), JSON.stringify({ at: new Date().toISOString(), measured: m, rows }, null, 2) + '\n');
  } catch { /* reporting only */ }
  if (process.env.GITHUB_STEP_SUMMARY) { try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n'); } catch { /* ignore */ } }
}

if (require.main === module) main();
module.exports = { measure, evaluate, dirStats };
