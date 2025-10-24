#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔧 AUTO-FIX SDK3 ISSUES - CORRECTIONS AUTOMATIQUES\n');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const LIB_DIR = path.join(ROOT, 'lib');

let stats = {
  ieeeAddrFixed: 0,
  setCapabilityFixed: 0,
  listenersFixed: 0,
  tryCatchAdded: 0,
  filesModified: 0
};

// PATTERNS À CORRIGER
const FIXES = {
  // 1. IEEE Address conversions
  ieeeAddr: {
    pattern: /(\w+)\.ieeeAddress\.replace\(/g,
    replacement: 'String($1.ieeeAddress || \'\').replace(',
    description: 'Conversion IEEE addr en string avant .replace()'
  },
  
  // 2. setCapabilityValue avec vérification type
  setCapability: {
    pattern: /(await\s+(?:this\.)?setCapabilityValue\s*\(\s*['"]measure_\w+['"]\s*,\s*)(\w+)(\s*\))/g,
    check: (match, prefix, value, suffix) => {
      // Ne corriger que si pas déjà parseFloat/parseInt
      if (value.includes('parseFloat') || value.includes('parseInt') || value.includes('Number(')) {
        return null;
      }
      return `${prefix}parseFloat(${value})${suffix}`;
    },
    description: 'Ajout parseFloat() pour measure_* capabilities'
  },
  
  // 3. Event listeners sans cleanup
  listeners: {
    pattern: /(this\.on\s*\(\s*['"](?:report|message)['"]\s*,\s*(?:async\s+)?\()/g,
    needsCheck: true,
    description: 'Détection listeners sans removeListener'
  }
};

/**
 * Scanner et corriger un fichier
 */
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let fileFixed = false;
  
  // FIX 1: IEEE Address
  if (FIXES.ieeeAddr.pattern.test(content)) {
    content = String(content).replace(FIXES.ieeeAddr.pattern, (match, varName) => {
      stats.ieeeAddrFixed++;
      fileFixed = true;
      return `String(${varName}.ieeeAddress || '').replace(`;
    });
  }
  
  // FIX 2: setCapabilityValue measure_*
  const setCapMatches = [...content.matchAll(FIXES.setCapability.pattern)];
  if (setCapMatches.length > 0) {
    setCapMatches.forEach(match => {
      const [fullMatch, prefix, value, suffix] = match;
      const fixed = FIXES.setCapability.check(fullMatch, prefix, value, suffix);
      if (fixed) {
        content = String(content).replace(fullMatch, fixed);
        stats.setCapabilityFixed++;
        fileFixed = true;
      }
    });
  }
  
  // FIX 3: Event listeners (vérification seulement)
  if (FIXES.listeners.pattern.test(content)) {
    const hasRemoveListener = content.includes('removeListener') || 
                              content.includes('removeAllListeners') ||
                              content.includes('off(');
    
    if (!hasRemoveListener && content.includes('this.on(')) {
      // Ajouter commentaire TODO
      const lines = content.split('\n');
      let modified = false;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('this.on(') && !lines[i].includes('// TODO:')) {
          lines[i] = '    // TODO: Add removeListener before re-attaching\n' + lines[i];
          modified = true;
          stats.listenersFixed++;
        }
      }
      
      if (modified) {
        content = lines.join('\n');
        fileFixed = true;
      }
    }
  }
  
  // FIX 4: Try/catch manquants autour opérations Zigbee
  const zigbeeOps = [
    'this.zclNode.endpoints',
    'this.configureAttributeReporting',
    'this.readAttributes',
    'this.writeAttributes'
  ];
  
  zigbeeOps.forEach(op => {
    if (content.includes(op)) {
      // Vérifier si déjà dans try/catch
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(op)) {
          // Chercher try au-dessus
          let hasTry = false;
          for (let j = Math.max(0, i - 5); j < i; j++) {
            if (lines[j].includes('try {')) {
              hasTry = true;
              break;
            }
          }
          
          if (!hasTry && !lines[i].includes('// TODO:')) {
            lines[i] = '      // TODO: Wrap in try/catch\n' + lines[i];
            stats.tryCatchAdded++;
            fileFixed = true;
          }
        }
      }
      
      if (fileFixed) {
        content = lines.join('\n');
      }
    }
  });
  
  // Sauvegarder si modifié
  if (fileFixed && content !== originalContent) {
    const backupPath = filePath + '.backup-autofix.' + Date.now();
    fs.copyFileSync(filePath, backupPath);
    fs.writeFileSync(filePath, content, 'utf8');
    stats.filesModified++;
    return true;
  }
  
  return false;
}

/**
 * Scanner récursivement
 */
function scanDirectory(dir, prefix = '') {
  const items = fs.readdirSync(dir);
  
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.')) {
      scanDirectory(fullPath, prefix + item + '/');
    } else if (item.endsWith('.js') && !item.includes('.backup')) {
      const fixed = fixFile(fullPath);
      if (fixed) {
        console.log(`✅ ${prefix}${item}`);
      }
    }
  });
}

// EXÉCUTION
console.log('🔍 Scanning drivers/...\n');
scanDirectory(DRIVERS_DIR);

console.log('\n🔍 Scanning lib/...\n');
if (fs.existsSync(LIB_DIR)) {
  scanDirectory(LIB_DIR);
}

// RAPPORT FINAL
console.log('\n\n📊 RAPPORT CORRECTIONS:\n');
console.log(`   IEEE addr conversions: ${stats.ieeeAddrFixed}`);
console.log(`   setCapabilityValue fixes: ${stats.setCapabilityFixed}`);
console.log(`   Event listeners warnings: ${stats.listenersFixed}`);
console.log(`   Try/catch warnings: ${stats.tryCatchAdded}`);
console.log(`   Fichiers modifiés: ${stats.filesModified}\n`);

if (stats.filesModified > 0) {
  console.log('✅ CORRECTIONS APPLIQUÉES\n');
  console.log('⚠️  NOTES IMPORTANTES:');
  console.log('   - Backups créés avec .backup-autofix.TIMESTAMP');
  console.log('   - Vérifier les TODO ajoutés manuellement');
  console.log('   - Tester les changes avant commit\n');
  
  console.log('🎯 PROCHAINES ÉTAPES:');
  console.log('   1. Examiner les fichiers modifiés');
  console.log('   2. Résoudre les TODO manuellement');
  console.log('   3. homey app build');
  console.log('   4. homey app validate --level publish');
  console.log('   5. Tester sur devices réels\n');
} else {
  console.log('✅ AUCUNE CORRECTION NÉCESSAIRE\n');
}

process.exit(0);
