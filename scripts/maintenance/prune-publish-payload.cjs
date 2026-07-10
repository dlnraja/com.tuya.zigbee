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

  console.log(`[prune-publish-payload] Removed ${removed.count} item(s), ${toMB(removed.bytes)} MB`);
  for (const sample of removed.samples) {
    console.log(`[prune-publish-payload]   - ${sample}`);
  }
}

main();
