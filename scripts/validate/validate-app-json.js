#!/usr/bin/env node
/**
 * validate-app-json.js
 * Validates app.json against Athom server requirements (not just schema).
 * Run before every push to catch Processing failed causes.
 * 
 * Based on stable-v5 vs master comparison (2026-05-28):
 * - O17: No 'icon' field in app.json
 * - O18: No *.json wildcard in .homeyignore
 * - O19: category must be string
 * - O20: No api field / homey:manager:api permission
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const errors = [];
const warnings = [];

function fail(msg) { errors.push('❌ ' + msg); }
function warn(msg) { warnings.push('⚠️  ' + msg); }
function ok(msg) { console.log('✅ ' + msg); }

console.log('=== Athom Server Requirement Validator ===\n');

// ─── 1. app.json checks ───────────────────────────────────────────────────────
const appJsonPath = path.join(ROOT, 'app.json');
if (!fs.existsSync(appJsonPath)) { fail('app.json NOT FOUND'); process.exit(1); }

const app = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// O17: No 'icon' field
if ('icon' in app) {
  fail(`O17: app.json has 'icon' field: "${app.icon}". Remove it — SDK uses assets/icon.svg hardcoded (App.js:618)`);
} else {
  ok('O17: No icon field in app.json');
}

// O19: category must be string
if (Array.isArray(app.category)) {
  fail(`O19: app.json category is an ARRAY ["${app.category.join('","')}"] — must be a STRING "appliances". Server rejects arrays.`);
} else if (typeof app.category === 'string') {
  ok(`O19: category is string: "${app.category}"`);
} else {
  fail('O19: category field missing or invalid type');
}

// O20: No api field / no homey:manager:api
if (app.api) {
  warn(`O20: app.json has 'api' field (absent in stable-v5). This may trigger longer Athom review.`);
} else {
  ok('O20: No api field in app.json');
}
if (Array.isArray(app.permissions) && app.permissions.includes('homey:manager:api')) {
  warn(`O20: homey:manager:api permission present — triggers thorough review, may delay publish`);
} else {
  ok('O20: No homey:manager:api permission');
}

// Required fields check
const required = ['id', 'version', 'sdk', 'name', 'category', 'images', 'compatibility', 'platforms', 'author'];
required.forEach(field => {
  if (!app[field]) fail(`MISSING required field: ${field}`);
  else ok(`Required field: ${field} = ${JSON.stringify(app[field]).substring(0,50)}`);
});

// ─── 2. assets/icon.svg check ────────────────────────────────────────────────
const iconPath = path.join(ROOT, 'assets', 'icon.svg');
if (!fs.existsSync(iconPath)) {
  fail('assets/icon.svg MISSING — SDK App.js:618 requires this exact path');
} else {
  const size = fs.statSync(iconPath).size;
  if (size < 100) fail(`assets/icon.svg exists but is too small (${size} bytes) — likely empty`);
  else ok(`assets/icon.svg OK (${size} bytes)`);
}

// ─── 3. README.txt check (O21) ───────────────────────────────────────────────
const readmePath = path.join(ROOT, 'README.txt');
if (!fs.existsSync(readmePath)) {
  fail('O21: README.txt MISSING — SDK App.js:1427 throws: "Missing file /README.txt". This causes Processing failed.');
} else {
  const size = fs.statSync(readmePath).size;
  if (size < 50) fail(`O21: README.txt exists but too short (${size} bytes) — must have meaningful content`);
  else ok(`O21: README.txt OK (${size} bytes)`);
}
// Optional multilingual readmes
['nl', 'de', 'fr'].forEach(lang => {
  const p = path.join(ROOT, `README.${lang}.txt`);
  if (fs.existsSync(p)) ok(`O21: README.${lang}.txt OK (${fs.statSync(p).size} bytes) — App Store ${lang.toUpperCase()}`);
  else warn(`O21: README.${lang}.txt missing — App Store will use English for ${lang.toUpperCase()}`);
});

const homeyignorePath = path.join(ROOT, '.homeyignore');
if (fs.existsSync(homeyignorePath)) {
  const content = fs.readFileSync(homeyignorePath, 'utf8');
  const lines = content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  
  // O18: No *.json wildcard
  const jsonWildcard = lines.find(l => l === '*.json' || l === '**/*.json');
  if (jsonWildcard) {
    fail(`O18: .homeyignore has dangerous wildcard: "${jsonWildcard}" — excludes runtime JSON files. Use specific paths instead.`);
  } else {
    ok('O18: No *.json wildcard in .homeyignore');
  }
  
  // O18: Check runtime JSON files are NOT explicitly excluded
  const runtimeJsonFiles = [
    'data/fingerprints.json',
    'lib/tuya/fingerprints.json',
    'driver-mapping-database.json',
    '.homeychangelog.json',
  ];
  runtimeJsonFiles.forEach(f => {
    if (lines.some(l => l === f || l === '/' + f)) {
      fail(`O18: .homeyignore explicitly excludes runtime file: ${f}`);
    }
  });
  ok('O18: Runtime JSON files not explicitly excluded');
  
  // Check *.md wildcard
  const mdWildcard = lines.find(l => l === '*.md');
  if (mdWildcard) {
    warn(`O18: .homeyignore has "*.md" wildcard — OK if README.md not required. stable-v5 does NOT use this.`);
  }
} else {
  warn('.homeyignore NOT FOUND — all files will be included in package');
}

// ─── 4. Runtime files check ───────────────────────────────────────────────────
const runtimeFiles = [
  ['data/fingerprints.json', 'DeviceFingerprintDB.js:83'],
  ['lib/tuya/fingerprints.json', 'tuya-engine/index.js:14'],
  ['driver-mapping-database.json', 'DriverMappingLoader.js'],
  ['.homeychangelog.json', 'Athom store changelog'],
  ['assets/images/small.png', 'Athom store'],
  ['assets/images/large.png', 'Athom store'],
];
runtimeFiles.forEach(([f, src]) => {
  const fp = path.join(ROOT, f);
  if (!fs.existsSync(fp)) {
    fail(`RUNTIME FILE MISSING: ${f} (required by ${src})`);
  } else {
    const kb = (fs.statSync(fp).size / 1024).toFixed(0);
    ok(`Runtime file: ${f} (${kb}KB) — ${src}`);
  }
});

// ─── 5. Version consistency check ────────────────────────────────────────────
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const cl = JSON.parse(fs.readFileSync(path.join(ROOT, '.homeychangelog.json'), 'utf8'));
  if (app.version !== pkg.version) {
    fail(`Version mismatch: app.json=${app.version} vs package.json=${pkg.version}`);
  } else {
    ok(`Version consistent: ${app.version}`);
  }
  if (!cl[app.version]) {
    warn(`No changelog entry for v${app.version} in .homeychangelog.json`);
  } else {
    ok(`Changelog entry exists for v${app.version}`);
  }
} catch(e) {
  warn('Could not check version consistency: ' + e.message);
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log('\n=== SUMMARY ===');
if (warnings.length) { console.log('\nWarnings:'); warnings.forEach(w => console.log(w)); }
if (errors.length) {
  console.log('\nErrors:');
  errors.forEach(e => console.log(e));
  console.log(`\n❌ VALIDATION FAILED: ${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(1);
} else {
  console.log(`\n✅ ALL CHECKS PASSED (${warnings.length} warning(s))`);
  console.log('   App is ready to push — should NOT cause Processing failed');
  process.exit(0);
}
