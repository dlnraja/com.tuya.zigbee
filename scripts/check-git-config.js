#!/usr/bin/env node

console.log('🔍 VÉRIFICATION DE LA CONFIGURATION GIT...');

const { execSync } = require('child_process');

async function checkGitConfig() {
  try {
    console.log('🔍 DÉMARRAGE DE LA VÉRIFICATION GIT...');
    
    // 1. Vérifier la configuration Git
    console.log('📋 Configuration Git:');
    try {
      execSync('git config --list', { stdio: 'inherit' });
    } catch (error) {
      console.log('ℹ️ Configuration non disponible');
    }
    
    // 2. Vérifier le remote origin
    console.log('\n🌐 Remote origin:');
    try {
      execSync('git remote -v', { stdio: 'inherit' });
    } catch (error) {
      console.log('ℹ️ Remote non disponible');
    }
    
    // 3. Vérifier les branches
    console.log('\n🌿 Branches disponibles:');
    try {
      execSync('git branch -a', { stdio: 'inherit' });
    } catch (error) {
      console.log('ℹ️ Branches non disponibles');
    }
    
    // 4. Vérifier le statut
    console.log('\n📊 Statut Git:');
    try {
      execSync('git status', { stdio: 'inherit' });
    } catch (error) {
      console.log('ℹ️ Statut non disponible');
    }
    
    console.log('\n✅ VÉRIFICATION GIT TERMINÉE !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

checkGitConfig();
