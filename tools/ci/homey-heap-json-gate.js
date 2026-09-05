'use strict';

/**
 * homey-heap-json-gate.js — prevent Homey Pro ~64MB heap regressions from huge JSON.
 *
 * P148/P156 lesson: LiveData overlay + giant in-bundle JSONParse can OOM Homey.
 * Naive "any data/*.json > 2MB fail" is WRONG — mfs_db is large but .homeyignore'd
 * and must not be loaded wholesale into Homey settings.
 *
 * Rules:
 *  - drivers/ | assets/ | settings/ : FAIL if any .json > 2MB
 *  - data/ : FAIL if .json > 2MB AND not listed in .homeyignore (would ship in app)
 *  - Always WARN for files > 2MB even if ignored
 *
 * Usage: node tools/ci/homey-heap-json-gate.js [--json]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const MAX_BYTES = 2 * 1024 * 1024;
const JSON_MODE = process.argv.includes('--json');

function loadHomeyIgnore() {
  const p = path.join(ROOT, '.homeyignore');
  if (!fs.existsSync(p)) return new Set();
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  const set = new Set();
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    set.add(t.replace(/\\/g, '/'));
  }
  return set;
}

function isIgnored(rel, ignoreSet) {
  const n = rel.replace(/\\/g, '/');
  if (ignoreSet.has(n)) return true;
  for (const pat of ignoreSet) {
    if (pat.includes('*')) {
      // simple **/*.ext or path*
      const re = new RegExp(
        `^${pat.replace(/\./g, '\\.').replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*')}$`,
      );
      if (re.test(n)) return true;
    } else if (n === pat || n.startsWith(`${pat}/`)) {
      return true;
    }
  }
  return false;
}

function walkJson(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    let st;
    try {
      st = fs.statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '.git') continue;
      walkJson(full, out);
    } else if (name.endsWith('.json')) {
      out.push({ full, size: st.size });
    }
  }
  return out;
}

function main() {
  const ignore = loadHomeyIgnore();
  const strictDirs = ['drivers', 'assets', 'settings'].map((d) => path.join(ROOT, d));
  const dataDir = path.join(ROOT, 'data');

  const failures = [];
  const warnings = [];

  for (const dir of strictDirs) {
    for (const f of walkJson(dir)) {
      if (f.size <= MAX_BYTES) continue;
      const rel = path.relative(ROOT, f.full).replace(/\\/g, '/');
      failures.push({
        file: rel,
        mb: +(f.size / 1024 / 1024).toFixed(2),
        reason: 'json_in_drivers_assets_settings_over_2mb',
      });
    }
  }

  for (const f of walkJson(dataDir)) {
    if (f.size <= MAX_BYTES) continue;
    const rel = path.relative(ROOT, f.full).replace(/\\/g, '/');
    const ignored = isIgnored(rel, ignore);
    warnings.push({ file: rel, mb: +(f.size / 1024 / 1024).toFixed(2), ignored });
    if (!ignored) {
      failures.push({
        file: rel,
        mb: +(f.size / 1024 / 1024).toFixed(2),
        reason: 'large_data_json_not_homeyignored_would_ship',
      });
    }
  }

  const summary = {
    timestamp: new Date().toISOString(),
    maxMb: 2,
    failures,
    warnings,
    ok: failures.length === 0,
    note: 'LiveDataUpdater caps are separate (settings overlay ≤~180KB). Do not load full mfs_db into Homey settings.',
  };

  if (JSON_MODE) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log('homey-heap-json-gate: max', summary.maxMb, 'MB');
    for (const w of warnings) {
      console.log(`WARN ${w.file} ${w.mb}MB ignored=${w.ignored}`);
    }
    for (const f of failures) {
      console.log(`FAIL ${f.file} ${f.mb}MB (${f.reason})`);
    }
    console.log(summary.ok ? 'OK' : `FAILED (${failures.length})`);
  }

  process.exit(summary.ok ? 0 : 1);
}

main();
