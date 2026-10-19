#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const target = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'homey-publish-temp'));
const NODE_MODULES_PRUNE_DIRS = new Set([
  '.cache',
  '.github',
  '__tests__',
  'benchmark',
  'benchmarks',
  'coverage',
  'doc',
  'docs',
  'example',
  'examples',
  'test',
  'tests',
]);
const NODE_MODULES_PRUNE_EXTENSIONS = new Set([
  '.html',
  '.map',
  '.markdown',
  '.md',
  '.ts',
  '.yaml',
  '.yml',
]);

function toMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(2);
}

function removePath(file, reason, removed) {
  if (!fs.existsSync(file)) return;
  const bytes = pathSize(file);
  fs.rmSync(file, { recursive: true, force: true });
  removed.bytes += bytes;
  removed.count++;
  if (removed.samples.length < 20) {
    removed.samples.push(`${path.relative(target, file).replace(/\\/g, '/')} (${toMB(bytes)} MB, ${reason})`);
  }
}

function pathSize(file) {
  let bytes = 0;
  const stack = [file];
  while (stack.length > 0) {
    const current = stack.pop();
    let stat;
    try {
      stat = fs.statSync(current);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(current)) {
        stack.push(path.join(current, entry));
      }
    } else if (stat.isFile()) {
      bytes += stat.size;
    }
  }
  return bytes;
}

function pruneNodeModules(root, removed) {
  const nodeModules = path.join(root, 'node_modules');
  if (!fs.existsSync(nodeModules)) return;
  const stack = [nodeModules];

  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (NODE_MODULES_PRUNE_DIRS.has(entry.name.toLowerCase())) {
          removePath(full, 'node_modules non-runtime directory', removed);
        } else {
          stack.push(full);
        }
        continue;
      }
      if (!entry.isFile()) continue;
      if (NODE_MODULES_PRUNE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        removePath(full, 'node_modules non-runtime file', removed);
      }
    }
  }
}

function pruneBackupFiles(root, removed) {
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!entry.isFile()) continue;
      if (/\.(bak|backup|tmp|old|orig|swp|swo|rej)(?:\.|$)/i.test(entry.name) || /^backup-/.test(entry.name) || /\.dedup-backup/.test(entry.name)) {
        removePath(full, 'backup/temp file', removed);
      }
    }
  }
}

/**
 * P2830d: pair/repair views a driver does not declare in app.json (e.g. the hyphenated
 * `select-driver.html` twin of `select_driver.html`) can never be opened by Homey, so they are dead
 * weight in the archive. Conservative: only drivers whose app.json entry declares that view list,
 * only `.html` files inside drivers/<id>/(pair|repair)/, and only ids that are not declared.
 */
function pruneUndeclaredViews(root, removed) {
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')); } catch { return; }
  for (const d of manifest.drivers || []) {
    for (const kind of ['pair', 'repair']) {
      if (!Array.isArray(d[kind])) continue;
      const declared = new Set(d[kind].map((v) => (v && typeof v === 'object' ? v.id : v)).filter(Boolean));
      const dir = path.join(root, 'drivers', d.id, kind);
      let files;
      try { files = fs.readdirSync(dir); } catch { continue; }
      for (const f of files) {
        if (f.endsWith('.html') && !declared.has(f.slice(0, -5))) removePath(path.join(dir, f), `undeclared ${kind} view`, removed);
      }
    }
  }
}

function main() {
  if (!fs.existsSync(target)) {
    console.error(`[prune-publish-payload] Missing publish directory: ${target}`);
    process.exit(1);
  }

  const removed = { bytes: 0, count: 0, samples: [] };
  if (process.env.HOMEY_INCLUDE_MFS_DB !== '1') {
    removePath(path.join(target, 'data', 'mfs_db.json'), 'offline enrichment cache', removed);
  }
  removePath(path.join(target, 'data', '_used_mfrs.json'), 'diagnostic manufacturer inventory', removed);
  pruneNodeModules(target, removed);
  pruneBackupFiles(target, removed);
  pruneUndeclaredViews(target, removed);

  // Prune dev artifacts
  removePath(path.join(target, 'pnpm-lock.yaml'), 'dev lockfile', removed);
  removePath(path.join(target, 'tools', 'ci', 'delete-johan-comments.sh'), 'dev tool', removed);
  removePath(path.join(target, 'tools', 'ci', 'delete-own-upstream-comments.js'), 'dev tool', removed);
  removePath(path.join(target, 'tools', 'ci', 'delete-johan-comments.js'), 'dev tool', removed);
  removePath(path.join(target, 'tools', 'ci', 'collect-johan-comments-to-delete.js'), 'dev tool', removed);
  // State files
  removePath(path.join(target, '.github', 'state', 'johan-comments-to-delete.csv'), 'dev state', removed);
  removePath(path.join(target, '.github', 'state', 'johan-comments-to-delete.json'), 'dev state', removed);
  removePath(path.join(target, '.github', 'state', 'johan-comments-deletion-report.json'), 'dev state', removed);

  console.log(`[prune-publish-payload] Removed ${removed.count} item(s), ${toMB(removed.bytes)} MB`);
  for (const sample of removed.samples) {
    console.log(`[prune-publish-payload]   - ${sample}`);
  }

  // P2885: lossless JSON minify + proven-unreferenced lib JS (load-checked, self-restoring).
  // Runs in every workflow that already calls this script; LOSSLESS_SHRINK=0 disables it.
  try {
    const shrink = path.join(__dirname, 'lossless-shrink-payload.cjs');
    if (fs.existsSync(shrink)) {
      require('child_process').spawnSync(process.execPath, [shrink, target], { stdio: 'inherit', timeout: 300000 });
    }
  } catch (e) {
    console.log(`::warning::[prune-publish-payload] lossless shrink skipped: ${e.message}`);
  }}

if (require.main === module) main();
module.exports = { pruneUndeclaredViews };
