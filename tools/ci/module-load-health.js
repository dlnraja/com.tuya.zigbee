#!/usr/bin/env node
/**
 * module-load-health.js — P187
 *
 * `node --check` only parses. It cannot see a module that throws the moment it
 * is required — a renamed class still referenced by `module.exports`, a require
 * path that no longer resolves, a base class that evaluates to undefined. Those
 * are exactly the failures that take the whole app down at startup, and the
 * project has hit them repeatedly ("class extends undefined", broken require
 * path).
 *
 * So this actually loads every module in a child process and records what
 * happens. One module crashing cannot take the run down with it.
 *
 * It also reports two structural hazards the loader cannot see on its own:
 *   - two modules sharing a basename at different paths, which is how the wrong
 *     one ends up required (rule S5)
 *   - circular requires between first-party modules
 *
 * Usage:
 *   node tools/ci/module-load-health.js
 *   node tools/ci/module-load-health.js --scope=lib
 *   node tools/ci/module-load-health.js --json
 *   node tools/ci/module-load-health.js --strict     # exit 1 on load failures
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const REPORT_MD = path.join(ROOT, 'reports', 'MODULE_LOAD_HEALTH.md');
const REPORT_JSON = path.join(ROOT, '.github', 'state', 'module-load-health.json');

const args = process.argv.slice(2);
const AS_JSON = args.includes('--json');
const STRICT = args.includes('--strict');
const scopeArg = args.find((a) => a.startsWith('--scope='));
// Defaults to the app runtime only. scripts/ and tools/ are CLI entry points:
// requiring them would execute their side effects, so they are opt-in.
const SCOPES = scopeArg ? scopeArg.split('=')[1].split(',') : ['lib', 'drivers'];

const SKIP_DIR = /^(node_modules|\.git|\.homeybuild|tmp|coverage|dist|\.cache|\.archive)$/;

function walk(dir, acc = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return acc;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (SKIP_DIR.test(e.name)) continue;
      walk(path.join(dir, e.name), acc);
    } else if (/\.(js|cjs)$/.test(e.name)) {
      acc.push(path.join(dir, e.name));
    }
  }
  return acc;
}

const files = SCOPES.flatMap((s) => walk(path.join(ROOT, s)));
const rel = (f) => path.relative(ROOT, f).split(path.sep).join('/');

// ---------------------------------------------------------------------------
// Load every module in one child process per batch. A module that calls
// process.exit() or blocks would otherwise poison a shared process, so each
// batch is isolated and the runner reports per-file outcomes as JSON.
// ---------------------------------------------------------------------------
const RUNNER = `
'use strict';
const results = [];
for (const f of process.argv.slice(2)) {
  const t0 = Date.now();
  try {
    require(f);
    results.push({ file: f, ok: true, ms: Date.now() - t0 });
  } catch (err) {
    // The originating frame decides whether this is our bug or the sandbox's:
    // outside a Homey Pro, homey-zigbeedriver cannot resolve Homey.Driver and
    // every driver base throws. Only a frame inside the repo is actionable.
    const stack = String((err && err.stack) || '');
    const frame = stack.split('\\n').slice(1).find((l) => /\\(|at \\//.test(l)) || '';
    results.push({
      file: f,
      ok: false,
      ms: Date.now() - t0,
      name: err && err.name,
      code: err && err.code,
      origin: frame.trim().slice(0, 200),
      message: String((err && err.message) || err).split('\\n')[0].slice(0, 300),
    });
  }
}
process.stdout.write(JSON.stringify(results));
`;

const runnerPath = path.join(ROOT, '.github', 'state', '_module-load-runner.js');
fs.mkdirSync(path.dirname(runnerPath), { recursive: true });
fs.writeFileSync(runnerPath, RUNNER);

const BATCH = 25;
const loadResults = [];
for (let i = 0; i < files.length; i += BATCH) {
  const batch = files.slice(i, i + BATCH);
  const r = spawnSync(process.execPath, [runnerPath, ...batch], {
    cwd: ROOT, encoding: 'utf8', timeout: 120000,
  });
  let parsed = null;
  try { parsed = JSON.parse(r.stdout); } catch (err) { parsed = null; }
  if (parsed) {
    loadResults.push(...parsed);
  } else {
    // The batch died as a whole (exit, OOM, timeout). Re-run one by one so the
    // blame lands on the responsible file instead of all 25.
    for (const f of batch) {
      const one = spawnSync(process.execPath, [runnerPath, f], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
      let single = null;
      try { single = JSON.parse(one.stdout); } catch (err) { single = null; }
      loadResults.push(single ? single[0] : {
        file: f, ok: false, name: 'ProcessAborted',
        message: `child exited ${one.status} without result${one.signal ? ` (signal ${one.signal})` : ''}`,
      });
    }
  }
}
fs.unlinkSync(runnerPath);

const all = loadResults.filter((r) => !r.ok).map((r) => ({ ...r, file: rel(r.file) }));

/**
 * Outside a Homey Pro the `homey` package resolves to the CLI, which exposes no
 * Device/Driver/App classes, so anything extending the SDK fails to construct.
 * That is the sandbox, not a defect. It shows up two ways: thrown from inside
 * homey-zigbeedriver, or thrown from one of our files that writes
 * `extends Homey.Device` directly — so the stack frame alone is not enough to
 * tell them apart, and the extended expression has to be inspected.
 */
