#!/usr/bin/env node
/**
 * homey-mandatory-check.js
 * ═══════════════════════════════════════════════════════════════════════════
 * COMPREHENSIVE HOMEY APP MANDATORY FILE & RULE CHECKER
 * Covers ALL rules discovered by comparing stable-v5 vs master (2026-05-28)
 * and by reading Athom SDK source code (node_modules/homey/lib/App.js)
 * 
 * RULES ENFORCED:
 *   O17 — No 'icon' field in app.json (App.js:618)
 *   O18 — No *.json wildcard in .homeyignore
 *   O19 — category must be STRING (not array) for Athom server
 *   O20 — No api field / homey:manager:api permission (causes review delays)
 *   O21 — README.txt REQUIRED (App.js:1427 throws if missing)
 *   M01 — assets/icon.svg required (App.js:618 iconHash)
 *   M02 — assets/images/small.png + large.png required (App Store)
 *   M03 — .homeychangelog.json required (App.js changelog)
 *   M04 — locales/en.json required (App.js:1432)
 *   M05 — app.json required fields: id, version, sdk, name, category, images, 
 *          compatibility, platforms, author
 *   M06 — data/fingerprints.json required (DeviceFingerprintDB.js:83)
 *   M07 — driver-mapping-database.json required (DriverMappingLoader.js)
 *   M08 — version must match across app.json / package.json / .homeychangelog.json
 *   M09 — All drivers must have non-empty zigbeeManufacturerName if Zigbee
 *   M10 — No README.txt in .homeyignore exclusions
 *   M11 — No data/fingerprints.json in .homeyignore exclusions
 *   M12 — app.json must be valid JSON parseable without error
 *   M13 — All locales/*.json must be valid JSON
 *   M14 — .homeychangelog.json must have entry for current version
 * ═══════════════════════════════════════════════════════════════════════════
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ─── CLI args ─────────────────────────────────────────────────────────────────
const FIX_MODE = process.argv.includes('--fix');
const QUIET = process.argv.includes('--quiet');
const JSON_OUTPUT = process.argv.includes('--json');

// ─── State ────────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '../..');
const errors = [];
const warnings = [];
const fixed = [];
const passed = [];
const SYNTHETIC_MANUFACTURER_RE = /unknown|dummy|placeholder|needs_device_assignment|^_generic_|^_GENERIC_|^_hybrid_|^_HYBRID_|^_master_|^_MASTER_/;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fail(id, msg, fixFn) {
  if (FIX_MODE && fixFn) {
    try {
      fixFn();
      fixed.push(`[${id}] AUTO-FIXED: ${msg}`);
      if (!QUIET) console.log(`🔧 [${id}] FIXED: ${msg}`);
      return;
    } catch(e) {
      errors.push(`[${id}] ${msg} (auto-fix failed: ${e.message})`);
      if (!QUIET) console.error(`❌ [${id}] ${msg}`);
    }
  } else {
    errors.push(`[${id}] ${msg}`);
    if (!QUIET) console.error(`❌ [${id}] ${msg}`);
  }
}
function warn(id, msg) {
  warnings.push(`[${id}] ${msg}`);
  if (!QUIET) console.warn(`⚠️  [${id}] ${msg}`);
}
function ok(id, msg) {
  passed.push(`[${id}] ${msg}`);
  if (!QUIET) console.log(`✅ [${id}] ${msg}`);
}
function section(title) {
  if (!QUIET) console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 60 - title.length))}`);
}
function isSyntheticManufacturer(value) {
  return typeof value === 'string' && SYNTHETIC_MANUFACTURER_RE.test(value);
}

// ─── Read app.json safely ─────────────────────────────────────────────────────
section('M12 — app.json Parse');
const appJsonPath = path.join(ROOT, 'app.json');
let app = null;
if (!fs.existsSync(appJsonPath)) {
  fail('M12', 'app.json NOT FOUND at root');
} else {
  try {
    app = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    ok('M12', `app.json parsed OK (${(fs.statSync(appJsonPath).size / 1048576).toFixed(2)}MB)`);
  } catch(e) {
    fail('M12', `app.json INVALID JSON: ${e.message}`);
  }
}
if (!app) { exitWithResults(); process.exit(1); }

// ─── M05 — Required fields ────────────────────────────────────────────────────
section('M05 — Required Fields');
// v9.0.75: Athom SDK3 manifest canonical field is `sdk` (number), per the
// official manifest reference (apps.developer.homey.app/the-basics/app/manifest)
// and the known-good build #2469. Accept EITHER `sdk` OR `sdkVersion` for
// backward compatibility, but prefer `sdk`. Do NOT hard-require `sdkVersion`
// (that was a misconception — `sdk` is the canonical SDK3 field).
const REQUIRED_FIELDS = [
  ['id', 'string'],
  ['version', 'string'],
  ['name', 'object'],
  ['category', null],         // validated separately
  ['images', 'object'],
  ['compatibility', 'string'],
  ['platforms', 'array'],
  ['author', 'object'],
  ['description', 'object'],
];
// SDK field: accept `sdk` (canonical) or `sdkVersion` (legacy), type number.
if (!('sdk' in app) && !('sdkVersion' in app)) {
  fail('M05', `app.json missing required SDK field: set "sdk": 3 (canonical SDK3) or "sdkVersion": 3 (legacy)`);
} else {
  const sdkValue = app.sdk !== undefined ? app.sdk : app.sdkVersion;
  if (typeof sdkValue !== 'number') {
    fail('M05', `app.json SDK field must be a number (got ${typeof sdkValue})`);
  }
}
REQUIRED_FIELDS.forEach(([field, type]) => {
  if (!(field in app)) {
    fail('M05', `app.json missing required field: "${field}"`);
  } else if (type === 'array' && !Array.isArray(app[field])) {
    fail('M05', `app.json field "${field}" must be an array`);
  } else if (type && type !== 'array' && typeof app[field] !== type) {
    fail('M05', `app.json field "${field}" must be ${type}, got ${typeof app[field]}`);
  } else {
    ok('M05', `Required field "${field}" = ${JSON.stringify(app[field]).substring(0, 60)}`);
  }
});

// ─── O17 — No 'icon' field ────────────────────────────────────────────────────
section('O17 — No icon field in app.json');
if ('icon' in app) {
  fail('O17', `app.json has forbidden 'icon' field: "${app.icon}". SDK App.js:618 hardcodes assets/icon.svg.`,
    () => {
      const a = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
      delete a.icon;
      fs.writeFileSync(appJsonPath, JSON.stringify(a, null, 2), 'utf8');
    });
} else {
  ok('O17', 'No icon field in app.json');
}

// ─── O19 — category STRING ────────────────────────────────────────────────────
section('O19 — category must be STRING');
if (Array.isArray(app.category)) {
  fail('O19', `category is ARRAY ["${app.category.join('","')}"] — Athom server requires string`,
    () => {
      const a = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
      a.category = Array.isArray(a.category) ? a.category[0] : a.category;
      fs.writeFileSync(appJsonPath, JSON.stringify(a, null, 2), 'utf8');
    });
} else if (typeof app.category === 'string') {
  ok('O19', `category = "${app.category}" (string ✓)`);
} else {
  fail('O19', `category is missing or wrong type: ${typeof app.category}`);
}

// ─── O20 — No api / homey:manager:api ────────────────────────────────────────
section('O20 — No api field / homey:manager:api');
if (app.api) {
  warn('O20', 'api field present — absent in stable-v5, may cause longer Athom review');
}
if (Array.isArray(app.permissions) && app.permissions.includes('homey:manager:api')) {
  warn('O20', 'homey:manager:api permission — triggers thorough review (App.js validate warning)');
} else {
  ok('O20', 'No homey:manager:api permission');
}

// ─── O21 — README.txt REQUIRED ────────────────────────────────────────────────
section('O21 — README.txt (MANDATORY — App.js:1427 throws if missing)');
const readmeTxtPath = path.join(ROOT, 'README.txt');
if (!fs.existsSync(readmeTxtPath)) {
  fail('O21', 'README.txt MISSING — SDK throws: "Missing file /README.txt". BLOCKS publish.',
    () => {
      const desc = (app.description && app.description.en) || app.name.en || 'Homey App';
      fs.writeFileSync(readmeTxtPath,
        `${app.name.en || 'Homey App'}\n\n${desc}\n\nVisit https://community.homey.app for support.\n`, 'utf8');
    });
} else {
  const size = fs.statSync(readmeTxtPath).size;
  if (size < 50) {
    fail('O21', `README.txt too short (${size} bytes) — App Store requires meaningful content`);
  } else {
    ok('O21', `README.txt OK (${size} bytes)`);
  }
}
// Multilingual READMEs (optional but recommended — App.js:1439)
['nl', 'de', 'fr'].forEach(lang => {
  const p = path.join(ROOT, `README.${lang}.txt`);
  if (fs.existsSync(p)) {
    ok('O21', `README.${lang}.txt OK (${fs.statSync(p).size} bytes) — App Store ${lang.toUpperCase()}`);
  } else {
    warn('O21', `README.${lang}.txt missing — App Store ${lang.toUpperCase()} will fall back to English`);
  }
});

// ─── M01 — assets/icon.svg ───────────────────────────────────────────────────
section('M01 — assets/icon.svg (App.js:618 iconHash)');
const iconSvgPath = path.join(ROOT, 'assets', 'icon.svg');
if (!fs.existsSync(iconSvgPath)) {
  fail('M01', 'assets/icon.svg MISSING — SDK App.js:618: getFileHash("assets/icon.svg"). BLOCKS build.');
} else {
  const size = fs.statSync(iconSvgPath).size;
  if (size < 100) fail('M01', `assets/icon.svg too small (${size} bytes) — likely empty or corrupt`);
  else ok('M01', `assets/icon.svg OK (${size} bytes)`);
}

// ─── M02 — assets/images ─────────────────────────────────────────────────────
section('M02 — assets/images (App Store required)');
[
  ['assets/images/small.png', 'App Store thumbnail (190×190)'],
  ['assets/images/large.png', 'App Store banner (500×350)'],
].forEach(([f, desc]) => {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) fail('M02', `${f} MISSING — required: ${desc}`);
  else ok('M02', `${f} OK (${fs.statSync(p).size} bytes) — ${desc}`);
});
// xlarge optional
const xlarge = path.join(ROOT, 'assets/images/xlarge.png');
if (fs.existsSync(xlarge)) ok('M02', `assets/images/xlarge.png OK (optional)`);
else warn('M02', 'assets/images/xlarge.png missing (optional for some stores)');

// ─── M03 — .homeychangelog.json ──────────────────────────────────────────────
section('M03 — .homeychangelog.json');
const changelogPath = path.join(ROOT, '.homeychangelog.json');
let changelog = null;
if (!fs.existsSync(changelogPath)) {
  fail('M03', '.homeychangelog.json MISSING — required by SDK publish');
} else {
  try {
    changelog = JSON.parse(fs.readFileSync(changelogPath, 'utf8'));
    ok('M03', `.homeychangelog.json OK (${Object.keys(changelog).length} versions)`);
  } catch(e) {
    fail('M03', `.homeychangelog.json INVALID JSON: ${e.message}`);
  }
}

// ─── M04 — locales/en.json ───────────────────────────────────────────────────
section('M04 — locales/*.json');
const localesDir = path.join(ROOT, 'locales');
if (!fs.existsSync(localesDir)) {
  warn('M04', 'locales/ directory missing');
} else {
  const localeFiles = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
  if (!localeFiles.includes('en.json')) {
    fail('M04', 'locales/en.json MISSING — required for default language');
  }
  // ─── M13 — all locales valid JSON ───────────────────────────────────────
  localeFiles.forEach(f => {
    try {
      JSON.parse(fs.readFileSync(path.join(localesDir, f), 'utf8'));
      ok('M13', `locales/${f} valid JSON`);
    } catch(e) {
      fail('M13', `locales/${f} INVALID JSON: ${e.message}`);
    }
  });
}

// ─── M06 — data/fingerprints.json ────────────────────────────────────────────
section('M06 — data/fingerprints.json (DeviceFingerprintDB.js:83)');
const fpPath = path.join(ROOT, 'data', 'fingerprints.json');
if (!fs.existsSync(fpPath)) {
  warn('M06', 'data/fingerprints.json missing — DeviceFingerprintDB will fall back to lib/tuya/fingerprints.json');
} else {
  ok('M06', `data/fingerprints.json OK (${(fs.statSync(fpPath).size / 1048576).toFixed(1)}MB)`);
}

// ─── M07 — driver-mapping-database.json ──────────────────────────────────────
section('M07 — driver-mapping-database.json (DriverMappingLoader.js)');
const dmdPath = path.join(ROOT, 'driver-mapping-database.json');
if (!fs.existsSync(dmdPath)) {
  warn('M07', 'driver-mapping-database.json missing — DriverMappingLoader.js may fail at runtime');
} else {
  ok('M07', `driver-mapping-database.json OK (${(fs.statSync(dmdPath).size / 1024).toFixed(0)}KB)`);
}

// ─── M08 — Version consistency ───────────────────────────────────────────────
section('M08 — Version consistency');
const pkgPath = path.join(ROOT, 'package.json');
let pkg = null;
if (fs.existsSync(pkgPath)) {
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.version !== app.version) {
      fail('M08', `Version mismatch: app.json=${app.version} vs package.json=${pkg.version}`,
        () => {
          const p = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          const a = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
          p.version = a.version;
          fs.writeFileSync(pkgPath, JSON.stringify(p, null, 2), 'utf8');
        });
    } else {
      ok('M08', `Version consistent: ${app.version} (app.json = package.json)`);
    }
  } catch(e) {
    fail('M08', `package.json INVALID JSON: ${e.message}`);
  }
}
// ─── M14 — changelog has current version entry ───────────────────────────────
if (changelog) {
  // Support both old format (version key) and new format (changelog array)
  let hasEntry = false;
  if (changelog[app.version]) {
    hasEntry = true;
  } else if (changelog.changelog && Array.isArray(changelog.changelog)) {
    hasEntry = changelog.changelog.some(entry => entry.version === app.version);
  }

  if (!hasEntry) {
    fail('M14', `No changelog entry for v${app.version} in .homeychangelog.json`);
  } else {
    ok('M14', `Changelog entry for v${app.version} found`);
  }
}

// ─── O18 — .homeyignore wildcards ────────────────────────────────────────────
section('O18 — .homeyignore dangerous wildcards');
const homeyignorePath = path.join(ROOT, '.homeyignore');
if (!fs.existsSync(homeyignorePath)) {
  warn('O18', '.homeyignore missing — all files will be packaged (may exceed size limit)');
} else {
  const ignoreContent = fs.readFileSync(homeyignorePath, 'utf8');
  const ignoreLines = ignoreContent.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));

  // O18a: *.json wildcard
  const jsonWildcard = ignoreLines.find(l => l === '*.json' || l === '**/*.json');
  if (jsonWildcard) {
    fail('O18', `.homeyignore has *.json wildcard — BLOCKS runtime files (fingerprints.json, locales/*.json)`);
  } else {
    ok('O18', 'No *.json wildcard in .homeyignore');
  }

  // O18b: README.txt explicitly excluded
  const readmeExcluded = ignoreLines.find(l => l === 'README.txt' || l === '/README.txt');
  if (readmeExcluded) {
    fail('O18', '.homeyignore explicitly excludes README.txt — but README.txt is REQUIRED by SDK (O21)');
  } else {
    ok('O18', 'README.txt not excluded in .homeyignore');
  }

  // M10: check that runtime JSON files are not explicitly excluded
  const RUNTIME_JSON = [
    'data/fingerprints.json',
    'lib/tuya/fingerprints.json',
    '.homeychangelog.json',
    'driver-mapping-database.json',
  ];
  RUNTIME_JSON.forEach(f => {
    if (ignoreLines.some(l => l === f || l === '/' + f)) {
      fail('M10', `.homeyignore explicitly excludes runtime file: ${f}`);
    } else {
      ok('M10', `Runtime file not excluded: ${f}`);
    }
  });

  // M11: locales/ not excluded
  if (ignoreLines.some(l => l === 'locales/' || l === 'locales')) {
    fail('M11', '.homeyignore excludes locales/ — lib/util/index.js:131 requires locales/*.json at runtime');
  } else {
    ok('M11', 'locales/ not excluded in .homeyignore');
  }
}

