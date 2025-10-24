#!/usr/bin/env node
'use strict';

/**
 * CLEAN AND VALIDATE
 * Nettoie les caches et valide avant GitHub Actions
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

console.log('🧹 CLEAN AND VALIDATE\n');
console.log('═'.repeat(60));

// Phase 1: Nettoyer les caches
console.log('\n📦 Phase 1: Nettoyage caches...');
const caches = ['.homeybuild', '.homeycompose/.cache', 'node_modules/.cache'];
for (const cache of caches) {
  const cachePath = path.join(ROOT, cache);
  if (fs.existsSync(cachePath)) {
    try {
      fs.rmSync(cachePath, { recursive: true, force: true });
      console.log(`  ✅ ${cache} nettoyé`);
    } catch (err) {
      console.log(`  ⚠️  ${cache} - ${err.message}`);
    }
  }
}

// Phase 2: Déplacer MD racine vers reports/
console.log('\n📁 Phase 2: Organisation fichiers racine...');
const rootFiles = fs.readdirSync(ROOT);
let moved = 0;

for (const file of rootFiles) {
  const filePath = path.join(ROOT, file);
  const stat = fs.statSync(filePath);
  
  if (stat.isFile() && file.match(/\.(md)$/i)) {
    // Garder uniquement README.md, CHANGELOG.md, LICENSE
    if (!['README.md', 'CHANGELOG.md', 'LICENSE'].includes(file)) {
      const target = path.join(ROOT, 'reports', file);
      try {
        if (!fs.existsSync(target)) {
          fs.copyFileSync(filePath, target);
          fs.unlinkSync(filePath);
          console.log(`  ✅ ${file} → reports/`);
          moved++;
        }
      } catch (err) {
        // Ignore
      }
    }
  }
}

console.log(`  📊 ${moved} fichiers déplacés`);

// Phase 3: Validation
console.log('\n✓ Phase 3: Validation Homey...');
try {
  execSync('homey app validate --level publish', { 
    cwd: ROOT,
    stdio: 'inherit'
  });
  console.log('  ✅ Validation réussie');
} catch (err) {
  console.error('  ❌ Validation échouée');
  process.exit(1);
}

console.log('\n' + '═'.repeat(60));
console.log('✅ CLEAN AND VALIDATE TERMINÉ\n');
