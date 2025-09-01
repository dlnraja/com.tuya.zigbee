#!/usr/bin/env node
// Test script pour vérifier l'environnement et les imports
console.log('=== Test d\'environnement ===');
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);
console.log('CWD:', process.cwd());

console.log('\n=== Test des imports de base ===');
try {
  const fs = require('fs');
  const path = require('path');
  console.log('✅ Modules de base (fs, path) chargés');

  // Test de lecture du répertoire
  const files = fs.readdirSync('.');
  console.log(`✅ Répertoire lu (${files.length} fichiers)`);

  // Test des dépendances principales
  console.log('\n=== Test des dépendances principales ===');
  try {
    const axios = require('axios');
    console.log('✅ axios chargé');
  } catch (e) {
    console.log('❌ axios non trouvé');
  }

  try {
    const chalk = require('chalk');
    console.log('✅ chalk chargé');
  } catch (e) {
    console.log('❌ chalk non trouvé');
  }

  try {
    const fsExtra = require('fs-extra');
    console.log('✅ fs-extra chargé');
  } catch (e) {
    console.log('❌ fs-extra non trouvé');
  }

} catch (error) {
  console.error('❌ Erreur:', error.message);
}

console.log('\n=== Test terminé ===');
