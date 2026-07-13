#!/usr/bin/env node
'use strict';

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * AUTO-VALIDATION GATE v1.0.0
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * Automated checks derived from investigation findings (v8.5.7-v8.5.12):
 * 1. Duplicate Flow Card ID detection
 * 2. Bundle size check (prevent OOM)
 * 3. Node.js engine version check
 * 4. .homeyignore security patterns
 * 5. JSON syntax validation
 * 6. Critical file existence
 * 
 * Run: node scripts/ci/auto-validation-gate.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

let errors = 0;
let warnings = 0;

function log(type, msg) {
  const prefix = { OK: '✅', WARN: '⚠️', ERROR: '❌', INFO: 'ℹ️' }[type] || '•';
  console.log(`${prefix} ${msg}`);
  if (type === 'ERROR') errors++;
  if (type === 'WARN') warnings++;
}

// ══════════════════════════════════════════════════════════════════════════════
// CHECK 1: Duplicate Flow Card IDs
// ══════════════════════════════════════════════════════════════════════════════

function checkDuplicateFlowCards() {
  log('INFO', 'CHECK 1: Duplicate Flow Card IDs...');
  const allIds = {};
  const dupes = [];

  try {
    const entries = fs.readdirSync(DRIVERS_DIR);
    for (const driverName of entries) {
      const fp = path.join(DRIVERS_DIR, driverName, 'driver.flow.compose.json');
      try {
        const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
        const cards = [...(d.triggers || []), ...(d.conditions || []), ...(d.actions || [])];
        for (const c of cards) {
          if (!c.id) continue;
          if (allIds[c.id]) {
            dupes.push({ id: c.id, drivers: [allIds[c.id], driverName] });
          } else {
            allIds[c.id] = driverName;
          }
        }
      } catch (err) { /* skip non-json */ }
    }
  } catch (err) {
    log('WARN', `Could not scan drivers: ${err.message}`);
    return;
  }

  if (dupes.length > 0) {
    log('ERROR', `Found ${dupes.length} duplicate flow card IDs!`);
    dupes.slice(0, 5).forEach(d => {
      log('ERROR', `  DUPE: ${d.id} -> ${d.drivers.join(' vs ')}`);
    });
    if (dupes.length > 5) log('INFO', `  ... and ${dupes.length - 5} more`);
  } else {
    log('OK', 'All flow card IDs are globally unique');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CHECK 2: Bundle Size (prevent OOM crash)
// ══════════════════════════════════════════════════════════════════════════════

function checkBundleSize() {
  log('INFO', 'CHECK 2: Bundle size (prevent OOM)...');
  const MAX_SIZE_KB = 1000; // 1MB max per JSON file in bundle
  
  const homeyignore = fs.readFileSync(path.join(ROOT, '.homeyignore'), 'utf8');
  const ignorePatterns = homeyignore.split('\n').filter(l => l.trim() && !l.startsWith('#'));

  // Check critical large files are excluded
  const criticalFiles = [
    'data/fingerprints.json',
    'driver-mapping-database.json'
  ];

  for (const file of criticalFiles) {
    const fp = path.join(ROOT, file);
    if (!fs.existsSync(fp)) continue;
    
    const size = fs.statSync(fp).size;
    const sizeKB = Math.round(size / 1024);
    
    const isIgnored = ignorePatterns.some(p => file.includes(p.replace(/\*/g, '')));
    
    if (sizeKB > MAX_SIZE_KB && !isIgnored) {
      log('ERROR', `${file} is ${sizeKB}KB but NOT in .homeyignore! Will cause OOM crash!`);
    } else if (sizeKB > MAX_SIZE_KB && isIgnored) {
      log('OK', `${file} is ${sizeKB}KB but properly excluded from bundle`);
    }
  }

  // Scan for any JSON > 500KB that's not excluded
  try {
    const scanDir = (dir, relPath = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const fullPath = path.join(dir, e.name);
        const rel = path.join(relPath, e.name);
        if (e.isDirectory() && !['node_modules', '.git', 'tmp_analysis', 'scratch'].includes(e.name)) {
          scanDir(fullPath, rel);
        } else if (e.name.endsWith('.json') && e.size > 500 * 1024) {
          const isIgnored = ignorePatterns.some(p => rel.includes(p.replace(/\*/g, '')));
          if (!isIgnored) {
            log('WARN', `Large JSON ${rel} (${Math.round(e.size/1024)}KB) not in .homeyignore`);
          }
        }
      }
    };
    scanDir(ROOT);
  } catch (err) { /* scan best-effort */ }

  log('OK', 'Bundle size check complete');
}

// ══════════════════════════════════════════════════════════════════════════════
// CHECK 3: Node.js Engine Version
// ══════════════════════════════════════════════════════════════════════════════

function checkNodeEngine() {
  log('INFO', 'CHECK 3: Node.js engine version...');
  
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const nodeReq = pkg.engines?.node;
    
    if (!nodeReq) {
      log('WARN', 'No engines.node specified in package.json');
      return;
    }

    // Extract version number
    const match = nodeReq.match(/(\d+)/);
    const version = match ? parseInt(match[1]) : 0;
    
    if (version >= 20) {
      log('ERROR', `engines.node is ${nodeReq} — Homey Pro uses Node 18!`);
      log('ERROR', '  Fix: Change to ">=18.0.0" in package.json');
    } else if (version >= 18) {
      log('OK', `engines.node is ${nodeReq} — compatible with Homey Pro`);
    } else {
      log('WARN', `engines.node is ${nodeReq} — verify Homey Pro compatibility`);
    }
  } catch (err) {
    log('WARN', `Could not read package.json: ${err.message}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CHECK 4: Security Patterns in .homeyignore
// ══════════════════════════════════════════════════════════════════════════════

function checkSecurityPatterns() {
  log('INFO', 'CHECK 4: Security patterns...');
  
  try {
    const homeyignore = fs.readFileSync(path.join(ROOT, '.homeyignore'), 'utf8');
    const requiredPatterns = ['.env', 'secrets.json', 'credentials.json', 'config.local.js'];
    
    for (const pattern of requiredPatterns) {
      if (!homeyignore.includes(pattern)) {
        log('ERROR', `Missing security pattern "${pattern}" in .homeyignore!`);
      }
    }

    // Check no sensitive files exist in repo
    const sensitiveFiles = ['.env', 'secrets.json', 'credentials.json'];
    for (const file of sensitiveFiles) {
      if (fs.existsSync(path.join(ROOT, file))) {
        log('ERROR', `Sensitive file "${file}" exists in repo root!`);
      }
    }

    log('OK', 'Security patterns verified');
  } catch (err) {
    log('WARN', `Could not check security: ${err.message}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CHECK 5: JSON Syntax Validation
// ══════════════════════════════════════════════════════════════════════════════

function checkJsonSyntax() {
  log('INFO', 'CHECK 5: JSON syntax validation...');
  
  const criticalFiles = [
    'package.json',
    'app.json',
    '.homeycompose/app.json'
  ];

  for (const file of criticalFiles) {
    const fp = path.join(ROOT, file);
    try {
      JSON.parse(fs.readFileSync(fp, 'utf8'));
      log('OK', `${file} — valid JSON`);
    } catch (err) {
      log('ERROR', `${file} — INVALID JSON: ${err.message}`);
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CHECK 6: Critical File Existence
// ══════════════════════════════════════════════════════════════════════════════

function checkCriticalFiles() {
  log('INFO', 'CHECK 6: Critical file existence...');
  
  const criticalFiles = [
    'lib/tuya/DeviceFingerprintDB.js',
    'lib/devices/BaseUnifiedDevice.js',
    'lib/battery/UnifiedBatteryHandler.js',
    'lib/managers/SmartDivisorManager.js',
    '.homeyignore',
    '.gitignore',
    'PROJECT_INDEX.md',
    'AI_CONTEXT_MANDATE.md'
  ];

  for (const file of criticalFiles) {
    const fp = path.join(ROOT, file);
    if (fs.existsSync(fp)) {
      log('OK', `${file} exists`);
    } else {
      log('ERROR', `MISSING: ${file}`);
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════');
console.log('  AUTO-VALIDATION GATE v1.0.0');
console.log('  Derived from investigation findings (v8.5.7-v8.5.12)');
console.log('═══════════════════════════════════════════════════════\n');

checkDuplicateFlowCards();
console.log('');
checkBundleSize();
console.log('');
checkNodeEngine();
console.log('');
checkSecurityPatterns();
console.log('');
checkJsonSyntax();
console.log('');
checkCriticalFiles();

console.log('\n═══════════════════════════════════════════════════════');
console.log(`  RESULTS: ${errors} errors, ${warnings} warnings`);
console.log('═══════════════════════════════════════════════════════');

if (errors > 0) {
  console.log('\n❌ VALIDATION FAILED — Fix errors before pushing!');
  process.exit(1);
} else {
  console.log('\n✅ VALIDATION PASSED');
  process.exit(0);
}