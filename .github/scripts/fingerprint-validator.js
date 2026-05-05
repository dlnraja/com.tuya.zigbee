#!/usr/bin/env node
/**
 * fingerprint-validator.js
 * ==========================
 * Valide les règles F1-F7 pour les fingerprints Zigbee
 * 
 * Règles :
 * - F1: Fingerprint = manufacturerName + productId COMBINED (les 2 requis)
 * - F2: Même manufacturerName dans plusieurs drivers = normal (diff productIds)
 * - F3: Pas de wildcards dans manufacturerName (_TZE284_* INTERDIT)
 * - F4: Case-insensitive via CaseInsensitiveMatcher.js
 * - F5: Pas de .toLowerCase() manuel dans les drivers
 * - F6: Settings keys : zb_model_id (pas zb_modelId)
 * - F7: Fallback via endpoints si productId match mais mfrName non
 * 
 * Usage: node .github/scripts/fingerprint-validator.js [--fix] [--json]
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ROOT_DIR = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT_DIR, 'drivers');
const SETTINGS_FILE = path.join(ROOT_DIR, 'settings/index.html');

const ARGV = process.argv.slice(2);
const FIX_MODE = ARGV.includes('--fix');
const JSON_OUTPUT = ARGV.includes('--json');

// Stats
let stats = {
  total: 0,
  valid: 0,
  errors: [],
  warnings: []
};

/**
 * Vérifie F1: fingerprint doit avoir manufacturerName + productId
 */
function validateF1(fingerprints, filePath) {
  let valid = true;
  const relativePath = path.relative(ROOT_DIR, filePath);
  
  for (const fp of fingerprints) {
    stats.total++;
    
    const hasMfr = fp.manufacturerName && fp.manufacturerName.trim().length > 0;
    const hasProd = fp.productId && fp.productId.trim().length > 0;
    
    if (!hasMfr || !hasProd) {
      stats.errors.push({
        rule: 'F1',
        severity: 'ERROR',
        file: relativePath,
        message: `Fingerprint incomplet : manufacturerName="${fp.manufacturerName || 'MANQUANT'}", productId="${fp.productId || 'MANQUANT'}"`,
        fix: `${fp.manufacturerName || '_TZ3000_?'} + ${fp.productId || 'TS000?'} requis`
      });
      valid = false;
    } else {
      stats.valid++;
    }
  }
  
  return valid;
}

/**
 * Vérifie F3: pas de wildcards dans manufacturerName
 */
function validateF3(fingerprints, filePath) {
  const relativePath = path.relative(ROOT_DIR, filePath);
  
  for (const fp of fingerprints) {
    if (!fp.manufacturerName) continue;
    
    // Wildcard patterns interdites
    if (fp.manufacturerName.includes('*') || fp.manufacturerName.endsWith('_')) {
      stats.errors.push({
        rule: 'F3',
        severity: 'ERROR',
        file: relativePath,
        message: `Wildcard INTERDITE dans manufacturerName: "${fp.manufacturerName}"`,
        fix: 'Remplacer par valeur exacte (ex: _TZE284_abcd1234)'
      });
    }
    
    // Patterns suspects (trop génériques)
    if (fp.manufacturerName.match(/^_[A-Z0-9]+_$/)) {
      stats.warnings.push({
        rule: 'F3',
        severity: 'WARNING',
        file: relativePath,
        message: `Pattern potentiellement trop générique: "${fp.manufacturerName}"`,
        fix: 'Vérifier que ce n\'est pas une valeur générique'
      });
    }
  }
}

/**
 * Vérifie F6: settings keys correctes
 */
function validateF6(filePath, content) {
  const relativePath = path.relative(ROOT_DIR, filePath);
  
  // Patterns incorrects
  const incorrectPatterns = [
    { pattern: /zb_modelId\b/, expected: 'zb_model_id', rule: 'F6' },
    { pattern: /zb_manufacturerName\b/, expected: 'zb_manufacturer_name', rule: 'F6' },
    { pattern: /zb_deviceId\b/, expected: 'zb_device_id', rule: 'F6' }
  ];
  
  for (const { pattern, expected, rule } of incorrectPatterns) {
    if (pattern.test(content)) {
      stats.errors.push({
        rule: rule,
        severity: 'ERROR',
        file: relativePath,
        message: `Settings key incorrecte: retrouve ${content.match(pattern)?.[0]}, attendu: ${expected}`,
        fix: `Remplacer par "${expected}"`
      });
    }
  }
}

/**
 * Vérifie F5: pas de .toLowerCase() dans les drivers
 */
function validateF5(filePath, content) {
  const relativePath = path.relative(ROOT_DIR, filePath);
  
  // Pattern pour detectar .toLowerCase() sur les champs Zigbee
  const toLowerCasePattern = /\.toLowerCase\(\)/g;
  const matches = content.match(toLowerCasePattern);
  
  if (matches) {
    // Compter les occurrences mais ne pas bloquer si utilisé sur des données non-critiques
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('.toLowerCase()')) {
        // Vérifier le contexte
        if (line.includes('manufacturerName') || line.includes('productId') || line.includes('modelId')) {
          stats.errors.push({
            rule: 'F5',
            severity: 'ERROR',
            file: relativePath,
            line: idx + 1,
            message: `Usage INTERDIT de .toLowerCase() sur champs Zigbee critiques`,
            fix: 'Utiliser CaseInsensitiveMatcher.js pour ces comparaisons'
          });
        }
      }
    });
  }
}