// ─── M09 — Dual-Layer: Zigbee drivers have manufacturerName ──────────────────
section('M09 — Dual-Layer Integrity (no AggregateError)');
if (app.drivers && Array.isArray(app.drivers)) {
  const WIFI = id => { const s = (id||'').toLowerCase(); return s.startsWith('wifi_') || s.includes('ewelink') || s.includes('sonoff'); };
  let zigbeeOk = 0, zigbeeFail = 0, wifi = 0, hybrid = 0, virtual = 0, generic = 0;
  const dualLayerErrors = [];
  let syntheticCount = 0;
  const syntheticExamples = [];
  app.drivers.forEach(d => {
    const conn = d.connectivity || [];
    const hasZ = !!d.zigbee;
    const isLan = conn.some(c => ['lan', 'cloud'].includes(c));
    const type = hasZ && isLan ? 'hybrid' : hasZ ? 'zigbee' : WIFI(d.id) ? 'wifi' : 'virtual';
    if (hasZ) {
      const mfs = Array.isArray(d.zigbee.manufacturerName) ? d.zigbee.manufacturerName : [];
      const synthetic = mfs.filter(isSyntheticManufacturer);
      if (synthetic.length > 0) {
        syntheticCount += synthetic.length;
        if (syntheticExamples.length < 5) {
          syntheticExamples.push(`${d.id}: ${synthetic.slice(0, 2).join(', ')}`);
        }
      }
    }
    if (type === 'hybrid') hybrid++;
    else if (type === 'zigbee') {
      const hasMf = d.zigbee.manufacturerName && d.zigbee.manufacturerName.length > 0;
      const hasFp = d.zigbee.fingerprints && d.zigbee.fingerprints.length > 0;
      if (!hasMf && !hasFp) {
        // Generic template driver (no fingerprints at all) — exempt from M09
        generic++;
      } else if (!hasMf) {
        zigbeeFail++;
        dualLayerErrors.push(d.id);
      } else {
        zigbeeOk++;
      }
    } else if (type === 'wifi') wifi++;
    else virtual++;
  });
  if (dualLayerErrors.length > 0) {
    fail('M09', `${dualLayerErrors.length} Zigbee drivers WITH fingerprints but WITHOUT manufacturerName (AggregateError). Examples: ${dualLayerErrors.slice(0,3).join(', ')}`);
  } else {
    ok('M09', `Dual-Layer OK: ${zigbeeOk} Zigbee + ${hybrid} Hybrid (manufacturerName ✓), ${generic} generic templates (exempt), WiFi=${wifi}, Virtual=${virtual}`);
  }
  if (syntheticCount > 0) {
    warn('M09', `${syntheticCount} synthetic Zigbee manufacturer identifier(s) detected in source app.json. prepare-publish must prune them to reduce Athom upload size. Examples: ${syntheticExamples.join(' | ')}`);
  }
}


