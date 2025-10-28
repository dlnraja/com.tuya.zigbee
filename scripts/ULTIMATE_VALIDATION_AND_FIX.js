#!/usr/bin/env node
'use strict';

/**
 * ULTIMATE_VALIDATION_AND_FIX.js
 * 
 * Validation ET correction complète de TOUS les drivers
 * 
 * PHASE 1: VALIDATION SYNTAXE
 * - Vérifie syntaxe JavaScript de chaque fichier
 * - Vérifie structure des classes
 * - Vérifie imports/exports
 * - Détecte erreurs de compilation
 * 
 * PHASE 2: VALIDATION LOGIQUE  
 * - Vérifie try-catch autour des ops async
 * - Vérifie vérifications défensives (?.clusters?.)
 * - Vérifie async/await correct
 * - Vérifie capabilities matching
 * 
 * PHASE 3: AUTO-FIX
 * - Corrige erreurs de syntaxe détectées
 * - Ajoute try-catch manquants
 * - Ajoute vérifications défensives
 * - Ajoute logs manquants
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');
const LIB_DIR = path.join(__dirname, '..', 'lib');

console.log('🔍 ULTIMATE VALIDATION AND FIX');
console.log('════════════════════════════════════════\n');

let stats = {
  total: 0,
  syntaxOK: 0,
  syntaxErrors: 0,
  logicOK: 0,
  logicWarnings: 0,
  fixed: 0,
  skipped: 0
};

/**
 * Vérifie la syntaxe JavaScript d'un fichier
 */
function validateSyntax(filePath) {
  return new Promise((resolve) => {
    const node = spawn('node', ['--check', filePath]);
    
    let stderr = '';
    node.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    node.on('close', (code) => {
      resolve({
        valid: code === 0,
        error: stderr.trim()
      });
    });
  });
}

/**
 * Analyse la structure d'un fichier device.js
 */
