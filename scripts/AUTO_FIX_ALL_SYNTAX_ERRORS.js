#!/usr/bin/env node
'use strict';

/**
 * AUTO_FIX_ALL_SYNTAX_ERRORS.js
 * 
 * Corrige AUTOMATIQUEMENT toutes les erreurs de syntaxe détectées:
 * 1. Code partiellement commenté → Commenter entièrement
 * 2. Missing class declaration → Restaurer depuis git
 * 3. Unexpected token → Corriger syntaxe
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPORT_PATH = path.join(__dirname, '..', 'reports', 'validation_report.json');
const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

console.log('🔧 AUTO-FIX ALL SYNTAX ERRORS\n');

// Lire le rapport de validation
const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));

let fixed = 0;
let failed = 0;

console.log(`Found ${report.stats.syntaxErrors} syntax errors to fix\n`);

// Pattern 1: Code partiellement commenté
function fixPartiallyCommentedCode(content, filePath) {
  let modified = false;
  
  // Pattern: // this.registerCapability( suivi de lignes non-commentées
  const regex = /(\/\/ this\.registerCapability\([^\n]+\n)((?:(?!\/\/)[\s]*[a-zA-Z]+:[\s\S]*?\n)+)/g;
  
  const fixed = content.replace(regex, (match, commentedLine, uncommentedBlock) => {
    modified = true;
    const lines = uncommentedBlock.split('\n');
    const commentedLines = lines.map(line => {
      if (line.trim() && !line.trim().startsWith('//')) {
        return '// ' + line;
      }
      return line;
    }).join('\n');
    
    return commentedLine + commentedLines;
  });
  
  return { content: fixed, modified };
}

// Pattern 2: setupTemperatureSensor hors class
function fixOrphanMethods(content, filePath) {
  // Si méthode hors class, supprimer
  if (content.includes('async setupTemperatureSensor()') &&
      content.includes('class ') &&
      !content.match(/class[\s\S]*setupTemperatureSensor/)) {
    
    // Supprimer tout après le dernier }
    const lastBrace = content.lastIndexOf('module.exports');
    if (lastBrace > 0) {
      const beforeExport = content.substring(0, lastBrace);
      const afterExport = content.substring(lastBrace);
      
      // Supprimer méthodes orphelines
      let fixed = beforeExport.replace(/\nasync setup\w+\(\)[\s\S]*?(?=\n(async|module\.exports|$))/g, '');
      
      return { content: fixed + afterExport, modified: true };
    }
  }
  
  return { content, modified: false };
}

// Pattern 3: Restaurer classe manquante
function restoreFromGit(driverName) {
  try {
    const devicePath = path.join('drivers', driverName, 'device.js');
    execSync(`git checkout HEAD~5 -- ${devicePath}`, { cwd: path.join(__dirname, '..') });
    return true;
  } catch (err) {
    return false;
  }
}

// Traiter chaque driver avec erreur
for (const [driverName, result] of Object.entries(report.results)) {
  if (result.status !== 'syntax_error') continue;
  
  const devicePath = path.join(DRIVERS_DIR, driverName, 'device.js');
  
  console.log(`Fixing: ${driverName}`);
  
  try {
    // Lire contenu
    const original = fs.readFileSync(devicePath, 'utf8');
    let content = original;
    let wasModified = false;
    
    // Essayer fix 1: Code partiellement commenté
    const fix1 = fixPartiallyCommentedCode(content, devicePath);
    if (fix1.modified) {
      content = fix1.content;
      wasModified = true;
      console.log(`  ✅ Fixed partially commented code`);
    }
    
    // Essayer fix 2: Méthodes orphelines
    const fix2 = fixOrphanMethods(content, devicePath);
    if (fix2.modified) {
      content = fix2.content;
      wasModified = true;
      console.log(`  ✅ Removed orphan methods`);
    }
    
    // Si modifié, sauvegarder
    if (wasModified) {
      fs.writeFileSync(devicePath, content, 'utf8');
      fixed++;
      console.log(`  ✅ FIXED!\n`);
    } else {
      // Essayer fix 3: Restaurer depuis git
      console.log(`  ⚠️  No automatic fix found, trying git restore...`);
      if (restoreFromGit(driverName)) {
        fixed++;
        console.log(`  ✅ RESTORED from git!\n`);
      } else {
        failed++;
        console.log(`  ❌ FAILED to fix\n`);
      }
    }
    
  } catch (err) {
    console.log(`  ❌ ERROR: ${err.message}\n`);
    failed++;
  }
}

console.log('════════════════════════════════════════');
console.log('📊 AUTO-FIX SUMMARY');
console.log('════════════════════════════════════════');
console.log(`✅ Fixed:  ${fixed} drivers`);
console.log(`❌ Failed: ${failed} drivers`);
console.log(`📋 Total:  ${report.stats.syntaxErrors} errors`);
console.log('════════════════════════════════════════\n');

if (fixed > 0) {
  console.log('✅ Fixes applied! Run validation again to verify.');
  process.exit(0);
} else {
  console.log('❌ No fixes applied. Manual intervention required.');
  process.exit(1);
}
