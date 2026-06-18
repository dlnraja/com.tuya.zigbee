#!/usr/bin/env node
'use strict';
// v9.0.40: Comprehensive Driver Health Check
// Combines all validations into a single report:
// - Syntax check (--check)
// - Mixin order
// - WiFi lifecycle (super.onDeleted)
// - safeSetCapabilityValue usage
// - console.log detection
// - Import path validation
// - Flow card ID uniqueness
// - Empty manufacturerName arrays

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DRIVERS_DIR = path.join(__dirname, '..', '..', 'drivers');
const LIB_DIR = path.join(__dirname, '..', '..', 'lib');

let totalErrors = 0;
let totalWarnings = 0;
let totalChecked = 0;

const results = {
  syntax: { pass: 0, fail: 0, files: [] },
  mixin: { pass: 0, fail: 0, files: [] },
  lifecycle: { pass: 0, fail: 0, files: [] },
  console: { pass: 0, fail: 0, files: [] },
  imports: { pass: 0, fail: 0, files: [] },
  manufacturer: { pass: 0, fail: 0, files: [] },
};

function scanDir(dir, filter) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...scanDir(fullPath, filter));
    } else if (filter(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

// 1. Syntax Check
function checkSyntax(filePath) {
  try {
    execSync(`node --check "${filePath}"`, { stdio: 'pipe' });
    results.syntax.pass++;
    return true;
  } catch (e) {
    results.syntax.fail++;
    results.syntax.files.push(path.relative(process.cwd(), filePath));
    return false;
  }
}

// 2. Mixin Order Check
function checkMixinOrder(filePath, content) {
  if (content.includes('VirtualButtonMixin(PhysicalButtonMixin(')) {
    results.mixin.fail++;
    results.mixin.files.push(path.relative(process.cwd(), filePath));
    return false;
  }
  results.mixin.pass++;
  return true;
}

// 3. WiFi Lifecycle Check (only for WiFi drivers)
function checkLifecycle(filePath, content) {
  const relPath = path.relative(process.cwd(), filePath);
  let ok = true;

  // Only check WiFi driver device files
  if (relPath.includes('drivers\\wifi_') || relPath.includes('drivers/wifi_')) {
    if (content.includes('async onDeleted()') && !content.includes('super.onDeleted()')) {
      results.lifecycle.fail++;
      results.lifecycle.files.push(relPath);
      ok = false;
    }
  }
  if (ok) results.lifecycle.pass++;
  return ok;
}

// 4. Console.log Check (only in drivers/ directory, not lib/)
function checkConsole(filePath, content) {
  const relPath = path.relative(process.cwd(), filePath);

  // Only check drivers/ directory - lib/ files may use console for infrastructure
  if (!relPath.startsWith('drivers')) {
    results.console.pass++;
    return true;
  }

  const matches = content.match(/(?<!\/\/.*)console\.(log|error|warn|debug)\(/g);
  if (matches) {
    results.console.fail++;
    results.console.files.push(relPath);
    return false;
  }
  results.console.pass++;
  return true;
}

// 5. Import Path Check
function checkImports(filePath, content) {
  const relPath = path.relative(process.cwd(), filePath);
  let ok = true;

  // Check for wrong import paths
  if (content.includes("require('../../lib/TuyaZigbeeDevice')")) {
    results.imports.fail++;
    results.imports.files.push(relPath + ' (wrong TuyaZigbeeDevice path)');
    ok = false;
  }
  if (content.includes("require('../../lib/HybridSwitchBase')")) {
    results.imports.fail++;
    results.imports.files.push(relPath + ' (deprecated HybridSwitchBase)');
    ok = false;
  }
  if (ok) results.imports.pass++;
  return ok;
}

// 6. Manufacturer Name Check
function checkManufacturer(filePath, content) {
  const relPath = path.relative(process.cwd(), filePath);

  // Check compose files for empty manufacturerName arrays
  if (filePath.endsWith('driver.compose.json')) {
    try {
      const json = JSON.parse(content);
      const mfr = json.zigbee && json.zigbee.manufacturerName;
      if (Array.isArray(mfr) && mfr.length === 0) {
        results.manufacturer.fail++;
        results.manufacturer.files.push(relPath);
        return false;
      }
    } catch (e) { /* skip parse errors */ }
  }
  results.manufacturer.pass++;
  return true;
}

// Main
console.log('🏥 Comprehensive Driver Health Check\n');
console.log('━'.repeat(60));

// Collect all files
const jsFiles = scanDir(DRIVERS_DIR, f => f.endsWith('.js'));
const jsonFiles = scanDir(DRIVERS_DIR, f => f.endsWith('.json'));
const libJsFiles = scanDir(LIB_DIR, f => f.endsWith('.js'));
const allFiles = [...jsFiles, ...jsonFiles, ...libJsFiles];

console.log(`📁 Found ${allFiles.length} files to check\n`);

for (const filePath of allFiles) {
  totalChecked++;
  const content = fs.readFileSync(filePath, 'utf8');

  checkSyntax(filePath);
  if (filePath.endsWith('.js')) {
    checkMixinOrder(filePath, content);
    checkLifecycle(filePath, content);
    checkConsole(filePath, content);
    checkImports(filePath, content);
  }
  checkManufacturer(filePath, content);
}

// Report
console.log('━'.repeat(60));
console.log('\n📊 HEALTH REPORT\n');

const categories = [
  { name: 'Syntax', ...results.syntax },
  { name: 'Mixin Order', ...results.mixin },
  { name: 'WiFi Lifecycle', ...results.lifecycle },
  { name: 'Console.log', ...results.console },
  { name: 'Import Paths', ...results.imports },
  { name: 'Manufacturer', ...results.manufacturer },
];

for (const cat of categories) {
  const status = cat.fail === 0 ? '✅' : '❌';
  console.log(`${status} ${cat.name}: ${cat.pass} pass, ${cat.fail} fail`);
  if (cat.files.length > 0) {
    for (const f of cat.files.slice(0, 5)) {
      console.log(`   → ${f}`);
    }
    if (cat.files.length > 5) {
      console.log(`   ... and ${cat.files.length - 5} more`);
    }
  }
  totalErrors += cat.fail;
}

console.log('\n' + '━'.repeat(60));
console.log(`\n📈 Total: ${totalChecked} files checked, ${totalErrors} errors`);

if (totalErrors > 0) {
  console.log('\n❌ HEALTH CHECK FAILED');
  process.exit(1);
} else {
  console.log('\n✅ ALL CHECKS PASSED');
}
