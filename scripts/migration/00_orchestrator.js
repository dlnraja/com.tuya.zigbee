#!/usr/bin/env node

/**
 * 🎭 ORCHESTRATEUR MIGRATION v4.0.0
 * Exécute toutes les phases dans l'ordre
 */

const { execSync } = require('child_process');
const path = require('path');

const phases = [
  { num: '01', name: 'Analyse & Mapping', file: '01_analyze_and_map.js' },
  { num: '02', name: 'Duplication Multi-Battery', file: '02_duplicate_drivers.js' },
  { num: '03', name: 'Renommage Drivers', file: '03_rename_drivers.js' },
  { num: '04', name: 'Update Références', file: '04_update_references.js' },
  { num: '05', name: 'Validation Finale', file: '05_validate.js' }
];

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║       🎭 ORCHESTRATEUR MIGRATION v4.0.0                       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

🚀 PHASES À EXÉCUTER:
`);

phases.forEach((phase, i) => {
  console.log(`   ${i + 1}. ${phase.name}`);
});

console.log('\n⚠️  Cette migration va:');
console.log('   - Dupliquer 64 drivers multi-battery → 128 nouveaux');
console.log('   - Renommer 190 drivers existants');
console.log('   - Total final: ~318 drivers');
console.log('   - Prefixer par marque: tuya_, aqara_, ikea_, etc.');
console.log('   - Suffixer par batterie: _cr2032, _aaa, _aa, etc.\n');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Continuer? (oui/non): ', (answer) => {
  rl.close();
  
  if (answer.toLowerCase() !== 'oui') {
    console.log('\n❌ Migration annulée\n');
    process.exit(0);
  }
  
  console.log('\n🚀 Démarrage migration...\n');
  
  let currentPhase = 1;
  
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
      currentPhase++;
      
    } catch (err) {
      console.error(`\n❌ ERREUR Phase ${phase.num}:`, err.message);
      console.log(`\n⚠️  Migration arrêtée à la phase ${phase.num}`);
      console.log(`Vous pouvez reprendre avec: node scripts/migration/${phase.file}\n`);
      process.exit(1);
    }
  }
  
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║           ✅ MIGRATION v4.0.0 TERMINÉE AVEC SUCCÈS            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

📊 RÉSUMÉ:
   ✅ Toutes les phases exécutées
   ✅ Drivers dupliqués et renommés
   ✅ Références mises à jour
   ✅ Validation réussie

🎯 PROCHAINES ÉTAPES:
   1. Revue des changements: git status
   2. Test local: homey app run
   3. Commit: git add -A && git commit -m "feat: v4.0.0 breaking change"
   4. Push: git push origin master

⚠️  N'OUBLIEZ PAS:
   - Mettre à jour CHANGELOG.md avec breaking changes
   - Créer migration guide pour utilisateurs
   - Annoncer sur forum Homey
`);
});
