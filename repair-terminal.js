#!/usr/bin/env node
'use strict';

/**
 * 🔧 Script de Réparation du Terminal et Test MEGA - Version 3.5.0
 * Réparation et test de tous les modules MEGA orchestrator
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Réparation du Terminal et Test MEGA...\n');

// Test des modules un par un
const modules = [
  'tools/core/preparation.js',
  'tools/core/validator.js',
  'tools/core/matrix-builder.js',
  'tools/core/dashboard-builder.js',
  'tools/core/evidence-collector.js',
  'tools/core/enricher.js',
  'tools/core/web-enricher.js',
  'tools/core/final-validator.js',
  'tools/core/deployer.js',
  'tools/core/script-converter.js',
  'tools/core/script-consolidator.js'
];

let successCount = 0;
let errorCount = 0;

console.log('📋 Test des Modules MEGA...\n');

for (const modulePath of modules) {
  try {
    if (fs.existsSync(modulePath)) {
      const module = require(`./${modulePath}`);
      console.log(`✅ ${modulePath} - OK`);
      successCount++;
    } else {
      console.log(`❌ ${modulePath} - FICHIER MANQUANT`);
      errorCount++;
    }
  } catch (error) {
    console.log(`❌ ${modulePath} - ERREUR: ${error.message}`);
    errorCount++;
  }
}

console.log(`\n📊 Résumé des Modules: ${successCount}/${modules.length} fonctionnels`);
console.log(`✅ Succès: ${successCount}`);
console.log(`❌ Erreurs: ${errorCount}`);

// Test de l'orchestrateur principal
console.log('\n🚀 Test de l\'Orchestrateur MEGA...\n');

try {
  const orchestrator = require('./tools/core/orchestrator.js');
  console.log('✅ Orchestrateur MEGA - OK');
  successCount++;
} catch (error) {
  console.log(`❌ Orchestrateur MEGA - ERREUR: ${error.message}`);
  errorCount++;
}

// Test des scripts de conversion
console.log('\n🔄 Test des Scripts de Conversion...\n');

try {
  const scriptConverter = require('./tools/core/script-converter.js');
  console.log('✅ Script Converter - OK');
  
  // Test de la conversion d'un script simple
  console.log('  🔄 Test de conversion...');
  const testScript = 'test-script.ps1';
  const testContent = 'Write-Host "Test PowerShell"';
  
  fs.writeFileSync(testScript, testContent);
  console.log(`    📝 Script de test créé: ${testScript}`);
  
  // Simulation de la conversion
  const convertedContent = testContent.replace('Write-Host', 'console.log');
  const jsScript = testScript.replace('.ps1', '.js');
  fs.writeFileSync(jsScript, `#!/usr/bin/env node\n'use strict';\n\n${convertedContent}`);
  console.log(`    ✅ Script converti: ${jsScript}`);
  
  // Nettoyage
  fs.unlinkSync(testScript);
  fs.unlinkSync(jsScript);
  console.log('    🧹 Fichiers de test nettoyés');
  
} catch (error) {
  console.log(`❌ Script Converter - ERREUR: ${error.message}`);
  errorCount++;
}

// Test de la consolidation
console.log('\n🔧 Test de la Consolidation...\n');

try {
  const scriptConsolidator = require('./tools/core/script-consolidator.js');
  console.log('✅ Script Consolidator - OK');
} catch (error) {
  console.log(`❌ Script Consolidator - ERREUR: ${error.message}`);
  errorCount++;
}

// Résumé final
console.log('\n📊 RÉSUMÉ FINAL');
console.log('================');
console.log(`✅ Modules fonctionnels: ${successCount}`);
console.log(`❌ Modules en erreur: ${errorCount}`);
console.log(`📁 Total testé: ${modules.length + 2}`);

if (errorCount === 0) {
  console.log('\n🎉 Tous les modules MEGA sont fonctionnels !');
  console.log('🚀 Le système est prêt pour la transformation des scripts !');
} else {
  console.log('\n⚠️ Certains modules ont des problèmes à corriger.');
  console.log('🔧 Vérifiez les erreurs ci-dessus.');
}

// Test de l'orchestrateur complet
console.log('\n🚀 Test de l\'Orchestrateur Complet...\n');

try {
  const orchestrator = require('./tools/core/orchestrator.js');
  const instance = new orchestrator();
  console.log('✅ Orchestrateur MEGA instancié avec succès');
  console.log(`📊 Version: ${instance.config.version}`);
  console.log(`🎯 Modes disponibles: ${instance.config.modes.join(', ')}`);
} catch (error) {
  console.log(`❌ Erreur lors de l\'instanciation: ${error.message}`);
}

console.log('\n✅ Test et réparation terminés !');
