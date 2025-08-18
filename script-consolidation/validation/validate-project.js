#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('Validation du projet Tuya Zigbee...');

// Test de la structure
const requiredDirs = ['drivers', 'capabilities', 'tools', '.github'];
let testsPassed = 0;
let testsFailed = 0;

for (const dir of requiredDirs) {
  if (fs.existsSync(dir)) {
    console.log(`✅ ${dir} existe`);
    testsPassed++;
  } else {
    console.log(`❌ ${dir} manquant`);
    testsFailed++;
  }
}

// Test des modules core
const coreModules = ['orchestrator.js', 'validator.js', 'deployer.js'];
for (const module of coreModules) {
  const modulePath = path.join('tools', 'core', module);
  if (fs.existsSync(modulePath)) {
    console.log(`✅ ${module} existe`);
    testsPassed++;
  } else {
    console.log(`❌ ${module} manquant`);
    testsFailed++;
  }
}

// Test des drivers
if (fs.existsSync('drivers')) {
  const driverFiles = fs.readdirSync('drivers', { recursive: true }).filter(file => file.endsWith('.json'));
  console.log(`✅ ${driverFiles.length} fichiers drivers trouves`);
  testsPassed++;
} else {
  console.log('❌ Dossier drivers manquant');
  testsFailed++;
}

// Test des capabilities
if (fs.existsSync('capabilities')) {
  const capabilityFiles = fs.readdirSync('capabilities', { recursive: true }).filter(file => file.endsWith('.json'));
  console.log(`✅ ${capabilityFiles.length} fichiers capabilities trouves`);
  testsPassed++;
} else {
  console.log('❌ Dossier capabilities manquant');
  testsFailed++;
}

// Test des GitHub Actions
if (fs.existsSync('.github/workflows')) {
  const workflowFiles = fs.readdirSync('.github/workflows').filter(file => file.endsWith('.yml'));
  console.log(`✅ ${workflowFiles.length} workflows trouves`);
  testsPassed++;
} else {
  console.log('❌ Dossier workflows manquant');
  testsFailed++;
}

// Test du README
const readmeFiles = ['README.md', 'README.fr.md'];
for (const readme of readmeFiles) {
  if (fs.existsSync(readme)) {
    console.log(`✅ ${readme} existe`);
    testsPassed++;
  } else {
    console.log(`❌ ${readme} manquant`);
    testsFailed++;
  }
}

// Résumé
console.log('\n📊 RAPPORT DE VALIDATION');
console.log('========================');
console.log(`✅ Tests réussis: ${testsPassed}`);
console.log(`❌ Tests échoués: ${testsFailed}`);
console.log(`📊 Taux de succès: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(2)}%`);

if (testsFailed === 0) {
  console.log('\n🎉 Projet validé avec succès !');
} else {
  console.log('\n⚠️ Des problèmes ont été détectés. Correction nécessaire.');
}