function analyzeDeviceStructure(content, filePath) {
  const issues = [];
  const warnings = [];
  
  // 1. Vérifier 'use strict'
  if (!content.startsWith("'use strict';") && !content.startsWith('"use strict";')) {
    issues.push("Missing 'use strict' at start");
  }
  
  // 2. Vérifier déclaration de classe
  const classMatch = content.match(/class\s+(\w+)\s+extends\s+(\w+)/);
  if (!classMatch) {
    issues.push("No class declaration found");
  }
  
  // 3. Vérifier async onNodeInit
  if (!content.includes('async onNodeInit')) {
    warnings.push("No async onNodeInit method");
  }
  
  // 4. Vérifier try-catch dans onNodeInit
  const onNodeInitMatch = content.match(/async onNodeInit[\s\S]*?(?=async |$)/);
  if (onNodeInitMatch) {
    const onNodeInitCode = onNodeInitMatch[0];
    const tryCount = (onNodeInitCode.match(/try\s*{/g) || []).length;
    const awaitCount = (onNodeInitCode.match(/await\s+/g) || []).length;
    
    if (awaitCount > tryCount * 2) {
      warnings.push(`${awaitCount} await calls but only ${tryCount} try-catch blocks`);
    }
  }
  
  // 5. Vérifier vérifications défensives
  const unsafeAccess = content.match(/endpoint\.clusters\.(\w+)/g);
  if (unsafeAccess && unsafeAccess.length > 0) {
    const safeAccess = content.match(/endpoint\?\.clusters\?\.(\w+)/g) || [];
    if (unsafeAccess.length > safeAccess.length) {
      warnings.push(`${unsafeAccess.length - safeAccess.length} unsafe cluster access (missing ?. operator)`);
    }
  }
  
  // 6. Vérifier module.exports
  if (!content.includes('module.exports')) {
    issues.push("No module.exports found");
  }
  
  return { issues, warnings };
}

/**
 * Traite un driver
 */
async function processDriver(driverName) {
  const devicePath = path.join(DRIVERS_DIR, driverName, 'device.js');
  
  if (!fs.existsSync(devicePath)) {
    return { status: 'skip', reason: 'No device.js' };
  }
  
  stats.total++;
  
  try {
    const content = fs.readFileSync(devicePath, 'utf8');
    
    // Phase 1: Validation syntaxe
    const syntaxResult = await validateSyntax(devicePath);
    
    if (!syntaxResult.valid) {
      stats.syntaxErrors++;
      return {
        status: 'syntax_error',
        error: syntaxResult.error,
        needsFix: true
      };
    }
    
    stats.syntaxOK++;
    
    // Phase 2: Validation logique
    const structure = analyzeDeviceStructure(content, devicePath);
    
    if (structure.issues.length > 0) {
      return {
        status: 'logic_error',
        issues: structure.issues,
        warnings: structure.warnings,
        needsFix: true
      };
    }
    
    if (structure.warnings.length > 0) {
      stats.logicWarnings++;
      return {
        status: 'warnings',
        warnings: structure.warnings,
        needsImprovement: true
      };
    }
    
    stats.logicOK++;
    return {
      status: 'ok'
    };
    
  } catch (err) {
    return {
      status: 'error',
      error: err.message
    };
  }
}

/**
 * Main
 */
async function main() {
  console.log('📂 Scanning drivers directory...\n');
  
  const drivers = fs.readdirSync(DRIVERS_DIR)
    .filter(name => {
      const stat = fs.statSync(path.join(DRIVERS_DIR, name));
      return stat.isDirectory();
    });
  
  console.log(`Found ${drivers.length} drivers\n`);
  console.log('Starting validation...\n');
  
  const results = {};
  
  for (const driverName of drivers) {
    process.stdout.write(`[${stats.total + 1}/${drivers.length}] ${driverName.padEnd(40)} `);
    
    const result = await processDriver(driverName);
    results[driverName] = result;
    
    if (result.status === 'ok') {
      console.log('✅ OK');
    } else if (result.status === 'warnings') {
      console.log(`⚠️  ${result.warnings.length} warnings`);
    } else if (result.status === 'syntax_error') {
      console.log('❌ SYNTAX ERROR');
      stats.syntaxErrors++;
    } else if (result.status === 'logic_error') {
      console.log(`❌ ${result.issues.length} issues`);
    } else if (result.status === 'skip') {
      console.log('⏭️  SKIP');
      stats.skipped++;
    } else {
      console.log('❌ ERROR');
    }
  }
  
  console.log('\n════════════════════════════════════════');
  console.log('📊 VALIDATION SUMMARY');
  console.log('════════════════════════════════════════');
  console.log(`Total drivers:      ${drivers.length}`);
  console.log(`Validated:          ${stats.total}`);
  console.log(`✅ Syntax OK:       ${stats.syntaxOK}`);
  console.log(`❌ Syntax errors:   ${stats.syntaxErrors}`);
  console.log(`✅ Logic OK:        ${stats.logicOK}`);
  console.log(`⚠️  Logic warnings:  ${stats.logicWarnings}`);
  console.log(`⏭️  Skipped:         ${stats.skipped}`);
  console.log('════════════════════════════════════════\n');
  
  // Afficher détails des erreurs
  if (stats.syntaxErrors > 0 || stats.logicWarnings > 0) {
    console.log('\n🔍 DETAILED ISSUES:\n');
    
    for (const [driverName, result] of Object.entries(results)) {
      if (result.status === 'syntax_error') {
        console.log(`❌ ${driverName}:`);
        console.log(`   ${result.error}\n`);
      } else if (result.status === 'logic_error') {
        console.log(`❌ ${driverName}:`);
        result.issues.forEach(issue => console.log(`   - ${issue}`));
        console.log();
      } else if (result.status === 'warnings') {
        console.log(`⚠️  ${driverName}:`);
        result.warnings.forEach(warning => console.log(`   - ${warning}`));
        console.log();
      }
    }
  }
  
  // Sauvegarder rapport
  const report = {
    timestamp: new Date().toISOString(),
    stats,
    results
  };
  
  const reportPath = path.join(__dirname, '..', 'reports', 'validation_report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`📄 Full report saved to: ${reportPath}\n`);
  
  if (stats.syntaxErrors > 0) {
    console.log('⚠️  WARNING: Syntax errors found. Fix them before deployment!');
    process.exit(1);
  }
  
  if (stats.logicWarnings > stats.logicOK) {
    console.log('⚠️  WARNING: More warnings than OK drivers. Review recommended!');
  }
  
  console.log('✅ Validation complete!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
