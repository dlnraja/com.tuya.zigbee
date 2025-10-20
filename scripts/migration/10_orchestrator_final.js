#!/usr/bin/env node

/**
 * ORCHESTRATEUR FINAL - CORRECTION COMPLÈTE
 * Exécute toutes les phases de correction et validation
 */

const { execSync } = require('child_process');
const path = require('path');

const phases = [
  { num: '06', name: 'Fix Validation Errors', file: '06_fix_validation_errors.js' },
  { num: '07', name: 'Identify Brands', file: '07_identify_brands.js' },
  { num: '08', name: 'Rename to Brands', file: '08_rename_to_brands.js' },
  { num: '09', name: 'Final Validation & Fix', file: '09_final_validation_fix.js' }
];

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║       🎭 ORCHESTRATEUR FINAL - CORRECTION COMPLÈTE            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

🚀 PHASES À EXÉCUTER:
`);

phases.forEach((phase, i) => {
  console.log(`   ${i + 1}. ${phase.name}`);
});

console.log('\n⚠️  Cette correction va:');
console.log('   - Corriger les 16 erreurs d\'ID mismatch');
console.log('   - Identifier toutes les marques');
console.log('   - Renommer vers les bonnes marques');
console.log('   - Valider avec homey app validate --level publish\n');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Continuer? (oui/non): ', (answer) => {
  rl.close();
  
  if (answer.toLowerCase() !== 'oui') {
    console.log('\n❌ Correction annulée\n');
    process.exit(0);
  }
  
  console.log('\n🚀 Démarrage correction...\n');
  
  for (const phase of phases) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`PHASE ${phase.num}: ${phase.name.toUpperCase()}`);
    console.log('='.repeat(70));
    
    try {
      const scriptPath = path.join(__dirname, phase.file);
      execSync(`node "${scriptPath}"`, {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..', '..')
      });
      
      console.log(`\n✅ Phase ${phase.num} terminée\n`);
      
    } catch (err) {
      console.error(`\n❌ ERREUR Phase ${phase.num}:`, err.message);
      console.log(`\n⚠️  Correction arrêtée à la phase ${phase.num}`);
      console.log(`Vous pouvez reprendre avec: node scripts/migration/${phase.file}\n`);
      process.exit(1);
    }
  }
  
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║           ✅ CORRECTION TERMINÉE AVEC SUCCÈS                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

📊 RÉSUMÉ:
   ✅ Erreurs de validation corrigées
   ✅ Marques identifiées
   ✅ Drivers renommés correctement
   ✅ Validation réussie

🎯 PROCHAINES ÉTAPES:
   1. Revue: git status
   2. Commit: git add -A && git commit
   3. Push: git push origin master

🎉 SUCCESS!
`);
});
