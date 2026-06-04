#!/usr/bin/env node
// scripts/security/file-integrity-check.js
// Verifies that critical files exist, are not empty, not corrupted, and pass integrity checks.
// Exit 1 if any critical file is missing or invalid — run in CI pre-publish gate.
'use strict';

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.cwd();

// ─── Critical files that must ALWAYS exist and be non-empty ──────────────────
const CRITICAL_FILES = [
  // Core app files
  { path: 'app.json',           minBytes: 10000, validate: 'json',    desc: 'App manifest' },
  { path: 'app.js',             minBytes: 1000,  validate: 'none',    desc: 'App entry point' },
  { path: 'package.json',       minBytes: 200,   validate: 'json',    desc: 'NPM manifest' },
  // Athom required
  { path: 'README.txt',         minBytes: 100,   validate: 'none',    desc: 'Athom Store description (EN)' },
  { path: '.homeyignore',       minBytes: 10,    validate: 'none',    desc: 'Homey publish ignore rules' },
  { path: '.homeyplugins.json', minBytes: 2,     validate: 'json',    desc: 'Homey plugins config' },
  // Assets
  { path: 'assets/icon.svg',    minBytes: 100,   validate: 'svg',     desc: 'App icon' },
  // Git & project
  { path: '.gitignore',         minBytes: 100,   validate: 'none',    desc: 'Git ignore rules' },
  // Optional but protected
  { path: 'README.md',          minBytes: 500,   validate: 'none',    desc: 'GitHub README' },
];

// ─── app.json must have these fields ─────────────────────────────────────────
const APP_JSON_REQUIRED_FIELDS = ['id', 'version', 'sdk', 'name', 'description', 'drivers'];

// ─── Size limits ─────────────────────────────────────────────────────────────
const APP_JSON_MAX_BYTES = 5 * 1024 * 1024; // 5MB — Athom server limit
const APP_JSON_WARN_BYTES = 4 * 1024 * 1024; // 4MB — warn threshold

// ─── Validators ──────────────────────────────────────────────────────────────
function validateJSON(fp, content) {
  try {
    const obj = JSON.parse(content);
    return { ok: true, obj };
  } catch (e) {
    return { ok: false, error: 'Invalid JSON: ' + e.message };
  }
}

function validateSVG(content) {
  if (!content.includes('<svg')) return { ok: false, error: 'Missing <svg> tag' };
  return { ok: true };
}

// ─── Main ────────────────────────────────────────────────────────────────────
let errors = 0;
let warnings = 0;
const report = [];

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║           FILE INTEGRITY CHECK                               ║');
console.log('╚══════════════════════════════════════════════════════════════╝');

for (const def of CRITICAL_FILES) {
  const fp = path.join(ROOT, def.path);
  const label = def.path.padEnd(28);

  if (!fs.existsSync(fp)) {
    console.error(`❌ MISSING   ${label} — ${def.desc}`);
    errors++;
    continue;
  }

  const stat = fs.statSync(fp);
  if (stat.size < def.minBytes) {
    console.error(`❌ EMPTY     ${label} — ${stat.size} bytes (min: ${def.minBytes})`);
    errors++;
    continue;
  }

  const content = fs.readFileSync(fp, 'utf8');

  if (def.validate === 'json') {
    const res = validateJSON(fp, content);
    if (!res.ok) {
      console.error(`❌ CORRUPT   ${label} — ${res.error}`);
      errors++;
      continue;
    }
    // Extra checks for app.json
    if (def.path === 'app.json') {
      const app = res.obj;
      // Required fields
      for (const field of APP_JSON_REQUIRED_FIELDS) {
        if (!(field in app)) {
          console.error(`❌ MISSING_FIELD app.json — required field '${field}' missing`);
          errors++;
        }
      }
      // Size check (raw file as stored in git)
      const rawSize = Buffer.byteLength(content, 'utf8');
      const compactSize = Buffer.byteLength(JSON.stringify(app), 'utf8');
      if (compactSize > APP_JSON_MAX_BYTES) {
        console.error(`❌ TOO_LARGE  app.json — compact size ${(compactSize/1024/1024).toFixed(2)}MB > 5MB limit`);
        errors++;
      } else if (compactSize > APP_JSON_WARN_BYTES) {
        console.warn(`⚠️  WARN_SIZE app.json — compact ${(compactSize/1024/1024).toFixed(2)}MB approaching 5MB limit`);
        warnings++;
      }
      // Driver count sanity
      if (!Array.isArray(app.drivers) || app.drivers.length === 0) {
        console.error('❌ NO_DRIVERS app.json — drivers array is empty or missing');
        errors++;
      }
      // api field check
      if (app.api && typeof app.api === 'object') {
        console.log(`ℹ️  app.json — api field present (getDevices, replaceDevice) — triggers thorough Athom review`);
      }
    }
  } else if (def.validate === 'svg') {
    const res = validateSVG(content);
    if (!res.ok) {
      console.error(`❌ CORRUPT   ${label} — ${res.error}`);
      errors++;
      continue;
    }
  }

  const sizeMB = (stat.size / 1024 / 1024).toFixed(3);
  const sizeStr = stat.size > 1024 * 100 ? sizeMB + 'MB' : stat.size + 'B';
  console.log(`✅ OK        ${label} — ${sizeStr}`);
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log('');
if (errors > 0) {
  console.error(`╔══════════════════════════════════════════════════════════════╗`);
  console.error(`║  ❌ FILE INTEGRITY FAILED — ${errors} error(s), ${warnings} warning(s)          ║`);
  console.error(`╚══════════════════════════════════════════════════════════════╝`);
  process.exit(1);
} else {
  const warnStr = warnings > 0 ? ` (${warnings} warning(s))` : '';
  console.log(`╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║  ✅ FILE INTEGRITY PASSED${warnStr.padEnd(36)}║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝`);
  process.exit(0);
}