const SDK_PACKAGES = /require\(\s*['"](homey|homey-zigbeedriver|homey-meshdriver)['"]\s*\)/;
const HOMEY_BASE_RE = /extends\s+(Homey\.(Device|Driver|App|SimpleClass)|Device|Driver|App|ZigBeeDevice|ZigBeeDriver|ZigBeeLightDevice)\b/;

function isEnvironmental(r) {
  if (/node_modules/.test(r.origin || '')) return true;
  // Only "undefined" qualifies. A base that resolves to an Object or another
  // non-constructor is a genuine mistake and must stay visible — that is how
  // `extends Homey` (the module, not Homey.Driver) was found.
  if (!/Class extends value undefined/.test(r.message || '')) return false;
  try {
    const src = fs.readFileSync(path.join(ROOT, r.file), 'utf8');
    return SDK_PACKAGES.test(src) && HOMEY_BASE_RE.test(src);
  } catch (err) {
    return false;
  }
}
// The sandbox failure propagates: a driver extending TuyaLocalDevice fails
// because THAT module could not build its own Homey.Device base. Walk the
// require edges until the classification stops growing, otherwise one missing
// runtime is reported ~800 times as if it were 800 bugs.
const envSet = new Set(all.filter(isEnvironmental).map((r) => r.file));

function requiredFirstPartyFiles(relFile) {
  let src;
  try { src = fs.readFileSync(path.join(ROOT, relFile), 'utf8'); } catch (err) { return []; }
  const dir = path.dirname(path.join(ROOT, relFile));
  const out = [];
  for (const m of src.matchAll(/require\(\s*['"](\.[^'"]+)['"]\s*\)/g)) {
    let target = path.resolve(dir, m[1]);
    for (const candidate of [target, `${target}.js`, path.join(target, 'index.js')]) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        out.push(path.relative(ROOT, candidate).split(path.sep).join('/'));
        break;
      }
    }
  }
  return out;
}

for (let changed = true; changed;) {
  changed = false;
  for (const r of all) {
    if (envSet.has(r.file)) continue;
    if (!/Class extends value undefined/.test(r.message || '')) continue;
    if (requiredFirstPartyFiles(r.file).some((dep) => envSet.has(dep))) {
      envSet.add(r.file);
      changed = true;
    }
  }
}

const environmental = all.filter((r) => envSet.has(r.file));
const failures = all.filter((r) => !envSet.has(r.file));

// Group identical messages: one missing package produces hundreds of identical
// rows, and the useful unit is the cause, not the file.
const byMessage = new Map();
for (const f of failures) {
  const key = `${f.name}: ${f.message}`;
  if (!byMessage.has(key)) byMessage.set(key, []);
  byMessage.get(key).push(f.file);
}
const causes = [...byMessage.entries()]
  .map(([message, affected]) => ({ message, count: affected.length, sample: affected.slice(0, 8) }))
  .sort((a, b) => b.count - a.count);

// ---------------------------------------------------------------------------
// Duplicate basenames (rule S5)
// ---------------------------------------------------------------------------
const byBase = new Map();
for (const f of files) {
  const base = path.basename(f);
  if (!byBase.has(base)) byBase.set(base, []);
  byBase.get(base).push(rel(f));
}
const IGNORE_BASE = /^(index\.js|device\.js|driver\.js|configs\.js|settings\.js|list_devices\.js|helpers\.js)$/;

