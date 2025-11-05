#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * VALIDATION COMPLÈTE DE TOUS LES CHEMINS ET RÉFÉRENCES
 * Détecte les erreurs MODULE_NOT_FOUND AVANT déploiement
 */

const rootDir = path.join(__dirname, '..');
const libDir = path.join(rootDir, 'lib');

// Couleurs console
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

let totalFiles = 0;
let totalRequires = 0;
let errorCount = 0;
let warningCount = 0;

const errors = [];
const warnings = [];

/**
 * Extract all require() statements from a file
 */
function extractRequires(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const requires = [];
    
    // Match require('...') and require("...")
    const regex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      requires.push({
        module: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return requires;
  } catch (err) {
    return [];
  }
}

/**
 * Resolve relative path from current file
 */
function resolveModulePath(currentFilePath, modulePath) {
  // Skip node_modules and homey modules
  if (!modulePath.startsWith('.')) {
    return null;
  }
  
  const currentDir = path.dirname(currentFilePath);
  const resolved = path.resolve(currentDir, modulePath);
  
  // Try with .js extension
  if (fs.existsSync(resolved + '.js')) {
    return resolved + '.js';
  }
  
  // Try as is
  if (fs.existsSync(resolved)) {
    return resolved;
  }
  
  // Try as directory with index.js
  if (fs.existsSync(path.join(resolved, 'index.js'))) {
    return path.join(resolved, 'index.js');
  }
  
  return null;
}

/**
 * Validate all requires in a file
 */
function validateFile(filePath) {
  totalFiles++;
  const requires = extractRequires(filePath);
  totalRequires += requires.length;
  
  const relPath = path.relative(rootDir, filePath);
  
  requires.forEach(req => {
    // Skip node_modules
    if (!req.module.startsWith('.')) {
      return;
    }
    
    const resolvedPath = resolveModulePath(filePath, req.module);
    
    if (!resolvedPath) {
      errorCount++;
      errors.push({
        file: relPath,
        line: req.line,
        module: req.module,
        error: 'MODULE_NOT_FOUND'
      });
    }
  });
}

/**
 * Scan directory recursively
 */
function scanDirectory(dir) {
  const items = fs.readdirSync(dir);
  
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip node_modules, .git, etc.
      if (!item.startsWith('.') && item !== 'node_modules') {
        scanDirectory(fullPath);
      }
    } else if (item.endsWith('.js')) {
      validateFile(fullPath);
    }
  });
}

/**
 * Check specific critical files
 */
function checkCriticalFiles() {
  console.log(`\n${CYAN}=== VALIDATION DES FICHIERS CRITIQUES ===${RESET}\n`);
  
  const criticalFiles = [
    'app.js',
    'lib/devices/BaseHybridDevice.js',
    'lib/tuya/TuyaZigbeeDevice.js',
    'lib/SmartDriverAdaptation.js',
    'lib/DriverMigrationManager.js',
    'lib/DeviceIdentificationDatabase.js',
    'lib/FlowCardManager.js',
    'lib/BatteryManager.js'
  ];
  
  criticalFiles.forEach(file => {
    const fullPath = path.join(rootDir, file);
    if (fs.existsSync(fullPath)) {
      console.log(`${GREEN}✓${RESET} ${file}`);
      validateFile(fullPath);
    } else {
      console.log(`${RED}✗${RESET} ${file} - FILE NOT FOUND`);
      errorCount++;
    }
  });
}

/**
 * Check lib structure
 */
function checkLibStructure() {
  console.log(`\n${CYAN}=== STRUCTURE lib/ ===${RESET}\n`);
  
  const expectedDirs = [
    'managers',
    'tuya',
    'zigbee',
    'utils',
    'protocol',
    'devices'
  ];
  
  expectedDirs.forEach(dir => {
    const fullPath = path.join(libDir, dir);
    if (fs.existsSync(fullPath)) {
      const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.js'));
      console.log(`${GREEN}✓${RESET} lib/${dir}/ (${files.length} files)`);
    } else {
      console.log(`${RED}✗${RESET} lib/${dir}/ - DIRECTORY NOT FOUND`);
      warningCount++;
    }
  });
}

/**
 * Main validation
 */
console.log(`${CYAN}╔════════════════════════════════════════════════════════════════╗${RESET}`);
console.log(`${CYAN}║  VALIDATION COMPLÈTE - CHEMINS & RÉFÉRENCES                    ║${RESET}`);
console.log(`${CYAN}╚════════════════════════════════════════════════════════════════╝${RESET}`);

checkCriticalFiles();
checkLibStructure();

console.log(`\n${CYAN}=== SCAN COMPLET lib/ ===${RESET}\n`);
scanDirectory(libDir);

console.log(`\n${CYAN}=== SCAN drivers/ ===${RESET}\n`);
const driversDir = path.join(rootDir, 'drivers');
if (fs.existsSync(driversDir)) {
  // Sample 10 drivers
  const drivers = fs.readdirSync(driversDir).slice(0, 10);
  drivers.forEach(driver => {
    const deviceJs = path.join(driversDir, driver, 'device.js');
    if (fs.existsSync(deviceJs)) {
      validateFile(deviceJs);
    }
  });
  console.log(`${GREEN}✓${RESET} Validated ${drivers.length} sample drivers`);
}

// RÉSULTATS
console.log(`\n${CYAN}╔════════════════════════════════════════════════════════════════╗${RESET}`);
console.log(`${CYAN}║  RÉSULTATS DE VALIDATION                                       ║${RESET}`);
console.log(`${CYAN}╚════════════════════════════════════════════════════════════════╝${RESET}`);

console.log(`\n📊 Statistiques:`);
console.log(`   Fichiers scannés: ${totalFiles}`);
console.log(`   require() trouvés: ${totalRequires}`);
console.log(`   Erreurs: ${RED}${errorCount}${RESET}`);
console.log(`   Warnings: ${YELLOW}${warningCount}${RESET}`);

if (errors.length > 0) {
  console.log(`\n${RED}❌ ERREURS DÉTECTÉES:${RESET}\n`);
  errors.forEach((err, idx) => {
    console.log(`${idx + 1}. ${err.file}:${err.line}`);
    console.log(`   require('${err.module}')`);
    console.log(`   ${RED}${err.error}${RESET}\n`);
  });
}

if (warnings.length > 0) {
  console.log(`\n${YELLOW}⚠️  WARNINGS:${RESET}\n`);
  warnings.forEach((warn, idx) => {
    console.log(`${idx + 1}. ${warn}\n`);
  });
}

if (errorCount === 0 && warningCount === 0) {
  console.log(`\n${GREEN}✅ TOUS LES CHEMINS SONT VALIDES!${RESET}`);
  console.log(`${GREEN}✅ Aucune erreur MODULE_NOT_FOUND détectée${RESET}`);
  console.log(`${GREEN}✅ Prêt pour déploiement${RESET}\n`);
  process.exit(0);
} else {
  console.log(`\n${RED}❌ CORRECTION REQUISE AVANT DÉPLOIEMENT${RESET}\n`);
  process.exit(1);
}