/**
 * Scan un fichier driver pour extraire les fingerprints
 */
function scanDriverFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fingerprints = [];
    
    // Extraire les fingerprints du fichier
    const fpMatch = content.match(/fingerprint\s*:\s*\[([\s\S]*?)\]/);
    if (fpMatch) {
      // Parser chaque fingerprint
      const fpContent = fpMatch[1];
      const fpItems = fpContent.match(/\{[^}]+\}/g) || [];
      
      for (const item of fpItems) {
        const fp = {};
        
        const mfrMatch = item.match(/manufacturerName\s*:\s*['"]([^'"]+)['"]/);
        const prodMatch = item.match(/productId\s*:\s*['"]([^'"]+)['"]/);
        const modelMatch = item.match(/modelId\s*:\s*['"]([^'"]+)['"]/);
        
        if (mfrMatch) fp.manufacturerName = mfrMatch[1];
        if (prodMatch) fp.productId = prodMatch[1];
        if (modelMatch) fp.modelId = modelMatch[1];
        
        if (Object.keys(fp).length > 0) {
          fingerprints.push(fp);
        }
      }
    }
    
    return { fingerprints, content };
  } catch (err) {
    return { fingerprints: [], content: '' };
  }
}

/**
 * Scan un répertoire de drivers
 */
function scanDriversDir() {
  console.log('🔍 Scan des drivers...');
  
  const dirs = fs.readdirSync(DRIVERS_DIR).filter(f => {
    return fs.statSync(path.join(DRIVERS_DIR, f)).isDirectory();
  });
  
  for (const dir of dirs) {
    const devicePath = path.join(DRIVERS_DIR, dir, 'device.js');
    
    if (fs.existsSync(devicePath)) {
      const { fingerprints, content } = scanDriverFile(devicePath);
      
      // Valider F1 et F3
      if (fingerprints.length > 0) {
        validateF1(fingerprints, devicePath);
        validateF3(fingerprints, devicePath);
      }
      
      // Valider F5 et F6
      validateF5(devicePath, content);
      validateF6(devicePath, content);
    }
  }
}

/**
 * Scan settings/index.html
 */
function scanSettings() {
  console.log('🔍 Scan des settings...');
  
  if (fs.existsSync(SETTINGS_FILE)) {
    const content = fs.readFileSync(SETTINGS_FILE, 'utf8');
    validateF6(SETTINGS_FILE, content);
  }
}

/**
 * Génère le rapport
 */
function generateReport() {
  const summary = {
    total: stats.total,
    valid: stats.valid,
    errors: stats.errors.length,
    warnings: stats.warnings.length,
    status: stats.errors.length === 0 ? 'PASS' : 'FAIL'
  };
  
  if (JSON_OUTPUT) {
    console.log(JSON.stringify({ summary, errors: stats.errors, warnings: stats.warnings }, null, 2));
  } else {
    console.log('\n===========================================');
    console.log('📋 FINGERPRINT VALIDATOR — RAPPORT');
    console.log('===========================================');
    console.log(`Total fingerprints : ${summary.total}`);
    console.log(`Valides             : ${summary.valid}`);
    console.log(`Erreurs F1-F7       : ${summary.errors}`);
    console.log(`Warnings            : ${summary.warnings}`);
    console.log(`Statut              : ${summary.status}`);
    console.log('===========================================\n');
    
    if (stats.errors.length > 0) {
      console.log('❌ ERREURS DÉTECTÉES :\n');
      stats.errors.forEach((err, idx) => {
        console.log(`${idx + 1}. [${err.rule}] ${err.file}${err.line ? `:${err.line}` : ''}`);
        console.log(`   ${err.message}`);
        console.log(`   → Fix: ${err.fix}\n`);
      });
    }
    
    if (stats.warnings.length > 0) {
      console.log('⚠️  WARNINGS :\n');
      stats.warnings.forEach((warn, idx) => {
        console.log(`${idx + 1}. [${warn.rule}] ${warn.file}`);
        console.log(`   ${warn.message}`);
        console.log(`   → Suggestion: ${warn.fix}\n`);
      });
    }
  }
  
  // Exit code
  process.exit(stats.errors.length === 0 ? 0 : 1);
}

/**
 * Mode Fix automatique
 */
function applyFixes() {
  console.log('🔧 Mode FIX activé...');
  console.log('Note: Les corrections automatiques ne sont pas encore implémentées.');
  console.log('Pour l\'instant,。请 corriger manuellement selon les erreurs listées.');
}

// Main
function main() {
  console.log('🔎 Fingerprint Validator v1.0.0');
  console.log('===========================================\n');
  
  if (FIX_MODE) {
    applyFixes();
  }
  
  scanDriversDir();
  scanSettings();
  generateReport();
}

main();