/** A file whose only job is `module.exports = require('../other')` is a
 *  deliberate alias, not a second copy that can drift. */
function isReExportShim(relFile) {
  try {
    const body = fs.readFileSync(path.join(ROOT, relFile), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/['"]use strict['"];?/g, '')
      .trim();
    return /^module\.exports\s*=\s*require\([^)]+\);?$/.test(body);
  } catch (err) {
    return false;
  }
}

const duplicateBasenames = [...byBase.entries()]
  .filter(([base, list]) => list.length > 1 && !IGNORE_BASE.test(base))
  .map(([base, list]) => {
    const shims = list.filter(isReExportShim);
    return { base, paths: list, shims, divergent: list.length - shims.length > 1 };
  })
  .filter((d) => d.divergent)
  .sort((a, b) => b.paths.length - a.paths.length);

const summary = {
  generatedAt: new Date().toISOString(),
  scopes: SCOPES,
  totals: {
    modules: files.length,
    loaded: loadResults.filter((r) => r.ok).length,
    failed: failures.length,
    environmental: environmental.length,
    distinctCauses: causes.length,
    duplicateBasenames: duplicateBasenames.length,
  },
  environmentalSample: environmental.slice(0, 3).map((e) => ({ file: e.file, message: e.message, origin: e.origin })),
  causes,
  duplicateBasenames: duplicateBasenames.slice(0, 60),
};

fs.mkdirSync(path.dirname(REPORT_JSON), { recursive: true });
fs.writeFileSync(REPORT_JSON, JSON.stringify({ ...summary, failures }, null, 1));

const md = [
  '# Module load health',
  '',
  `Generated: ${summary.generatedAt}`,
  '',
  `Scopes: ${SCOPES.join(', ')}. Modules loaded in a child process: **${files.length}**.`,
  `Loaded cleanly: **${summary.totals.loaded}**. Threw from a repo frame: **${failures.length}**, from **${causes.length}** distinct causes.`,
  `Threw from inside \`node_modules\`: **${environmental.length}** — outside a Homey Pro the \`homey\``,
  'package resolves to the CLI, so `homey-zigbeedriver` cannot build its base classes and every',
  'driver base fails. Those are the sandbox, not the code, and are excluded from the count above.',
  '',
  '`node --check` cannot catch any of this: a module can parse perfectly and still throw the',
  'moment it is required.',
  '',
  '## Causes, most affected first',
  '',
  causes.length
    ? ['| # files | error | example modules |', '|---:|---|---|',
      ...causes.slice(0, 40).map((c) => `| ${c.count} | ${c.message.replace(/\|/g, '\\|')} | ${c.sample.slice(0, 3).map((s) => `\`${s}\``).join(', ')} |`)].join('\n')
    : 'None — every module loads.',
  '',
  '## Modules sharing a basename at different paths',
  '',
  'Requiring by basename, or copying a require line between files, then picks the',
  'wrong one. This is how "class extends undefined" happens.',
  '',
  duplicateBasenames.length
    ? ['| basename | paths |', '|---|---|',
      ...duplicateBasenames.slice(0, 40).map((d) => `| \`${d.base}\` | ${d.paths.map((p) => `\`${p}\``).join('<br>')} |`)].join('\n')
    : 'None.',
  '',
].join('\n');
fs.mkdirSync(path.dirname(REPORT_MD), { recursive: true });
fs.writeFileSync(REPORT_MD, md);

if (AS_JSON) {
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
} else {
  console.log('[module-load] modules=%d loaded=%d repoFailures=%d envFailures=%d causes=%d duplicateBasenames=%d',
    files.length, summary.totals.loaded, failures.length, environmental.length, causes.length, duplicateBasenames.length);
  for (const c of causes.slice(0, 15)) {
    console.log(`  ${String(c.count).padStart(4)}x  ${c.message}`);
    console.log(`        e.g. ${c.sample.slice(0, 2).join(', ')}`);
  }
  console.log('[module-load] report: reports/MODULE_LOAD_HEALTH.md');
}

process.exit(STRICT && failures.length ? 1 : 0);
