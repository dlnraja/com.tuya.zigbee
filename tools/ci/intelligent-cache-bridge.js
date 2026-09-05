#!/usr/bin/env node
'use strict';

/**
 * intelligent-cache-bridge.js — stats / invalidate across CI cache dirs (SSOT).
 * Does not create a 5th store — aggregates existing .cache/* trees.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SSOT = path.join(ROOT, 'config', 'architecture', 'intelligent-infra.json');

function loadSsot() {
  return JSON.parse(fs.readFileSync(SSOT));
}

function dirStats(abs) {
  if (!fs.existsSync(abs)) return { path: abs, exists: false, files: 0, bytes: 0 };
  let files = 0;
  let bytes = 0;
  const walk = (d) => {
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else {
        files += 1;
        try {
          bytes += fs.statSync(p).size;
        } catch { /* ignore */ }
      }
    }
  };
  walk(abs);
  return { path: abs, exists: true, files, bytes, mb: Math.round((bytes / (1024 * 1024)) * 100) / 100 };
}

function rimraf(abs) {
  if (!fs.existsSync(abs)) return 0;
  fs.rmSync(abs, { recursive: true, force: true });
  return 1;
}

function main() {
  const ssot = loadSsot();
  const dirs = (ssot.cacheTiers?.ci_http?.dirs || []).map((d) => path.join(ROOT, d));
  const stats = process.argv.includes('--stats') || !process.argv.includes('--invalidate');
  const invalidate = process.argv.includes('--invalidate');
  const only = (() => {
    const a = process.argv.find((x) => x.startsWith('--source='));
    return a ? a.split('=')[1] : null;
  })();

  console.log('canonicalCiHttp:', ssot.canonicalCiHttp);
  console.log('deprecated:', Object.keys(ssot.deprecated || {}).join(', '));

  if (stats) {
    const rows = dirs.map(dirStats);
    console.log(JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2));
  }

  if (invalidate) {
    let n = 0;
    for (const d of dirs) {
      if (only && !d.includes(only)) continue;
      n += rimraf(d);
      console.log('invalidated', d);
    }
    console.log('removed trees:', n);
  }
}

main();
