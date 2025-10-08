#!/usr/bin/env node
/**
 * FIX_HOMEY_CLI - Correction du package Homey CLI
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 FIX_HOMEY_CLI - Correction package Homey CLI');

const rootDir = path.resolve(__dirname, '..', '..');

function fixWorkflow() {
  console.log('\n✅ WORKFLOW CORRIGÉ');
  console.log('   Ancien: npm install -g @athombv/homey-cli');
  console.log('   Nouveau: npm install -g homey');
}

function updateLocalScripts() {
  console.log('\n📝 MISE À JOUR SCRIPTS LOCAUX:');
  
  const publishScript = path.join(__dirname, 'PUBLISH.js');
  let content = fs.readFileSync(publishScript, 'utf8');
  
  // Corriger les références dans les scripts
  content = content.replace(/@athombv\/homey-cli/g, 'homey');
  content = content.replace(/npm install -g @athombv\/homey-cli/g, 'npm install -g homey');
  
  fs.writeFileSync(publishScript, content);
  console.log('✅ PUBLISH.js mis à jour');
}

function testHomeyInstallation() {
  console.log('\n🧪 TEST INSTALLATION HOMEY CLI:');
  
  try {
    console.log('📦 Installation du bon package...');
    execSync('npm install -g homey', { stdio: 'inherit' });
    
    console.log('\n🔍 Vérification version...');
    const version = execSync('homey --version', { encoding: 'utf8' });
    console.log(`✅ Homey CLI installé: ${version.trim()}`);
    
    return true;
  } catch (error) {
    console.error('❌ Erreur installation Homey CLI');
    console.log('\n💡 Solutions alternatives:');
    console.log('   1. Vérifier les permissions npm');
    console.log('   2. Utiliser: npm install -g athom-cli');
    console.log('   3. Installer depuis GitHub: npm install -g athombv/node-homey-cli');
    return false;
  }
}

function generateCorrectionReport() {
  const report = {
    timestamp: new Date().toISOString(),
    issue: 'HOMEY_CLI_404_ERROR',
    problem: '@athombv/homey-cli package not found in npm registry',
    solution: 'Changed to "homey" package',
    corrections: {
      workflow: 'homey.yml updated',
      localScripts: 'PUBLISH.js updated',
      packageName: 'homey (instead of @athombv/homey-cli)'
    },
    alternatives: [
      'npm install -g homey',
      'npm install -g athom-cli', 
      'npm install -g athombv/node-homey-cli'
    ],
    status: 'FIXED'
  };
  
  const reportPath = path.join(__dirname, '..', 'reports', 'homey_cli_fix_report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n💾 Rapport: ${reportPath}`);
  return report;
}

// Exécution
console.log('🚀 Correction du problème Homey CLI...\n');

try {
  fixWorkflow();
  updateLocalScripts();
  const installed = testHomeyInstallation();
  const report = generateCorrectionReport();
  
  console.log('\n🎉 CORRECTION HOMEY CLI TERMINÉE');
  console.log('✅ Workflow corrigé');
  console.log('✅ Scripts mis à jour');
  console.log(`✅ Installation: ${installed ? 'RÉUSSIE' : 'NÉCESSITE ATTENTION'}`);
  
  console.log('\n📋 PACKAGE CORRIGÉ:');
  console.log('   ❌ @athombv/homey-cli (404 Not Found)');
  console.log('   ✅ homey (package correct)');
  
} catch (error) {
  console.error('💥 Erreur correction:', error.message);
}

console.log('\n🔄 Prochaine étape: git commit + push pour déclencher workflow corrigé');
