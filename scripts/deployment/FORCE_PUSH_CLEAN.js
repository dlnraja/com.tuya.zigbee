#!/usr/bin/env node
/**
 * 🚀 FORCE PUSH CLEAN - Crée branche propre sans historique problématique
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

console.log('🚀 FORCE PUSH CLEAN\n');
console.log('Création branche propre sans gros fichiers dans historique...\n');

try {
  // 1. Créer branche backup
  console.log('📦 Backup branche actuelle...');
  execSync('git branch backup-before-clean', { cwd: ROOT, stdio: 'inherit' });
  
  // 2. Créer branche orpheline (sans historique)
  console.log('\n🆕 Création branche orpheline...');
  execSync('git checkout --orphan clean-master', { cwd: ROOT, stdio: 'inherit' });
  
  // 3. Supprimer gros fichiers du staging si présents
  console.log('\n🗑️  Nettoyage fichiers problématiques...');
  try {
    execSync('git rm --cached -rf docs/v3/IAS_ZONE_IMPLEMENTATION_VERIFICATION.md docs/ORGANISATION_FICHIERS_TXT.md', 
      { cwd: ROOT, stdio: 'pipe' });
  } catch(e) {
    // Fichiers peut-être déjà supprimés
  }
  
  // 4. Add all files
  console.log('\n➕ Ajout tous les fichiers...');
  execSync('git add -A', { cwd: ROOT, stdio: 'inherit' });
  
  // 5. Commit
  console.log('\n💾 Commit initial propre...');
  execSync('git commit -m "feat: Clean deployment with .homeycompose structure and 100% coverage"', 
    { cwd: ROOT, stdio: 'inherit' });
  
  // 6. Supprimer ancienne branche master
  console.log('\n🗑️  Suppression ancienne branche master...');
  execSync('git branch -D master', { cwd: ROOT, stdio: 'inherit' });
  
  // 7. Renommer clean-master en master
  console.log('\n🔄 Renommage clean-master → master...');
  execSync('git branch -m master', { cwd: ROOT, stdio: 'inherit' });
  
  console.log('\n✅ Branche propre créée!\n');
  console.log('📌 Prochaine étape:');
  console.log('   git push origin master --force\n');
  
} catch (err) {
  console.error('\n❌ Erreur:', err.message);
  process.exit(1);
}
