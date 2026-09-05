#!/usr/bin/env node
'use strict';

/**
 * build-gmail-unique-fps.js
 *
 * Collect Tuya-like manufacturer fingerprints from diagnostic artifacts into
 * `.github/state/gmail-unique-fps.json` for sacred-couple / driver cross-ref.
 *
 * Sources (first-available merge):
 *   - .github/state/diagnostics-report.json
 *   - diagnostics/summary.json
 *   - .github/state/homey-device-report.json
 *   - existing .github/state/gmail-unique-fps.json (retain prior)
 *
 * Usage:
 *   node tools/ci/build-gmail-unique-fps.js
 *   node tools/ci/build-gmail-unique-fps.js --json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, '.github', 'state', 'gmail-unique-fps.json');
const JSON_MODE = process.argv.includes('--json');
const TUYA_RE = /_T[YZE][A-Z0-9]{0,5}_[A-Za-z0-9]+|_TYST1[12]_[A-Za-z0-9]+|TUYATEC[A-Za-z0-9_-]+/gi;

const SOURCES = [
  path.join(ROOT, '.github', 'state', 'diagnostics-report.json'),
  path.join(ROOT, 'diagnostics', 'summary.json'),
  path.join(ROOT, '.github', 'state', 'homey-device-report.json'),
  path.join(ROOT, '.github', 'state', 'gmail-crash-patterns.json'),
];

function readJson(p) {
  try {
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function addFp(set, value) {
  if (typeof value !== 'string') return;
  const m = value.match(TUYA_RE);
  if (!m) return;
  for (const fp of m) set.add(fp);
}

function walk(node, set, depth = 0) {
  if (depth > 12 || node == null) return;
  if (typeof node === 'string') {
    addFp(set, node);
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) walk(item, set, depth + 1);
    return;
  }
  if (typeof node !== 'object') return;
  for (const [k, v] of Object.entries(node)) {
    if (/^(fp|mfr|manufacturerName|manufacturerId|fingerprint)$/i.test(k) && typeof v === 'string') {
      addFp(set, v);
    }
    if (k === 'unmatchedFPs' && Array.isArray(v)) {
      for (const u of v) {
        if (typeof u === 'string') addFp(set, u);
        else if (u && typeof u === 'object') {
          addFp(set, u.fp || u.mfr || u.manufacturerName || '');
        }
      }
      continue;
    }
    walk(v, set, depth + 1);
  }
}

function main() {
  const fps = new Set();
  const used = [];

  const prior = readJson(OUT);
  if (prior && Array.isArray(prior.fps)) {
    prior.fps.forEach((fp) => addFp(fps, fp));
    used.push('gmail-unique-fps.json(prior)');
  }

  for (const src of SOURCES) {
    const data = readJson(src);
    if (!data) continue;
    const before = fps.size;
    walk(data, fps);
    if (fps.size > before) used.push(path.relative(ROOT, src).replace(/\\/g, '/'));
  }

  const list = [...fps].sort((a, b) => a.localeCompare(b));
  const byPrefix = {};
  for (const fp of list) {
    const m = fp.match(/^_T([A-Z0-9]+)_/i);
    const prefix = m ? m[1].toUpperCase() : '_other';
    if (!byPrefix[prefix]) byPrefix[prefix] = [];
    byPrefix[prefix].push(fp);
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const payload = {
    timestamp: new Date().toISOString(),
    source: used.length ? used.join('+') : 'empty',
    totalUnique: list.length,
    byPrefix,
    fps: list,
  };
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify({ ok: true, totalUnique: list.length, sources: used, out: path.relative(ROOT, OUT) }) + '\n');
  } else {
    console.log(`[build-gmail-unique-fps] wrote ${list.length} FPs → ${path.relative(ROOT, OUT)}`);
    console.log(`[build-gmail-unique-fps] sources: ${used.join(', ') || '(none)'}`);
  }

  process.exit(0);
}

main();