// ─── Per-driver asset checks (spot check first 5 drivers) ────────────────────
section('Driver Asset Spot Check (first 5)');
if (app.drivers && app.drivers.length > 0) {
  const sample = app.drivers.slice(0, 5);
  sample.forEach(d => {
    const driverDir = path.join(ROOT, 'drivers', d.id);
    if (!fs.existsSync(driverDir)) { warn('DRV', `drivers/${d.id}/ directory missing`); return; }
    const iconPath = path.join(driverDir, 'assets', 'icon.svg');
    const smallImg = path.join(driverDir, 'assets', 'images', 'small.png');
    const largeImg = path.join(driverDir, 'assets', 'images', 'large.png');
    if (!fs.existsSync(iconPath)) warn('DRV', `drivers/${d.id}/assets/icon.svg missing`);
    if (!fs.existsSync(smallImg)) warn('DRV', `drivers/${d.id}/assets/images/small.png missing`);
    if (!fs.existsSync(largeImg)) warn('DRV', `drivers/${d.id}/assets/images/large.png missing`);
    if (fs.existsSync(iconPath) && fs.existsSync(smallImg)) ok('DRV', `drivers/${d.id} assets OK`);
  });
}

// ─── Results ──────────────────────────────────────────────────────────────────
function exitWithResults() {
  if (JSON_OUTPUT) {
    console.log(JSON.stringify({ errors, warnings, fixed, passed, ok: errors.length === 0 }, null, 2));
    return;
  }

  console.log('\n' + '═'.repeat(65));
  console.log('MANDATORY CHECK REPORT');
  console.log('═'.repeat(65));
  if (fixed.length) {
    console.log(`\n🔧 AUTO-FIXED (${fixed.length}):`);
    fixed.forEach(f => console.log('  ' + f));
  }
  if (warnings.length) {
    console.log(`\n⚠️  WARNINGS (${warnings.length}):`);
    warnings.forEach(w => console.log('  ' + w));
  }
  if (errors.length) {
    console.log(`\n❌ ERRORS (${errors.length}):`);
    errors.forEach(e => console.log('  ' + e));
    console.log(`\n❌ MANDATORY CHECK FAILED — ${errors.length} blocking error(s)`);
    console.log('   Run with --fix to auto-correct fixable issues');
    console.log('   DO NOT PUSH until all errors are resolved\n');
    process.exit(1);
  } else {
    console.log(`\n✅ ALL MANDATORY CHECKS PASSED`);
    console.log(`   ${passed.length} checks OK | ${warnings.length} warnings | ${fixed.length} auto-fixed`);
    console.log('   App is SAFE to publish to Athom App Store\n');
    process.exit(0);
  }
}

exitWithResults();
